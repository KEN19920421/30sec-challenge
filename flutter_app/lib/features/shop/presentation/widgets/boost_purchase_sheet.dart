import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../core/utils/extensions.dart';
import '../../../../l10n/l10n.dart';
import '../../data/shop_repository.dart';
import '../../domain/boost_tier.dart';
import '../providers/shop_provider.dart';

/// Bottom sheet for purchasing a boost on a submission.
class BoostPurchaseSheet extends ConsumerStatefulWidget {
  final String submissionId;

  const BoostPurchaseSheet({
    super.key,
    required this.submissionId,
  });

  @override
  ConsumerState<BoostPurchaseSheet> createState() => _BoostPurchaseSheetState();
}

class _BoostPurchaseSheetState extends ConsumerState<BoostPurchaseSheet> {
  int _selectedIndex = 0;
  bool _firstBoostFree = false;

  @override
  void initState() {
    super.initState();
    Future.microtask(_loadTiersWithMeta);
  }

  Future<void> _loadTiersWithMeta() async {
    final repo = ref.read(shopRepositoryProvider);
    try {
      final data = await repo.getBoostTiersWithMeta();
      if (mounted) {
        setState(() {
          _firstBoostFree = data['firstBoostFree'] as bool? ?? false;
        });
      }
    } catch (_) {}
    ref.read(boostProvider.notifier).loadTiers();
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(boostProvider);
    final coinState = ref.watch(coinProvider);
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      padding: EdgeInsets.only(
        bottom: MediaQuery.of(context).viewInsets.bottom,
      ),
      child: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Handle bar
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: isDark
                        ? AppColors.darkOnSurfaceVariant
                        : AppColors.lightBorder,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: 16),

              // Title
              Text(
                context.l10n.boostSubmission,
                style: AppTextStyles.heading3,
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 4),
              Text(
                context.l10n.boostDescription,
                style: AppTextStyles.caption.copyWith(
                  color: isDark
                      ? AppColors.darkOnSurfaceVariant
                      : AppColors.lightOnSurfaceVariant,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 20),

              // Balance row
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.bolt, color: AppColors.accent, size: 20),
                  const SizedBox(width: 4),
                  Text(
                    '${coinState.balance} ${context.l10n.sparks}',
                    style: AppTextStyles.bodyMediumBold.copyWith(
                      color: AppColors.accent,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),

              // Tier cards
              if (state.status == BoostStatus.loading)
                const Center(child: CircularProgressIndicator())
              else if (state.tiers.isEmpty)
                Text(
                  context.l10n.somethingWentWrong,
                  textAlign: TextAlign.center,
                )
              else
                ...state.tiers.asMap().entries.map((entry) {
                  final index = entry.key;
                  final tier = entry.value;
                  final isFreeEligible =
                      _firstBoostFree && tier.tier == 'small';
                  return _BoostTierCard(
                    tier: tier,
                    isSelected: _selectedIndex == index,
                    canAfford: isFreeEligible || coinState.balance >= tier.cost,
                    isFree: isFreeEligible,
                    onTap: () => setState(() => _selectedIndex = index),
                  );
                }),

              const SizedBox(height: 20),

              // Purchase button
              Builder(builder: (context) {
                final selectedTier = state.tiers.isNotEmpty
                    ? state.tiers[_selectedIndex]
                    : null;
                final isFreeEligible = _firstBoostFree &&
                    selectedTier != null &&
                    selectedTier.tier == 'small';
                final canAfford = isFreeEligible ||
                    (selectedTier != null &&
                        coinState.balance >= selectedTier.cost);

                return ElevatedButton(
                  onPressed: state.isLoading ||
                          state.tiers.isEmpty ||
                          !canAfford
                      ? null
                      : _purchase,
                  child: state.status == BoostStatus.purchasing
                      ? const SizedBox(
                          width: 24,
                          height: 24,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: Colors.white,
                          ),
                        )
                      : Text(isFreeEligible
                          ? '${context.l10n.boost} (${context.l10n.freeTrialLabel})'
                          : state.tiers.isNotEmpty
                              ? '${context.l10n.boost} (${state.tiers[_selectedIndex].cost} ${context.l10n.sparks})'
                              : context.l10n.boost),
                );
              }),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _purchase() async {
    final tiers = ref.read(boostProvider).tiers;
    if (_selectedIndex >= tiers.length) return;

    final tier = tiers[_selectedIndex];
    final success = await ref.read(boostProvider.notifier).purchaseBoost(
          submissionId: widget.submissionId,
          tier: tier.tier,
        );

    if (mounted) {
      if (success) {
        // Refresh coin balance
        ref.read(coinProvider.notifier).refreshBalance();
        Navigator.of(context).pop(true);
        context.showSnackBar(context.l10n.boostPurchased);
      } else {
        final errorMsg = ref.read(boostProvider).errorMessage;
        context.showErrorSnackBar(errorMsg ?? context.l10n.somethingWentWrong);
      }
    }
  }
}

class _BoostTierCard extends StatelessWidget {
  final BoostTier tier;
  final bool isSelected;
  final bool canAfford;
  final bool isFree;
  final VoidCallback onTap;

  const _BoostTierCard({
    required this.tier,
    required this.isSelected,
    required this.canAfford,
    this.isFree = false,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: GestureDetector(
        onTap: onTap,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: isSelected ? AppColors.primary : AppColors.lightBorder,
              width: isSelected ? 2 : 1,
            ),
            color: isSelected
                ? AppColors.primary.withValues(alpha: 0.05)
                : (isDark ? AppColors.darkSurface : AppColors.lightSurface),
          ),
          child: Row(
            children: [
              // Tier icon
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: _tierColor.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(Icons.bolt, color: _tierColor, size: 22),
              ),
              const SizedBox(width: 12),
              // Info
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(tier.displayName, style: AppTextStyles.bodyMediumBold),
                    Text(
                      '+${tier.boostValue} for ${tier.durationHours}h',
                      style: AppTextStyles.caption.copyWith(
                        color: isDark
                            ? AppColors.darkOnSurfaceVariant
                            : AppColors.lightOnSurfaceVariant,
                      ),
                    ),
                  ],
                ),
              ),
              // Cost or FREE badge
              if (isFree)
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: AppColors.success,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Text(
                    'FREE',
                    style: TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.w700,
                      fontSize: 12,
                    ),
                  ),
                )
              else ...[
                Text(
                  '${tier.cost}',
                  style: AppTextStyles.bodyLargeBold.copyWith(
                    color: canAfford ? AppColors.accent : AppColors.error,
                  ),
                ),
                const SizedBox(width: 4),
                Icon(
                  Icons.bolt,
                  size: 16,
                  color: canAfford ? AppColors.accent : AppColors.error,
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Color get _tierColor {
    switch (tier.tier) {
      case 'small':
        return AppColors.success;
      case 'medium':
        return AppColors.accent;
      case 'large':
        return AppColors.primary;
      default:
        return AppColors.primary;
    }
  }
}
