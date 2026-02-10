import 'package:flutter/material.dart';
import 'package:google_mobile_ads/google_mobile_ads.dart';

import '../../../../core/constants/ad_constants.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';

/// Bottom sheet dialog for super vote activation.
///
/// For free users:
/// - Shows a prompt to watch a rewarded ad to unlock a super vote.
/// - "Super Votes count 3x in rankings" description.
/// - "Watch Ad" button that loads and shows a rewarded ad.
/// - "No Thanks" button to dismiss.
///
/// For Pro users:
/// - Immediately triggers the super vote (no ad needed).
///
/// Returns `true` from the bottom sheet if the user earned the super vote
/// (either watched the ad or is a Pro user), `false` otherwise.
class RewardedAdPrompt extends StatefulWidget {
  final bool isProUser;

  const RewardedAdPrompt({
    super.key,
    this.isProUser = false,
  });

  /// Shows the bottom sheet and returns whether the super vote was earned.
  static Future<bool> show(BuildContext context, {bool isProUser = false}) {
    // Pro users skip the ad entirely.
    if (isProUser) return Future.value(true);

    return showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => RewardedAdPrompt(isProUser: isProUser),
    ).then((value) => value ?? false);
  }

  @override
  State<RewardedAdPrompt> createState() => _RewardedAdPromptState();
}

class _RewardedAdPromptState extends State<RewardedAdPrompt> {
  RewardedAd? _rewardedAd;
  bool _isLoading = false;
  bool _adLoaded = false;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _loadRewardedAd();
  }

  @override
  void dispose() {
    _rewardedAd?.dispose();
    super.dispose();
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

  void _showRewardedAd() {
    if (_rewardedAd == null) return;

    _rewardedAd!.fullScreenContentCallback = FullScreenContentCallback(
      onAdDismissedFullScreenContent: (ad) {
        ad.dispose();
        // Note: reward is granted via onUserEarnedReward, not here.
      },
      onAdFailedToShowFullScreenContent: (ad, error) {
        ad.dispose();
        if (mounted) {
          Navigator.of(context).pop(false);
        }
      },
    );

    _rewardedAd!.show(
      onUserEarnedReward: (ad, reward) {
        // User watched the full ad -- grant the super vote.
        if (mounted) {
          Navigator.of(context).pop(true);
        }
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

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
              // Drag handle.
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

              // Star icon with gradient background.
              Container(
                width: 72,
                height: 72,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: AppColors.primaryGradient,
                  boxShadow: [
                    BoxShadow(
                      color: AppColors.primary.withValues(alpha: 0.3),
                      blurRadius: 20,
                      offset: const Offset(0, 8),
                    ),
                  ],
                ),
                child: const Icon(
                  Icons.star_rounded,
                  color: AppColors.white,
                  size: 40,
                ),
              ),
              const SizedBox(height: 20),

              // Title.
              Text(
                'Unlock a Super Vote!',
                style: AppTextStyles.heading3.copyWith(
                  color: isDark
                      ? AppColors.darkOnSurface
                      : AppColors.lightOnSurface,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 8),

              // Description.
              Text(
                'Watch a short video to earn a Super Vote.\nSuper Votes count 3x in rankings!',
                style: AppTextStyles.bodyMedium.copyWith(
                  color: isDark
                      ? AppColors.darkOnSurfaceVariant
                      : AppColors.lightOnSurfaceVariant,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 8),

              // 3x badge.
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                decoration: BoxDecoration(
                  color: AppColors.accent.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(
                      Icons.bolt_rounded,
                      color: AppColors.accent,
                      size: 18,
                    ),
                    const SizedBox(width: 4),
                    Text(
                      '3x Power',
                      style: AppTextStyles.bodyMediumBold.copyWith(
                        color: AppColors.accentDark,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 28),

              // Error message.
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

              // Watch Ad button.
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  onPressed:
                      _adLoaded ? _showRewardedAd : (_isLoading ? null : _loadRewardedAd),
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
                    _isLoading
                        ? 'Loading Ad...'
                        : _adLoaded
                            ? 'Watch Ad & Earn Super Vote'
                            : 'Retry Loading Ad',
                  ),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    foregroundColor: AppColors.white,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(28),
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 12),

              // No Thanks button.
              SizedBox(
                width: double.infinity,
                child: TextButton(
                  onPressed: () => Navigator.of(context).pop(false),
                  child: Text(
                    'No Thanks',
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
