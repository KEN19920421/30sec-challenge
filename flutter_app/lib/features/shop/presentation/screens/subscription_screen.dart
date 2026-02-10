import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../core/utils/extensions.dart';
import '../../../../l10n/l10n.dart';
import '../providers/shop_provider.dart';

/// "Go Pro" subscription screen showing benefits and plan options.
class SubscriptionScreen extends ConsumerStatefulWidget {
  const SubscriptionScreen({super.key});

  @override
  ConsumerState<SubscriptionScreen> createState() =>
      _SubscriptionScreenState();
}

class _SubscriptionScreenState extends ConsumerState<SubscriptionScreen> {
  int _selectedPlanIndex = 1; // Default to annual (best value)

  @override
  void initState() {
    super.initState();
    Future.microtask(() => ref.read(subscriptionProvider.notifier).load());
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(subscriptionProvider);
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      body: CustomScrollView(
        slivers: [
          // Header
          SliverAppBar(
            expandedHeight: 220,
            pinned: true,
            flexibleSpace: FlexibleSpaceBar(
              background: Container(
                decoration: const BoxDecoration(
                  gradient: LinearGradient(
                    colors: [Color(0xFFFF6B35), Color(0xFFFF8F6B)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                ),
                child: SafeArea(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const SizedBox(height: 32),
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 16, vertical: 8),
                        decoration: BoxDecoration(
                          color: Colors.white.withValues(alpha: 0.2),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(Icons.workspace_premium,
                                color: Colors.white, size: 28),
                            const SizedBox(width: 8),
                            Text(
                              context.l10n.goPro,
                              style: AppTextStyles.heading2.copyWith(
                                color: Colors.white,
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 12),
                      Text(
                        context.l10n.unlockPotential,
                        style: AppTextStyles.bodyLarge.copyWith(
                          color: Colors.white.withValues(alpha: 0.9),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),

          // Currently subscribed banner
          if (state.isPro)
            SliverToBoxAdapter(
              child: Container(
                margin: const EdgeInsets.all(16),
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppColors.success.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(12),
                  border:
                      Border.all(color: AppColors.success.withValues(alpha: 0.3)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.check_circle,
                        color: AppColors.success, size: 24),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            context.l10n.proMember,
                            style: AppTextStyles.bodyMediumBold.copyWith(
                              color: AppColors.success,
                            ),
                          ),
                          if (state.expiresAt != null)
                            Text(
                              context.l10n.renewsOn(_formatDate(state.expiresAt!)),
                              style: AppTextStyles.caption,
                            ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),

          // Benefits list
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
              child: Text(context.l10n.proBenefits, style: AppTextStyles.heading3),
            ),
          ),
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Column(
                children: _buildBenefits(context).map((b) => _BenefitRow(benefit: b)).toList(),
              ),
            ),
          ),

          // Plan cards
          if (!state.isPro) ...[
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 24, 16, 12),
                child: Text(context.l10n.choosePlan, style: AppTextStyles.heading3),
              ),
            ),
            SliverToBoxAdapter(
              child: _buildPlanCards(state),
            ),
          ],

          // Subscribe button
          if (!state.isPro)
            SliverToBoxAdapter(
              child: Padding(
                padding:
                    const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
                child: ElevatedButton(
                  onPressed: state.isLoading ? null : _subscribe,
                  child: state.status == SubscriptionStatus.purchasing
                      ? const SizedBox(
                          width: 24,
                          height: 24,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: Colors.white,
                          ),
                        )
                      : Text(
                          _selectedPlanIndex < state.plans.length
                              ? 'Subscribe for \$${state.plans[_selectedPlanIndex].priceUsd.toStringAsFixed(2)}'
                              : 'Subscribe',
                        ),
                ),
              ),
            ),

          // Restore purchases
          SliverToBoxAdapter(
            child: Center(
              child: TextButton(
                onPressed: () async {
                  await ref.read(subscriptionProvider.notifier).restore();
                  if (mounted) {
                    context.showSnackBar(context.l10n.purchasesRestored);
                  }
                },
                child: Text(context.l10n.restorePurchases),
              ),
            ),
          ),

          // Terms & Privacy
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
              child: Column(
                children: [
                  Text(
                    'Subscription auto-renews unless cancelled 24 hours before the end of the current period. '
                    'Payment will be charged to your Apple ID / Google Play account.',
                    style: AppTextStyles.caption.copyWith(
                      color: isDark
                          ? AppColors.darkOnSurfaceVariant
                          : AppColors.lightOnSurfaceVariant,
                    ),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 8),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      TextButton(
                        onPressed: () => _launchUrl(
                            'https://30secchallenge.app/terms'),
                        child: Text(
                          'Terms',
                          style: AppTextStyles.caption.copyWith(
                            color: AppColors.primary,
                          ),
                        ),
                      ),
                      Text(' | ',
                          style: AppTextStyles.caption.copyWith(
                            color: isDark
                                ? AppColors.darkOnSurfaceVariant
                                : AppColors.lightOnSurfaceVariant,
                          )),
                      TextButton(
                        onPressed: () => _launchUrl(
                            'https://30secchallenge.app/privacy'),
                        child: Text(
                          'Privacy',
                          style: AppTextStyles.caption.copyWith(
                            color: AppColors.primary,
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPlanCards(SubscriptionState state) {
    if (state.plans.isEmpty) {
      // Show static fallback plans.
      return Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16),
        child: Column(
          children: [
            _PlanCard(
              title: context.l10n.monthly,
              price: '\$4.99',
              period: '/month',
              isSelected: _selectedPlanIndex == 0,
              onTap: () => setState(() => _selectedPlanIndex = 0),
            ),
            const SizedBox(height: 12),
            _PlanCard(
              title: context.l10n.annual,
              price: '\$39.99',
              period: '/year',
              badge: 'Save 33%!',
              isSelected: _selectedPlanIndex == 1,
              onTap: () => setState(() => _selectedPlanIndex = 1),
            ),
          ],
        ),
      );
    }

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Column(
        children: state.plans.asMap().entries.map((entry) {
          final index = entry.key;
          final plan = entry.value;
          final isBestValue = plan.isAnnual;

          return Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: _PlanCard(
              title: plan.name,
              price: '\$${plan.priceUsd.toStringAsFixed(2)}',
              period: plan.isMonthly ? '/month' : '/year',
              badge: isBestValue ? 'Save 33%!' : null,
              isSelected: _selectedPlanIndex == index,
              onTap: () => setState(() => _selectedPlanIndex = index),
            ),
          );
        }).toList(),
      ),
    );
  }

  Future<void> _subscribe() async {
    final state = ref.read(subscriptionProvider);
    if (_selectedPlanIndex >= state.plans.length) {
      context.showErrorSnackBar('Please select a plan.');
      return;
    }

    final plan = state.plans[_selectedPlanIndex];
    final success =
        await ref.read(subscriptionProvider.notifier).purchase(plan);
    if (mounted && !success) {
      final errorMsg = ref.read(subscriptionProvider).errorMessage;
      context.showErrorSnackBar(errorMsg ?? 'Purchase failed.');
    }
  }

  String _formatDate(DateTime date) {
    return '${date.month}/${date.day}/${date.year}';
  }

  Future<void> _launchUrl(String url) async {
    final uri = Uri.parse(url);
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }
}

// =============================================================================
// Benefits
// =============================================================================

class _Benefit {
  final IconData icon;
  final String title;
  final String description;

  const _Benefit({
    required this.icon,
    required this.title,
    required this.description,
  });
}

List<_Benefit> _buildBenefits(BuildContext context) => [
  _Benefit(
    icon: Icons.block,
    title: context.l10n.noAds,
    description: 'Enjoy an ad-free experience',
  ),
  _Benefit(
    icon: Icons.auto_awesome,
    title: context.l10n.premiumEffects,
    description: 'Exclusive video filters and effects',
  ),
  _Benefit(
    icon: Icons.workspace_premium,
    title: context.l10n.proBadge,
    description: 'Stand out with a Pro badge on your profile',
  ),
  _Benefit(
    icon: Icons.favorite,
    title: context.l10n.freeSuperVotes,
    description: 'Boost your favorite submissions daily',
  ),
  _Benefit(
    icon: Icons.monetization_on,
    title: context.l10n.coinMultiplier,
    description: 'Earn 50% more Sparks on purchases',
  ),
  _Benefit(
    icon: Icons.analytics,
    title: context.l10n.detailedAnalytics,
    description: 'Insights on your submissions and audience',
  ),
  _Benefit(
    icon: Icons.card_giftcard,
    title: context.l10n.premiumGifts,
    description: 'Access exclusive gift items',
  ),
];

class _BenefitRow extends StatelessWidget {
  final _Benefit benefit;

  const _BenefitRow({required this.benefit});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: AppColors.primary.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(benefit.icon, color: AppColors.primary, size: 20),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(benefit.title, style: AppTextStyles.bodyMediumBold),
                Text(
                  benefit.description,
                  style: AppTextStyles.caption.copyWith(
                    color: Theme.of(context).brightness == Brightness.dark
                        ? AppColors.darkOnSurfaceVariant
                        : AppColors.lightOnSurfaceVariant,
                  ),
                ),
              ],
            ),
          ),
          const Icon(Icons.check_circle,
              color: AppColors.success, size: 20),
        ],
      ),
    );
  }
}

