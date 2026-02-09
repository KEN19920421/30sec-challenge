import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../domain/subscription_plan.dart';

/// Repository handling all shop / monetization API communication.
class ShopRepository {
  final ApiClient _apiClient;

  ShopRepository({required ApiClient apiClient}) : _apiClient = apiClient;

  // ---------------------------------------------------------------------------
  // Subscriptions
  // ---------------------------------------------------------------------------

  /// Fetches available subscription plans.
  Future<List<SubscriptionPlan>> getSubscriptionPlans() async {
    final response = await _apiClient.get<Map<String, dynamic>>(
      '/api/v1/subscriptions/plans',
    );
    final body = response.data;
    if (body == null) return [];
    final list = body['data'] as List<dynamic>? ?? [];
    return list
        .map((item) =>
            SubscriptionPlan.fromJson(item as Map<String, dynamic>))
        .toList();
  }

  /// Verifies a subscription purchase receipt with the backend.
  Future<Map<String, dynamic>> verifySubscription({
    required String receiptData,
    required String platform,
    required String productId,
  }) async {
    final response = await _apiClient.post<Map<String, dynamic>>(
      '/api/v1/subscriptions/verify',
      data: {
        'receiptData': receiptData,
        'platform': platform,
        'productId': productId,
      },
    );
    return response.data?['data'] as Map<String, dynamic>? ?? {};
  }

  /// Gets the current subscription status of the authenticated user.
  Future<Map<String, dynamic>> getSubscriptionStatus() async {
    final response = await _apiClient.get<Map<String, dynamic>>(
      '/api/v1/subscriptions/status',
    );
    return response.data?['data'] as Map<String, dynamic>? ?? {};
  }

  // ---------------------------------------------------------------------------
  // Coins (Sparks)
  // ---------------------------------------------------------------------------

  /// Fetches the current coin balance.
  Future<int> getCoinBalance() async {
    final response = await _apiClient.get<Map<String, dynamic>>(
      '/api/v1/coins/balance',
    );
    return response.data?['data']?['balance'] as int? ?? 0;
  }

  /// Fetches available coin packages.
  Future<List<CoinPackage>> getCoinPackages() async {
    final response = await _apiClient.get<Map<String, dynamic>>(
      '/api/v1/coins/packages',
    );
    final body = response.data;
    if (body == null) return [];
    final list = body['data'] as List<dynamic>? ?? [];
    return list
        .map((item) => CoinPackage.fromJson(item as Map<String, dynamic>))
        .toList();
  }

  /// Purchases a coin package and verifies the receipt.
  Future<int> purchaseCoins({
    required String packageId,
    required String receiptData,
    required String platform,
  }) async {
    final response = await _apiClient.post<Map<String, dynamic>>(
      '/api/v1/coins/purchase',
      data: {
        'packageId': packageId,
        'receiptData': receiptData,
        'platform': platform,
      },
    );
    return response.data?['data']?['newBalance'] as int? ?? 0;
  }

  // ---------------------------------------------------------------------------
  // Gifts
  // ---------------------------------------------------------------------------

  /// Fetches the gift catalog.
  Future<List<GiftItem>> getGiftCatalog() async {
    final response = await _apiClient.get<Map<String, dynamic>>(
      '/api/v1/gifts/catalog',
    );
    final body = response.data;
    if (body == null) return [];
    final list = body['data'] as List<dynamic>? ?? [];
    return list
        .map((item) => GiftItem.fromJson(item as Map<String, dynamic>))
        .toList();
  }

  /// Sends a gift to a submission.
  Future<Map<String, dynamic>> sendGift({
    required String giftId,
    required String submissionId,
    String? message,
  }) async {
    final response = await _apiClient.post<Map<String, dynamic>>(
      '/api/v1/gifts/send',
      data: {
        'giftId': giftId,
        'submissionId': submissionId,
        if (message != null) 'message': message,
      },
    );
    return response.data?['data'] as Map<String, dynamic>? ?? {};
  }
}

// ---------------------------------------------------------------------------
// Riverpod provider
// ---------------------------------------------------------------------------

final shopRepositoryProvider = Provider<ShopRepository>((ref) {
  final apiClient = ref.watch(apiClientProvider);
  return ShopRepository(apiClient: apiClient);
});
