import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../l10n/l10n.dart';
import '../../../challenge/domain/submission.dart';

/// Horizontal scrolling section showing trending / top submissions.
class TrendingSection extends StatelessWidget {
  final List<Submission> submissions;
  final void Function(Submission)? onSubmissionTap;

  const TrendingSection({
    super.key,
    required this.submissions,
    this.onSubmissionTap,
  });

  @override
  Widget build(BuildContext context) {
    if (submissions.isEmpty) return const SizedBox.shrink();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Row(
            children: [
              const Icon(Icons.local_fire_department,
                  color: AppColors.primary, size: 22),
              const SizedBox(width: 6),
              Text(context.l10n.trendingNow, style: AppTextStyles.heading4),
            ],
          ),
        ),
        const SizedBox(height: 12),
        SizedBox(
          height: 200,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 16),
            itemCount: submissions.length,
            separatorBuilder: (_, __) => const SizedBox(width: 12),
            itemBuilder: (context, index) {
              return _TrendingCard(
                submission: submissions[index],
                rank: index + 1,
                onTap: () => onSubmissionTap?.call(submissions[index]),
              );
            },
          ),
        ),
      ],
    );
  }
}

class _TrendingCard extends StatelessWidget {
  final Submission submission;
  final int rank;
  final VoidCallback? onTap;

  const _TrendingCard({
    required this.submission,
    required this.rank,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 140,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(12),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.1),
              blurRadius: 8,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(12),
          child: Stack(
            fit: StackFit.expand,
            children: [
              // Thumbnail
              if (submission.thumbnailUrl != null)
                CachedNetworkImage(
                  imageUrl: submission.thumbnailUrl!,
                  fit: BoxFit.cover,
                  placeholder: (_, __) => Container(
                    color: AppColors.lightSurfaceVariant,
                  ),
                  errorWidget: (_, __, ___) => Container(
                    color: AppColors.lightSurfaceVariant,
                    child: const Icon(Icons.broken_image_outlined),
                  ),
                )
              else
                Container(color: AppColors.lightSurfaceVariant),

              // Gradient overlay
              const DecoratedBox(
                decoration: BoxDecoration(
                  gradient: AppColors.darkOverlayGradient,
                ),
              ),

              // Rank badge
              Positioned(
                top: 8,
                left: 8,
                child: Container(
                  width: 28,
                  height: 28,
                  decoration: BoxDecoration(
                    color: _rankColor(rank),
                    shape: BoxShape.circle,
                    boxShadow: [
                      BoxShadow(
                        color: _rankColor(rank).withValues(alpha: 0.4),
                        blurRadius: 4,
                      ),
                    ],
                  ),
                  child: Center(
                    child: Text(
                      '#$rank',
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 10,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ),
                ),
              ),

              // Play icon
              const Center(
                child: Icon(
                  Icons.play_circle_fill,
                  color: Colors.white70,
                  size: 40,
                ),
              ),

              // Bottom info
              Positioned(
                left: 8,
                right: 8,
                bottom: 8,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // User info
                    Row(
                      children: [
                        CircleAvatar(
                          radius: 10,
                          backgroundColor:
                              AppColors.primary.withValues(alpha: 0.3),
                          backgroundImage: submission.avatarUrl != null
                              ? CachedNetworkImageProvider(
                                  submission.avatarUrl!)
                              : null,
                          child: submission.avatarUrl == null
                              ? Text(
                                  (submission.displayNameOrUsername)
                                      .substring(0, 1)
                                      .toUpperCase(),
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontSize: 8,
                                    fontWeight: FontWeight.w700,
                                  ),
                                )
                              : null,
                        ),
                        const SizedBox(width: 4),
                        Expanded(
                          child: Text(
                            submission.displayNameOrUsername,
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 11,
                              fontWeight: FontWeight.w600,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    // Vote count
                    Row(
                      children: [
                        const Icon(Icons.favorite,
                            color: Colors.white70, size: 12),
                        const SizedBox(width: 3),
                        Text(
                          '${submission.voteCount}',
                          style: const TextStyle(
                            color: Colors.white70,
                            fontSize: 11,
                          ),
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

  Color _rankColor(int rank) {
    switch (rank) {
      case 1:
        return AppColors.gold;
      case 2:
        return AppColors.silver;
      case 3:
        return AppColors.bronze;
      default:
        return AppColors.primary;
    }
  }
}
