import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../challenge/domain/submission.dart';

/// 3-column grid of submission thumbnails for the profile screen.
class SubmissionGrid extends StatelessWidget {
  final List<Submission> submissions;
  final bool hasMore;
  final bool isLoading;
  final VoidCallback? onLoadMore;
  final void Function(Submission submission)? onSubmissionTap;

  const SubmissionGrid({
    super.key,
    required this.submissions,
    this.hasMore = false,
    this.isLoading = false,
    this.onLoadMore,
    this.onSubmissionTap,
  });

  @override
  Widget build(BuildContext context) {
    if (submissions.isEmpty && !isLoading) {
      return _buildEmptyState(context);
    }

    return NotificationListener<ScrollNotification>(
      onNotification: (notification) {
        if (notification is ScrollEndNotification &&
            notification.metrics.extentAfter < 200 &&
            hasMore &&
            !isLoading) {
          onLoadMore?.call();
        }
        return false;
      },
      child: Column(
        children: [
          GridView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 3,
              mainAxisSpacing: 2,
              crossAxisSpacing: 2,
              childAspectRatio: 9 / 16,
            ),
            itemCount: submissions.length,
            itemBuilder: (context, index) {
              final submission = submissions[index];
              return _SubmissionTile(
                submission: submission,
                onTap: () => onSubmissionTap?.call(submission),
              );
            },
          ),
          if (isLoading)
            const Padding(
              padding: EdgeInsets.all(16),
              child: Center(
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  color: AppColors.primary,
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildEmptyState(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 48, horizontal: 32),
      child: Column(
        children: [
          Icon(
            Icons.videocam_off_outlined,
            size: 64,
            color: isDark
                ? AppColors.darkOnSurfaceVariant
                : AppColors.lightOnSurfaceVariant,
          ),
          const SizedBox(height: 16),
          Text(
            'No submissions yet',
            style: AppTextStyles.heading4.copyWith(
              color: isDark
                  ? AppColors.darkOnSurfaceVariant
                  : AppColors.lightOnSurfaceVariant,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Submissions will appear here once created.',
            style: AppTextStyles.bodyMedium.copyWith(
              color: isDark
                  ? AppColors.darkOnSurfaceVariant
                  : AppColors.lightOnSurfaceVariant,
            ),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }
}

class _SubmissionTile extends StatelessWidget {
  final Submission submission;
  final VoidCallback? onTap;

  const _SubmissionTile({required this.submission, this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
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
                child: const Center(
                  child: Icon(Icons.play_circle_outline,
                      color: AppColors.lightDisabled),
                ),
              ),
              errorWidget: (_, __, ___) => Container(
                color: AppColors.lightSurfaceVariant,
                child: const Center(
                  child: Icon(Icons.broken_image_outlined,
                      color: AppColors.lightDisabled),
                ),
              ),
            )
          else
            Container(
              color: AppColors.lightSurfaceVariant,
              child: const Center(
                child: Icon(Icons.videocam_outlined,
                    color: AppColors.lightDisabled, size: 32),
              ),
            ),

          // Bottom gradient overlay with stats
          Positioned(
            left: 0,
            right: 0,
            bottom: 0,
            child: Container(
              padding: const EdgeInsets.all(6),
              decoration: const BoxDecoration(
                gradient: AppColors.darkOverlayGradient,
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.favorite, color: Colors.white, size: 12),
                  const SizedBox(width: 3),
                  Text(
                    _formatCount(submission.voteCount),
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(width: 8),
                  const Icon(Icons.remove_red_eye_outlined,
                      color: Colors.white, size: 12),
                  const SizedBox(width: 3),
                  Text(
                    _formatCount(submission.totalViews),
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
            ),
          ),

          // Processing indicator
          if (!submission.isReady)
            Positioned(
              top: 6,
              right: 6,
              child: Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: Colors.black54,
                  borderRadius: BorderRadius.circular(4),
                ),
                child: Text(
                  submission.transcodeStatus == 'processing'
                      ? 'Processing'
                      : 'Pending',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 9,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }

  String _formatCount(int count) {
    if (count >= 1000000) return '${(count / 1000000).toStringAsFixed(1)}M';
    if (count >= 1000) return '${(count / 1000).toStringAsFixed(1)}K';
    return count.toString();
  }
}
