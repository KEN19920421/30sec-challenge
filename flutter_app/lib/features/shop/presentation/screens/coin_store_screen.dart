import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:in_app_purchase/in_app_purchase.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../core/utils/extensions.dart';
import '../../../../l10n/l10n.dart';
import '../../domain/subscription_plan.dart';
import '../providers/shop_provider.dart';
import '../widgets/daily_reward_dialog.dart';
import '../widgets/earn_sparks_ad_prompt.dart';

/// Coin (Sparks) store screen with package grid and ad reward.
class CoinStoreScreen extends ConsumerStatefulWidget {
  const CoinStoreScreen({super.key});

  @override
  ConsumerState<CoinStoreScreen> createState() => _CoinStoreScreenState();
}

class _CoinStoreScreenState extends ConsumerState<CoinStoreScreen> {
  @override
  void initState() {
    super.initState();
    Future.microtask(() {
      ref.read(coinProvider.notifier).load();
      ref.read(dailyRewardProvider.notifier).checkStatus();
    });
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(coinProvider);
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final subscriptionState = ref.watch(subscriptionProvider);
    final isFreeUser = !subscriptionState.isPro;

    return Scaffold(
      appBar: AppBar(
        title: Text(context.l10n.sparksStore),
      ),
      body: state.isLoading && state.packages.isEmpty
          ? const Center(
              child: CircularProgressIndicator(color: AppColors.primary),
            )
          : SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Balance header
                  _buildBalanceHeader(state, isDark),
                  const SizedBox(height: 24),

                  // Packages grid
                  Text(context.l10n.getSparks, style: AppTextStyles.heading3),
                  const SizedBox(height: 12),
                  _buildPackagesGrid(state),

                  // Free Sparks section
                  const SizedBox(height: 24),
                  Text(
                    context.l10n.earnFreeSparks,
                    style: AppTextStyles.heading3,
                  ),
                  const SizedBox(height: 12),
                  _buildDailyBonusCard(isDark),
                  const SizedBox(height: 8),

                  // Watch ad bonus (free users only)
                  if (isFreeUser) ...[
                    _buildAdRewardCard(isDark),
                  ],

                  const SizedBox(height: 32),
                ],
              ),
            ),
    );
  }

  Widget _buildBalanceHeader(CoinState state, bool isDark) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFFFF6B35), Color(0xFFFF8F6B)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: AppColors.primary.withValues(alpha: 0.3),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        children: [
          const Icon(Icons.auto_awesome, color: Colors.white, size: 36),
          const SizedBox(height: 8),
          Text(
            'Your Sparks',
            style: AppTextStyles.bodyMedium.copyWith(
              color: Colors.white.withValues(alpha: 0.9),
            ),
          ),
          const SizedBox(height: 4),
          Text(
            '${state.balance}',
            style: AppTextStyles.displayLarge.copyWith(
              color: Colors.white,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPackagesGrid(CoinState state) {
    final packages = state.packages.isNotEmpty
        ? state.packages
        : _defaultPackages;

    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        mainAxisSpacing: 12,
        crossAxisSpacing: 12,
        childAspectRatio: 0.85,
      ),
      itemCount: packages.length,
      itemBuilder: (context, index) {
        return _CoinPackageCard(
          package: packages[index],
          isLoading: state.status == CoinStatus.purchasing,
          onTap: () => _purchasePackage(packages[index]),
        );
      },
    );
  }

  Widget _buildDailyBonusCard(bool isDark) {
    final dailyState = ref.watch(dailyRewardProvider);
    final isClaimed = dailyState.claimedToday;

    return GestureDetector(
      onTap: isClaimed
          ? null
          : () async {
              await DailyRewardDialog.show(context);
            },
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: isDark ? AppColors.darkSurface : AppColors.lightSurface,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: AppColors.success.withValues(alpha: 0.5),
            width: 1.5,
          ),
        ),
        child: Row(
          children: [
            Container(
              width: 48,
              height: 48,
              decoration: BoxDecoration(
                color: AppColors.success.withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Icon(Icons.calendar_today_rounded,
                  color: AppColors.success, size: 24),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    context.l10n.dailyRewardTitle,
                    style: AppTextStyles.bodyMediumBold,
                  ),
                  Text(
                    isClaimed
                        ? context.l10n.dailyBonusClaimed
                        : context.l10n.dailyBonusAvailable,
                    style: AppTextStyles.caption.copyWith(
                      color: isClaimed ? AppColors.success : AppColors.accent,
                    ),
                  ),
                ],
              ),
            ),
            Icon(
              isClaimed ? Icons.check_circle : Icons.chevron_right,
              color: isClaimed ? AppColors.success : AppColors.lightDisabled,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildAdRewardCard(bool isDark) {
    return GestureDetector(
      onTap: () async {
        final earned = await EarnSparksAdPrompt.show(context);
        if (earned && mounted) {
          ref.read(coinProvider.notifier).refreshBalance();
        }
      },
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: isDark ? AppColors.darkSurface : AppColors.lightSurface,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: AppColors.accent.withValues(alpha: 0.5),
            width: 1.5,
          ),
        ),
        child: Row(
          children: [
            Container(
              width: 48,
              height: 48,
              decoration: BoxDecoration(
                color: AppColors.accent.withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Icon(Icons.play_circle_fill,
                  color: AppColors.accent, size: 28),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    context.l10n.watchAdForSparks,
                    style: AppTextStyles.bodyMediumBold,
                  ),
                  Text(
                    context.l10n.watchAdForSparksDesc,
                    style: AppTextStyles.caption.copyWith(
                      color: AppColors.accent,
                    ),
                  ),
                ],
              ),
            ),
            const Icon(
              Icons.chevron_right,
              color: AppColors.accent,
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _purchasePackage(CoinPackage package) async {
    try {
      final iap = InAppPurchase.instance;
      final available = await iap.isAvailable();
      if (!available) {
        if (mounted) {
          context.showErrorSnackBar('In-app purchases are not available.');
        }
        return;
      }

      // In production, you would use the IAP flow and then pass the receipt
      // to the backend. This is a simplified version.
      final productDetails = await iap.queryProductDetails({package.id});
      if (productDetails.productDetails.isEmpty) {
        if (mounted) {
          context.showErrorSnackBar('Package not found in store.');
        }
        return;
      }

      final purchaseParam = PurchaseParam(
        productDetails: productDetails.productDetails.first,
      );
      await iap.buyConsumable(purchaseParam: purchaseParam);

      // The actual verification happens when listening to purchaseStream.
      // This is a placeholder for the receipt verification.
    } catch (e) {
      if (mounted) {
        context.showErrorSnackBar('Purchase failed. Please try again.');
      }
    }
  }

  /// Default packages used when API is unavailable.
  List<CoinPackage> get _defaultPackages => const [
        CoinPackage(
          id: 'sparks_100',
          name: '100 Sparks',
          coinAmount: 100,
          priceUsd: 0.99,
        ),
        CoinPackage(
          id: 'sparks_550',
          name: '550 Sparks',
          coinAmount: 500,
          bonusAmount: 50,
          priceUsd: 4.99,
        ),
        CoinPackage(
          id: 'sparks_1200',
          name: '1200 Sparks',
          coinAmount: 1000,
          bonusAmount: 200,
          priceUsd: 9.99,
          isBestValue: true,
        ),
        CoinPackage(
          id: 'sparks_2500',
          name: '2500 Sparks',
          coinAmount: 2000,
          bonusAmount: 500,
          priceUsd: 19.99,
        ),
        CoinPackage(
          id: 'sparks_7500',
          name: '7500 Sparks',
          coinAmount: 5000,
          bonusAmount: 2500,
          priceUsd: 49.99,
        ),
      ];
}

// =============================================================================
// Coin Package Card
// =============================================================================

class _CoinPackageCard extends StatelessWidget {
  final CoinPackage package;
  final bool isLoading;
  final VoidCallback? onTap;

  const _CoinPackageCard({
    required this.package,
    this.isLoading = false,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return GestureDetector(
      onTap: isLoading ? null : onTap,
      child: Container(
        decoration: BoxDecoration(
          color: isDark ? AppColors.darkSurface : AppColors.lightSurface,
          borderRadius: BorderRadius.circular(16),
          border: package.isBestValue
              ? Border.all(color: AppColors.primary, width: 2)
              : null,
          boxShadow: [
            BoxShadow(
              color: isDark
                  ? AppColors.darkCardShadow
                  : AppColors.lightCardShadow,
              blurRadius: 8,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Stack(
          children: [
            Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  // Spark icon
                  Icon(
                    Icons.auto_awesome,
                    color: _sparkColor,
                    size: 32,
                  ),
                  const SizedBox(height: 8),

                  // Coin amount
                  Text(
                    '${package.totalCoins}',
                    style: AppTextStyles.heading2.copyWith(
                      color: AppColors.primary,
                    ),
                  ),
                  Text(
                    'Sparks',
                    style: AppTextStyles.caption.copyWith(
                      color: isDark
                          ? AppColors.darkOnSurfaceVariant
                          : AppColors.lightOnSurfaceVariant,
                    ),
                  ),

                  // Bonus indicator
                  if (package.bonusAmount > 0) ...[
                    const SizedBox(height: 4),
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: AppColors.success.withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Text(
                        '+${package.bonusAmount} bonus',
                        style: AppTextStyles.caption.copyWith(
                          color: AppColors.success,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ],

                  const Spacer(),

                  // Price
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.symmetric(vertical: 8),
                    decoration: BoxDecoration(
                      color: AppColors.primary.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      '\$${package.priceUsd.toStringAsFixed(2)}',
                      textAlign: TextAlign.center,
                      style: AppTextStyles.buttonMedium.copyWith(
                        color: AppColors.primary,
                      ),
                    ),
                  ),
                ],
              ),
            ),

            // Best value badge
            if (package.isBestValue)
              Positioned(
                top: 0,
                right: 0,
                child: Container(
                  padding: const EdgeInsets.symmetric(
                      horizontal: 8, vertical: 4),
                  decoration: const BoxDecoration(
                    color: AppColors.primary,
                    borderRadius: BorderRadius.only(
                      topRight: Radius.circular(14),
                      bottomLeft: Radius.circular(8),
                    ),
                  ),
                  child: const Text(
                    'Best Value',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 10,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }

  Color get _sparkColor {
    if (package.totalCoins >= 5000) return const Color(0xFFE040FB);
    if (package.totalCoins >= 1000) return AppColors.accent;
    if (package.totalCoins >= 500) return AppColors.primary;
    return AppColors.primaryLight;
  }
}
