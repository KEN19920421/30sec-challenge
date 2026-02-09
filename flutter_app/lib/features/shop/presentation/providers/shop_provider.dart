import 'dart:io';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:in_app_purchase/in_app_purchase.dart';

import '../../data/shop_repository.dart';
import '../../domain/subscription_plan.dart';

// =============================================================================
// Subscription State
// =============================================================================

enum SubscriptionStatus { initial, loading, loaded, purchasing, error }

class SubscriptionState {
  final SubscriptionStatus status;
  final List<SubscriptionPlan> plans;
  final String currentTier;
  final DateTime? expiresAt;
  final String? errorMessage;

  const SubscriptionState({
    this.status = SubscriptionStatus.initial,
    this.plans = const [],
    this.currentTier = 'free',
    this.expiresAt,
    this.errorMessage,
  });

  bool get isPro => currentTier != 'free';
  bool get isLoading =>
      status == SubscriptionStatus.loading ||
      status == SubscriptionStatus.purchasing;

  SubscriptionState copyWith({
    SubscriptionStatus? status,
    List<SubscriptionPlan>? plans,
    String? currentTier,
    DateTime? expiresAt,
    String? errorMessage,
  }) {
    return SubscriptionState(
      status: status ?? this.status,
      plans: plans ?? this.plans,
      currentTier: currentTier ?? this.currentTier,
      expiresAt: expiresAt ?? this.expiresAt,
      errorMessage: errorMessage ?? this.errorMessage,
    );
  }
}

// =============================================================================
// Subscription Notifier
// =============================================================================

class SubscriptionNotifier extends StateNotifier<SubscriptionState> {
  final ShopRepository _shopRepo;

  SubscriptionNotifier({required ShopRepository shopRepo})
      : _shopRepo = shopRepo,
        super(const SubscriptionState());

  /// Loads subscription plans and current status.
  Future<void> load() async {
    state = state.copyWith(status: SubscriptionStatus.loading);
    try {
      final results = await Future.wait([
        _shopRepo.getSubscriptionPlans(),
        _shopRepo.getSubscriptionStatus(),
      ]);

      final plans = results[0] as List<SubscriptionPlan>;
      final statusData = results[1] as Map<String, dynamic>;

      state = state.copyWith(
        status: SubscriptionStatus.loaded,
        plans: plans,
        currentTier: statusData['tier'] as String? ?? 'free',
        expiresAt: statusData['expiresAt'] != null
            ? DateTime.tryParse(statusData['expiresAt'] as String)
            : null,
      );
    } catch (e) {
      state = state.copyWith(
        status: SubscriptionStatus.error,
        errorMessage: e.toString(),
      );
    }
  }

  /// Initiates a subscription purchase through the platform store.
  Future<bool> purchase(SubscriptionPlan plan) async {
    state = state.copyWith(status: SubscriptionStatus.purchasing);
    try {
      final iap = InAppPurchase.instance;
      final available = await iap.isAvailable();
      if (!available) {
        state = state.copyWith(
          status: SubscriptionStatus.error,
          errorMessage: 'In-app purchases are not available on this device.',
        );
        return false;
      }

      final productId =
          Platform.isIOS ? plan.appleProductId : plan.googleProductId;

      final productDetails =
          await iap.queryProductDetails({productId});
      if (productDetails.productDetails.isEmpty) {
        state = state.copyWith(
          status: SubscriptionStatus.error,
          errorMessage: 'Product not found in store.',
        );
        return false;
      }

      final purchaseParam = PurchaseParam(
        productDetails: productDetails.productDetails.first,
      );

      await iap.buyNonConsumable(purchaseParam: purchaseParam);

      // Verification happens when the purchase stream delivers the result.
      // For now, return to loaded state. The caller should listen to
      // InAppPurchase.instance.purchaseStream for completion.
      state = state.copyWith(status: SubscriptionStatus.loaded);
      return true;
    } catch (e) {
      state = state.copyWith(
        status: SubscriptionStatus.error,
        errorMessage: e.toString(),
      );
      return false;
    }
  }

  /// Verifies a purchase receipt with the backend.
  Future<bool> verifyPurchase(String receiptData, String productId) async {
    try {
      final platform = Platform.isIOS ? 'ios' : 'android';
      final result = await _shopRepo.verifySubscription(
        receiptData: receiptData,
        platform: platform,
        productId: productId,
      );
      state = state.copyWith(
        currentTier: result['tier'] as String? ?? state.currentTier,
        expiresAt: result['expiresAt'] != null
            ? DateTime.tryParse(result['expiresAt'] as String)
            : state.expiresAt,
      );
      return true;
    } catch (_) {
      return false;
    }
  }

  /// Restores previous purchases.
  Future<void> restore() async {
    state = state.copyWith(status: SubscriptionStatus.loading);
    try {
      await InAppPurchase.instance.restorePurchases();
      await load();
    } catch (e) {
      state = state.copyWith(
        status: SubscriptionStatus.error,
        errorMessage: e.toString(),
      );
    }
  }
}

// =============================================================================
// Coin State
// =============================================================================

enum CoinStatus { initial, loading, loaded, purchasing, error }

class CoinState {
  final CoinStatus status;
  final int balance;
  final List<CoinPackage> packages;
  final String? errorMessage;

