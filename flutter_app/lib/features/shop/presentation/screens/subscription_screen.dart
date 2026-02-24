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

          // Benefits heading
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
              child: Text(context.l10n.proBenefits, style: AppTextStyles.heading3),
            ),
          ),

          // Benefits list — six concrete items
          const SliverToBoxAdapter(
            child: Column(
              children: [
                _BenefitRow(
                  icon: Icons.workspace_premium,
                  iconColor: Color(0xFF9C27B0),
                  title: '月次プレミアムチャレンジ参加権',
                  subtitle: 'Monthly Premium Challenge Access — exclusive competitions',
                ),
                _BenefitRow(
                  icon: Icons.flash_on,
                  iconColor: Color(0xFFFF9800),
                  title: 'スーパー投票無制限',
                  subtitle: 'Unlimited Super Votes — boost your favorite submissions',
                ),
                _BenefitRow(
                  icon: Icons.block,
                  iconColor: Color(0xFF4CAF50),
                  title: '広告なし',
                  subtitle: 'Ad-free experience — enjoy uninterrupted creativity',
                ),
                _BenefitRow(
                  icon: Icons.card_giftcard,
                  iconColor: Color(0xFFE91E63),
                  title: 'ギフト収益率+10%',
                  subtitle: 'Gift revenue share +10% — earn more from every gift',
                ),
                _BenefitRow(
                  icon: Icons.access_time,
                  iconColor: Color(0xFF2196F3),
                  title: '24時間早期アクセス',
                  subtitle: '24hr early access — be first to submit every challenge',
                ),
                _BenefitRow(
                  icon: Icons.military_tech,
                  iconColor: Color(0xFFFFD700),
                  title: 'プレミアムバッジ',
                  subtitle: 'Premium badge — stand out on your profile and feed',
                ),
              ],
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

          // Premium Challenge Preview banner — shown before subscribe button
          if (!state.isPro)
            const SliverToBoxAdapter(
              child: _PremiumChallengeBanner(),
            ),

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
                  final messenger = ScaffoldMessenger.of(context);
                  final message = context.l10n.purchasesRestored;
                  await ref.read(subscriptionProvider.notifier).restore();
                  if (!mounted) return;
                  messenger
                    ..hideCurrentSnackBar()
                    ..showSnackBar(SnackBar(
                      content: Text(message),
                      duration: const Duration(seconds: 3),
                    ));
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
                    context.l10n.subscriptionAutoRenews,
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
                            'https://30sec-challenge.com/terms'),
                        child: Text(
                          context.l10n.terms,
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
                            'https://appdevelopsk.github.io/privacy/'),
                        child: Text(
                          context.l10n.privacy,
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
      context.showErrorSnackBar(context.l10n.selectPlanFirst);
      return;
    }

    final messenger = ScaffoldMessenger.of(context);
    final errorColor = context.colorScheme.error;
    final plan = state.plans[_selectedPlanIndex];
    final success =
        await ref.read(subscriptionProvider.notifier).purchase(plan);
    if (!mounted) return;
    if (!success) {
      final errorMsg = ref.read(subscriptionProvider).errorMessage;
      messenger
        ..hideCurrentSnackBar()
        ..showSnackBar(SnackBar(
          content: Text(errorMsg ?? context.l10n.purchaseFailed),
          backgroundColor: errorColor,
          duration: const Duration(seconds: 4),
        ));
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
// Benefit row widget
// =============================================================================

class _BenefitRow extends StatelessWidget {
  final IconData icon;
  final Color iconColor;
  final String title;
  final String subtitle;

  const _BenefitRow({
    required this.icon,
    required this.iconColor,
    required this.title,
    required this.subtitle,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 8),
      child: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: iconColor.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icon, color: iconColor, size: 20),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    fontWeight: FontWeight.w600,
                    fontSize: 15,
                  ),
                ),
                Text(
                  subtitle,
                  style: TextStyle(color: Colors.grey[600], fontSize: 13),
                ),
              ],
            ),
          ),
          const Icon(Icons.check_circle, color: AppColors.success, size: 20),
        ],
      ),
    );
  }
}

// =============================================================================
// Premium challenge preview banner
// =============================================================================

class _PremiumChallengeBanner extends StatelessWidget {
  const _PremiumChallengeBanner();

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFF7B1FA2), Color(0xFF9C27B0)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF9C27B0).withValues(alpha: 0.3),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Row(
        children: [
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.2),
              borderRadius: BorderRadius.circular(12),
            ),
            child: const Center(
              child: Text('🏆', style: TextStyle(fontSize: 24)),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Monthly Grand Challenge',
                  style: TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                    fontSize: 15,
                  ),
                ),
                const SizedBox(height: 4),
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 8, vertical: 2),
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.2),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: const Text(
                        'Prize: 1000 coins',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 8, vertical: 2),
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.2),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: const Text(
                        'Premium only',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const Icon(Icons.lock_outline, color: Colors.white70, size: 20),
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
