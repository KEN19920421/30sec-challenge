import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../challenge/domain/submission.dart';

/// Card widget for a single submission in the feed.
class SubmissionCard extends StatelessWidget {
  final Submission submission;
  final VoidCallback? onTap;
  final VoidCallback? onUserTap;
  final VoidCallback? onGiftTap;
  final VoidCallback? onBoostTap;

  const SubmissionCard({
    super.key,
    required this.submission,
    this.onTap,
    this.onUserTap,
    this.onGiftTap,
    this.onBoostTap,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Video thumbnail
            AspectRatio(
              aspectRatio: 16 / 9,
              child: Stack(
                fit: StackFit.expand,
                children: [
                  if (submission.thumbnailUrl != null)
                    CachedNetworkImage(
                      imageUrl: submission.thumbnailUrl!,
                      fit: BoxFit.cover,
                      placeholder: (_, __) => Container(
                        color: isDark
                            ? AppColors.darkSurfaceVariant
                            : AppColors.lightSurfaceVariant,
                      ),
                      errorWidget: (_, __, ___) => Container(
                        color: isDark
                            ? AppColors.darkSurfaceVariant
                            : AppColors.lightSurfaceVariant,
                        child: const Icon(Icons.broken_image_outlined,
                            size: 40),
                      ),
                    )
                  else
                    Container(
                      color: isDark
                          ? AppColors.darkSurfaceVariant
                          : AppColors.lightSurfaceVariant,
                      child: const Center(
                        child: Icon(Icons.videocam_outlined, size: 40),
                      ),
                    ),

                  // Play overlay
                  const Center(
                    child: Icon(
                      Icons.play_circle_fill,
                      color: Colors.white70,
                      size: 56,
                    ),
                  ),

                  // Boost badge
                  if (submission.isBoosted)
                    Positioned(
                      top: 8,
                      right: 8,
                      child: GestureDetector(
                        onTap: onBoostTap,
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 6, vertical: 3),
                          decoration: BoxDecoration(
                            color: AppColors.accent.withValues(alpha: 0.9),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: const Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(Icons.bolt, color: Colors.white, size: 14),
                              SizedBox(width: 2),
                              Text(
                                'Boosted',
                                style: TextStyle(
                                  color: Colors.white,
                                  fontSize: 10,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),

                  // Duration badge
                  if (submission.videoDuration != null)
                    Positioned(
                      bottom: 8,
                      right: 8,
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: Colors.black54,
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Text(
                          _formatDuration(submission.videoDuration!),
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ),
                ],
              ),
            ),

            // Info section
            Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // User row
                  GestureDetector(
                    onTap: onUserTap,
                    child: Row(
                      children: [
                        CircleAvatar(
                          radius: 16,
                          backgroundColor:
                              AppColors.primary.withValues(alpha: 0.1),
                          backgroundImage: submission.avatarUrl != null
                              ? CachedNetworkImageProvider(
                                  submission.avatarUrl!)
                              : null,
                          child: submission.avatarUrl == null
                              ? Text(
                                  submission.displayNameOrUsername
                                      .substring(0, 1)
                                      .toUpperCase(),
                                  style: AppTextStyles.bodySmallBold.copyWith(
                                    color: AppColors.primary,
                                  ),
                                )
                              : null,
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                submission.displayNameOrUsername,
                                style: AppTextStyles.bodyMediumBold,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                              if (submission.username != null)
                                Text(
                                  '@${submission.username}',
                                  style: AppTextStyles.caption.copyWith(
                                    color: isDark
                                        ? AppColors.darkOnSurfaceVariant
                                        : AppColors.lightOnSurfaceVariant,
                                  ),
                                ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),

                  // Caption
                  if (submission.caption != null &&
                      submission.caption!.isNotEmpty) ...[
                    const SizedBox(height: 8),
                    Text(
                      submission.caption!,
                      style: AppTextStyles.bodyMedium,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],

                  const SizedBox(height: 12),

                  // Stats row
                  Row(
                    children: [
                      _StatChip(
                        icon: Icons.favorite_outline,
                        activeIcon: Icons.favorite,
                        count: submission.voteCount,
                        color: AppColors.error,
                      ),
                      const SizedBox(width: 16),
                      _StatChip(
                        icon: Icons.remove_red_eye_outlined,
                        count: submission.totalViews,
                        color: isDark
                            ? AppColors.darkOnSurfaceVariant
                            : AppColors.lightOnSurfaceVariant,
                      ),
                      const SizedBox(width: 16),
                      GestureDetector(
                        onTap: onGiftTap,
                        child: _StatChip(
                          icon: Icons.card_giftcard_outlined,
                          count: submission.giftCoinsReceived,
                          color: AppColors.accent,
                        ),
                      ),
                      const Spacer(),
                      Icon(
                        Icons.more_horiz,
                        size: 20,
                        color: isDark
                            ? AppColors.darkOnSurfaceVariant
                            : AppColors.lightOnSurfaceVariant,
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _formatDuration(double seconds) {
    final duration = Duration(seconds: seconds.round());
    final m = duration.inMinutes.remainder(60).toString().padLeft(2, '0');
    final s = duration.inSeconds.remainder(60).toString().padLeft(2, '0');
    return '$m:$s';
  }
}

class _StatChip extends StatelessWidget {
  final IconData icon;
  final IconData? activeIcon;
  final int count;
  final Color color;

  const _StatChip({
    required this.icon,
    this.activeIcon,
    required this.count,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(
          activeIcon ?? icon,
          size: 18,
          color: color,
        ),
        const SizedBox(width: 4),
        Text(
          _formatCount(count),
          style: AppTextStyles.bodySmall.copyWith(
            color: color,
            fontWeight: FontWeight.w600,
          ),
        ),
      ],
    );
  }

  String _formatCount(int count) {
    if (count >= 1000000) return '${(count / 1000000).toStringAsFixed(1)}M';
    if (count >= 1000) return '${(count / 1000).toStringAsFixed(1)}K';
    return count.toString();
  }
}