  const CoinState({
    this.status = CoinStatus.initial,
    this.balance = 0,
    this.packages = const [],
    this.errorMessage,
  });

  bool get isLoading =>
      status == CoinStatus.loading || status == CoinStatus.purchasing;

  CoinState copyWith({
    CoinStatus? status,
    int? balance,
    List<CoinPackage>? packages,
    String? errorMessage,
  }) {
    return CoinState(
      status: status ?? this.status,
      balance: balance ?? this.balance,
      packages: packages ?? this.packages,
      errorMessage: errorMessage ?? this.errorMessage,
    );
  }
}

// =============================================================================
// Coin Notifier
// =============================================================================

class CoinNotifier extends StateNotifier<CoinState> {
  final ShopRepository _shopRepo;

  CoinNotifier({required ShopRepository shopRepo})
      : _shopRepo = shopRepo,
        super(const CoinState());

  /// Loads coin balance and available packages.
  Future<void> load() async {
    state = state.copyWith(status: CoinStatus.loading);
    try {
      final results = await Future.wait([
        _shopRepo.getCoinBalance(),
        _shopRepo.getCoinPackages(),
      ]);
      state = state.copyWith(
        status: CoinStatus.loaded,
        balance: results[0] as int,
        packages: results[1] as List<CoinPackage>,
      );
    } catch (e) {
      state = state.copyWith(
        status: CoinStatus.error,
        errorMessage: e.toString(),
      );
    }
  }

  /// Refreshes just the balance.
  Future<void> refreshBalance() async {
    try {
      final balance = await _shopRepo.getCoinBalance();
      state = state.copyWith(balance: balance);
    } catch (_) {}
  }

  /// Purchases a coin package.
  Future<bool> purchase(CoinPackage package, String receiptData) async {
    state = state.copyWith(status: CoinStatus.purchasing);
    try {
      final platform = Platform.isIOS ? 'ios' : 'android';
      final newBalance = await _shopRepo.purchaseCoins(
        packageId: package.id,
        receiptData: receiptData,
        platform: platform,
      );
      state = state.copyWith(
        status: CoinStatus.loaded,
        balance: newBalance,
      );
      return true;
    } catch (e) {
      state = state.copyWith(
        status: CoinStatus.error,
        errorMessage: e.toString(),
      );
      return false;
    }
  }
}

// =============================================================================
// Gift State
// =============================================================================

enum GiftStatus { initial, loading, loaded, sending, error }

class GiftState {
  final GiftStatus status;
  final List<GiftItem> catalog;
  final String? errorMessage;

  const GiftState({
    this.status = GiftStatus.initial,
    this.catalog = const [],
    this.errorMessage,
  });

  bool get isLoading =>
      status == GiftStatus.loading || status == GiftStatus.sending;

  List<GiftItem> get quickReactions =>
      catalog.where((g) => g.category == 'quick').toList();
  List<GiftItem> get standardGifts =>
      catalog.where((g) => g.category == 'standard').toList();
  List<GiftItem> get premiumGifts =>
      catalog.where((g) => g.category == 'premium').toList();

  GiftState copyWith({
    GiftStatus? status,
    List<GiftItem>? catalog,
    String? errorMessage,
  }) {
    return GiftState(
      status: status ?? this.status,
      catalog: catalog ?? this.catalog,
      errorMessage: errorMessage ?? this.errorMessage,
    );
  }
}

// =============================================================================
// Gift Notifier
// =============================================================================

class GiftNotifier extends StateNotifier<GiftState> {
  final ShopRepository _shopRepo;

  GiftNotifier({required ShopRepository shopRepo})
      : _shopRepo = shopRepo,
        super(const GiftState());

  /// Loads the gift catalog.
  Future<void> loadCatalog() async {
    state = state.copyWith(status: GiftStatus.loading);
    try {
      final catalog = await _shopRepo.getGiftCatalog();
      state = state.copyWith(
        status: GiftStatus.loaded,
        catalog: catalog,
      );
    } catch (e) {
      state = state.copyWith(
        status: GiftStatus.error,
        errorMessage: e.toString(),
      );
    }
  }

  /// Sends a gift to a submission.
  Future<Map<String, dynamic>?> sendGift({
    required String giftId,
    required String submissionId,
    String? message,
  }) async {
    state = state.copyWith(status: GiftStatus.sending);
    try {
      final result = await _shopRepo.sendGift(
        giftId: giftId,
        submissionId: submissionId,
        message: message,
      );
      state = state.copyWith(status: GiftStatus.loaded);
      return result;
    } catch (e) {
      state = state.copyWith(
        status: GiftStatus.error,
        errorMessage: e.toString(),
      );
      return null;
    }
  }
}

// =============================================================================
// Riverpod Providers
// =============================================================================

final subscriptionProvider =
    StateNotifierProvider<SubscriptionNotifier, SubscriptionState>((ref) {
  return SubscriptionNotifier(shopRepo: ref.watch(shopRepositoryProvider));
});

final coinProvider =
    StateNotifierProvider<CoinNotifier, CoinState>((ref) {
  return CoinNotifier(shopRepo: ref.watch(shopRepositoryProvider));
});

final giftProvider =
    StateNotifierProvider<GiftNotifier, GiftState>((ref) {
  return GiftNotifier(shopRepo: ref.watch(shopRepositoryProvider));
});
