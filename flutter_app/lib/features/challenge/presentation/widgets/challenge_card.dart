import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../domain/challenge.dart';
import 'challenge_countdown.dart';

/// Reusable challenge card showing title, category badge, difficulty,
/// time information, and submission count.
///
/// Tappable with a gradient overlay on the thumbnail image.
class ChallengeCard extends StatelessWidget {
  final Challenge challenge;
  final VoidCallback? onTap;

  /// If true, displays a wider / taller hero layout.
  final bool isHero;

  const ChallengeCard({
    super.key,
    required this.challenge,
    this.onTap,
    this.isHero = false,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return GestureDetector(
      onTap: onTap,
      child: Container(
        height: isHero ? 220 : 160,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(16),
          boxShadow: [
            BoxShadow(
              color: AppColors.black.withValues(alpha: 0.1),
              blurRadius: 12,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(16),
          child: Stack(
            fit: StackFit.expand,
            children: [
              // Background image or gradient.
              _buildBackground(theme),

              // Gradient overlay for readability.
              Container(
                decoration: const BoxDecoration(
                  gradient: AppColors.darkOverlayGradient,
                ),
              ),

              // Content overlay.
              Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Top row: category + difficulty + countdown.
                    Row(
                      children: [
                        _CategoryBadge(category: challenge.category),
                        const SizedBox(width: 8),
                        _DifficultyIndicator(difficulty: challenge.difficulty),
                        const Spacer(),
                        if (challenge.isActive)
                          ChallengeCountdown(
                            targetTime: challenge.endsAt,
                            compact: true,
                          )
                        else if (challenge.isScheduled)
                          ChallengeCountdown(
                            targetTime: challenge.startsAt,
                            label: 'Starts in',
                            compact: true,
                          ),
                      ],
                    ),

                    const Spacer(),

                    // Title.
                    Text(
                      challenge.title,
                      style: (isHero
                              ? AppTextStyles.heading2
                              : AppTextStyles.heading4)
                          .copyWith(color: AppColors.white),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),

                    const SizedBox(height: 8),

                    // Bottom row: submission count + status.
                    Row(
                      children: [
                        if (challenge.submissionCount > 0) ...[
                          Icon(
                            Icons.videocam_outlined,
                            size: 16,
                            color: AppColors.white.withValues(alpha: 0.8),
                          ),
                          const SizedBox(width: 4),
                          Text(
                            '${challenge.submissionCount} entries',
                            style: AppTextStyles.caption.copyWith(
                              color: AppColors.white.withValues(alpha: 0.8),
                            ),
                          ),
                          const SizedBox(width: 12),
                        ],
                        if (challenge.isSponsored) ...[
                          Icon(
                            Icons.star,
                            size: 14,
                            color: AppColors.accent,
                          ),
                          const SizedBox(width: 4),
                          Text(
                            'Sponsored',
                            style: AppTextStyles.caption.copyWith(
                              color: AppColors.accent,
                            ),
                          ),
                        ],
                        const Spacer(),
                        if (challenge.isCompleted)
                          _StatusChip(
                            label: 'Completed',
                            color: AppColors.lightOnSurfaceVariant,
                          )
                        else if (challenge.isVoting)
                          _StatusChip(
                            label: 'Voting',
                            color: AppColors.info,
                          )
                        else if (challenge.isActive)
                          _StatusChip(
                            label: 'Live',
                            color: AppColors.success,
                          ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildBackground(ThemeData theme) {
    if (challenge.thumbnailUrl != null && challenge.thumbnailUrl!.isNotEmpty) {
      return CachedNetworkImage(
        imageUrl: challenge.thumbnailUrl!,
        fit: BoxFit.cover,
        placeholder: (_, __) => Container(
          decoration: BoxDecoration(
            gradient: AppColors.primaryGradient,
          ),
        ),
        errorWidget: (_, __, ___) => Container(
          decoration: BoxDecoration(
            gradient: AppColors.primaryGradient,
          ),
        ),
      );
    }

    return Container(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            AppColors.primary,
            AppColors.primaryDark,
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
      ),
    );
  }
}

// =============================================================================
// Private helper widgets
// =============================================================================

class _CategoryBadge extends StatelessWidget {
  final String category;

  const _CategoryBadge({required this.category});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: AppColors.white.withValues(alpha: 0.2),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: AppColors.white.withValues(alpha: 0.3),
        ),
      ),
      child: Text(
        category.toUpperCase(),
        style: AppTextStyles.overline.copyWith(
          color: AppColors.white,
          letterSpacing: 1.0,
        ),
      ),
    );
  }
}

class _DifficultyIndicator extends StatelessWidget {
  final String difficulty;

  const _DifficultyIndicator({required this.difficulty});

  Color get _color {
    switch (difficulty.toLowerCase()) {
      case 'easy':
        return AppColors.success;
      case 'medium':
        return AppColors.warning;
      case 'hard':
        return AppColors.error;
      default:
        return AppColors.info;
    }
  }

  int get _filledDots {
    switch (difficulty.toLowerCase()) {
      case 'easy':
        return 1;
      case 'medium':
        return 2;
      case 'hard':
        return 3;
      default:
        return 1;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: List.generate(3, (index) {
        return Container(
          width: 6,
          height: 6,
          margin: const EdgeInsets.only(right: 3),
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: index < _filledDots
                ? _color
                : AppColors.white.withValues(alpha: 0.3),
          ),
        );
      }),
    );
  }
}

class _StatusChip extends StatelessWidget {
  final String label;
  final Color color;

  const _StatusChip({
    required this.label,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.2),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(
        label,
        style: AppTextStyles.overline.copyWith(color: color),
      ),
    );
  }
}
