import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/constants/app_constants.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../l10n/l10n.dart';
import '../providers/shop_provider.dart';

/// Animated dialog that shows the daily login reward.
///
/// Displays a Sparks icon, "+3 Sparks" text, and a "Claim" button.
/// On claim, calls the backend and refreshes the coin balance.
class DailyRewardDialog extends ConsumerStatefulWidget {
  const DailyRewardDialog({super.key});

  /// Shows the daily reward dialog. Returns `true` if the reward was claimed.
  static Future<bool> show(BuildContext context) async {
    final result = await showDialog<bool>(
      context: context,
      barrierDismissible: false,
      builder: (_) => const DailyRewardDialog(),
    );
    return result ?? false;
  }

  @override
  ConsumerState<DailyRewardDialog> createState() => _DailyRewardDialogState();
}

class _DailyRewardDialogState extends ConsumerState<DailyRewardDialog>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _scaleAnimation;
  late Animation<double> _fadeAnimation;
  bool _isClaiming = false;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 600),
    );
    _scaleAnimation = CurvedAnimation(
      parent: _controller,
      curve: Curves.elasticOut,
    );
    _fadeAnimation = CurvedAnimation(
      parent: _controller,
      curve: Curves.easeIn,
    );
    _controller.forward();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _claim() async {
    setState(() => _isClaiming = true);
    final success =
        await ref.read(dailyRewardProvider.notifier).claimReward();
    if (mounted) {
      if (success) {
        ref.read(coinProvider.notifier).refreshBalance();
      }
      Navigator.of(context).pop(success);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return FadeTransition(
      opacity: _fadeAnimation,
      child: ScaleTransition(
        scale: _scaleAnimation,
        child: Dialog(
          shape:
              RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                // Sparks icon
                Container(
                  width: 80,
                  height: 80,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    gradient: const LinearGradient(
                      colors: [Color(0xFFFF6B35), Color(0xFFFF8F6B)],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: AppColors.primary.withValues(alpha: 0.3),
                        blurRadius: 20,
                        offset: const Offset(0, 8),
                      ),
                    ],
                  ),
                  child: const Icon(
                    Icons.auto_awesome,
                    color: Colors.white,
                    size: 40,
                  ),
                ),
                const SizedBox(height: 20),

                // Title
                Text(
                  context.l10n.dailyRewardTitle,
                  style: AppTextStyles.heading3.copyWith(
                    color: isDark
                        ? AppColors.darkOnSurface
                        : AppColors.lightOnSurface,
                  ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 8),

                // Description
                Text(
                  context.l10n.dailyRewardDesc,
                  style: AppTextStyles.bodyMedium.copyWith(
                    color: isDark
                        ? AppColors.darkOnSurfaceVariant
                        : AppColors.lightOnSurfaceVariant,
                  ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 16),

                // +3 Sparks badge
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
                  decoration: BoxDecoration(
                    color: AppColors.accent.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.auto_awesome,
                          color: AppColors.accent, size: 22),
                      const SizedBox(width: 8),
                      Text(
                        '+${AppConstants.dailyLoginCoins} ${context.l10n.sparks}',
                        style: AppTextStyles.heading3.copyWith(
                          color: AppColors.accent,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 24),

                // Claim button
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: _isClaiming ? null : _claim,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      foregroundColor: AppColors.white,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(28),
                      ),
                    ),
                    child: _isClaiming
                        ? const SizedBox(
                            width: 24,
                            height: 24,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: Colors.white,
                            ),
                          )
                        : Text(context.l10n.claimReward),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
