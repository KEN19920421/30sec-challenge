import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_mobile_ads/google_mobile_ads.dart';

import '../../../../core/constants/ad_constants.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../core/utils/extensions.dart';
import '../../../../l10n/l10n.dart';
import '../../data/shop_repository.dart';
import '../providers/shop_provider.dart';

/// Bottom sheet that lets users watch a rewarded ad to earn 10 Sparks.
///
/// Follows the same pattern as [RewardedAdPrompt] in the voting module.
/// After the ad completes, calls `POST /ads/claim-reward` with placement
/// `bonus_coins` to credit the reward.
class EarnSparksAdPrompt extends ConsumerStatefulWidget {
  const EarnSparksAdPrompt({super.key});

  /// Shows the bottom sheet. Returns `true` if the user earned coins.
  static Future<bool> show(BuildContext context) {
    return showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => const EarnSparksAdPrompt(),
    ).then((value) => value ?? false);
  }

  @override
  ConsumerState<EarnSparksAdPrompt> createState() =>
      _EarnSparksAdPromptState();
}

class _EarnSparksAdPromptState extends ConsumerState<EarnSparksAdPrompt> {
  RewardedAd? _rewardedAd;
  bool _isLoading = false;
  bool _adLoaded = false;
  String? _errorMessage;

  int _remainingAds = 0;

  @override
  void initState() {
    super.initState();
    _loadAdStats();
    _loadRewardedAd();
  }

  @override
  void dispose() {
    _rewardedAd?.dispose();
    super.dispose();
  }

  Future<void> _loadAdStats() async {
    try {
      final repo = ref.read(shopRepositoryProvider);
      final stats = await repo.getAdStats();
      if (mounted) {
        setState(() {
          _remainingAds =
              stats['bonus_coin_rewards_remaining'] as int? ?? 0;
        });
      }
    } catch (_) {}
  }

  void _loadRewardedAd() {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    RewardedAd.load(
      adUnitId: AdConstants.rewardedId,
      request: const AdRequest(),
      rewardedAdLoadCallback: RewardedAdLoadCallback(
        onAdLoaded: (ad) {
          if (!mounted) {
            ad.dispose();
            return;
          }
          setState(() {
            _rewardedAd = ad;
            _adLoaded = true;
            _isLoading = false;
          });
        },
        onAdFailedToLoad: (error) {
          if (!mounted) return;
          setState(() {
            _isLoading = false;
            _errorMessage = 'Ad failed to load. Try again later.';
          });
        },
      ),
    );
  }

  Future<void> _showRewardedAd() async {
    if (_rewardedAd == null) return;

    _rewardedAd!.fullScreenContentCallback = FullScreenContentCallback(
      onAdDismissedFullScreenContent: (ad) {
        ad.dispose();
      },
      onAdFailedToShowFullScreenContent: (ad, error) {
        ad.dispose();
        if (mounted) {
          Navigator.of(context).pop(false);
        }
      },
    );

    _rewardedAd!.show(
      onUserEarnedReward: (ad, reward) async {
        // Claim the reward on the backend
        try {
          final repo = ref.read(shopRepositoryProvider);
          await repo.claimAdReward();
          ref.read(coinProvider.notifier).refreshBalance();
          if (mounted) {
            context.showSuccessSnackBar(
              context.l10n.watchAdEarn10Sparks,
            );
            Navigator.of(context).pop(true);
          }
        } catch (_) {
          if (mounted) {
            context.showErrorSnackBar(context.l10n.somethingWentWrong);
            Navigator.of(context).pop(false);
          }
        }
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final limitReached = _remainingAds <= 0;

    return Container(
      decoration: BoxDecoration(
        color: isDark ? AppColors.darkSurface : AppColors.lightSurface,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(24, 16, 24, 24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Drag handle
              Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: isDark
                      ? AppColors.darkOnSurfaceVariant
                      : AppColors.lightDisabled,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              const SizedBox(height: 24),

              // Icon
              Container(
                width: 72,
                height: 72,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: AppColors.accent.withValues(alpha: 0.15),
                ),
                child: const Icon(
                  Icons.play_circle_fill_rounded,
                  color: AppColors.accent,
                  size: 40,
                ),
              ),
              const SizedBox(height: 20),

              // Title
              Text(
                context.l10n.watchAdForSparks,
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
                context.l10n.watchAdForSparksDesc,
                style: AppTextStyles.bodyMedium.copyWith(
                  color: isDark
                      ? AppColors.darkOnSurfaceVariant
                      : AppColors.lightOnSurfaceVariant,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 8),

              // Remaining count badge
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                decoration: BoxDecoration(
                  color: (limitReached ? AppColors.error : AppColors.success)
                      .withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  limitReached
                      ? context.l10n.dailyAdLimitReached
                      : context.l10n.adsRemaining(_remainingAds),
                  style: AppTextStyles.bodySmallBold.copyWith(
                    color: limitReached ? AppColors.error : AppColors.success,
                  ),
                ),
              ),
              const SizedBox(height: 24),

              // Error message
              if (_errorMessage != null) ...[
                Text(
                  _errorMessage!,
                  style: AppTextStyles.bodySmall.copyWith(
                    color: AppColors.error,
                  ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 12),
              ],

              // Watch Ad button
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  onPressed: limitReached
                      ? null
                      : (_adLoaded
                          ? _showRewardedAd
                          : (_isLoading ? null : _loadRewardedAd)),
                  icon: _isLoading
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            valueColor:
                                AlwaysStoppedAnimation(AppColors.white),
                          ),
                        )
                      : const Icon(Icons.play_circle_filled_rounded),
                  label: Text(
                    limitReached
                        ? context.l10n.dailyAdLimitReached
                        : _isLoading
                            ? context.l10n.loading
                            : _adLoaded
                                ? context.l10n.watchAdEarn10Sparks
                                : context.l10n.retry,
                  ),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.accent,
                    foregroundColor: AppColors.white,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(28),
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 12),

              // Dismiss
              SizedBox(
                width: double.infinity,
                child: TextButton(
                  onPressed: () => Navigator.of(context).pop(false),
                  child: Text(
                    context.l10n.noThanks,
                    style: AppTextStyles.buttonMedium.copyWith(
                      color: isDark
                          ? AppColors.darkOnSurfaceVariant
                          : AppColors.lightOnSurfaceVariant,
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