// =============================================================================
// Plan Card
// =============================================================================

class _PlanCard extends StatelessWidget {
  final String title;
  final String price;
  final String period;
  final String? badge;
  final bool isSelected;
  final VoidCallback? onTap;

  const _PlanCard({
    required this.title,
    required this.price,
    required this.period,
    this.badge,
    this.isSelected = false,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: isSelected ? AppColors.primary : AppColors.lightBorder,
            width: isSelected ? 2.5 : 1,
          ),
          color: isSelected
              ? AppColors.primary.withValues(alpha: 0.05)
              : (isDark ? AppColors.darkSurface : AppColors.lightSurface),
        ),
        child: Row(
          children: [
            // Radio indicator
            Container(
              width: 24,
              height: 24,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                border: Border.all(
                  color: isSelected
                      ? AppColors.primary
                      : AppColors.lightDisabled,
                  width: 2,
                ),
              ),
              child: isSelected
                  ? Center(
                      child: Container(
                        width: 12,
                        height: 12,
                        decoration: const BoxDecoration(
                          shape: BoxShape.circle,
                          color: AppColors.primary,
                        ),
                      ),
                    )
                  : null,
            ),
            const SizedBox(width: 16),
            // Plan info
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Text(title, style: AppTextStyles.bodyLargeBold),
                      if (badge != null) ...[
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 8, vertical: 2),
                          decoration: BoxDecoration(
                            color: AppColors.success,
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Text(
                            badge!,
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 11,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),
                      ],
                    ],
                  ),
                ],
              ),
            ),
            // Price
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(
                  price,
                  style: AppTextStyles.heading3.copyWith(
                    color: isSelected ? AppColors.primary : null,
                  ),
                ),
                Text(
                  period,
                  style: AppTextStyles.caption.copyWith(
                    color: isDark
                        ? AppColors.darkOnSurfaceVariant
                        : AppColors.lightOnSurfaceVariant,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
