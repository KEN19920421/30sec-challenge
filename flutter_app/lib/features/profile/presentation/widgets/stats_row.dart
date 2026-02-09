import 'package:flutter/material.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';

/// A row of profile statistics: Submissions | Followers | Following.
///
/// Each stat is tappable for navigation (e.g. to the followers list).
class StatsRow extends StatelessWidget {
  final int submissionCount;
  final int followerCount;
  final int followingCount;
  final VoidCallback? onSubmissionsTap;
  final VoidCallback? onFollowersTap;
  final VoidCallback? onFollowingTap;

  const StatsRow({
    super.key,
    required this.submissionCount,
    required this.followerCount,
    required this.followingCount,
    this.onSubmissionsTap,
    this.onFollowersTap,
    this.onFollowingTap,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      padding: const EdgeInsets.symmetric(vertical: 16),
      decoration: BoxDecoration(
        border: Border(
          top: BorderSide(
            color: isDark ? AppColors.darkDivider : AppColors.lightDivider,
          ),
          bottom: BorderSide(
            color: isDark ? AppColors.darkDivider : AppColors.lightDivider,
          ),
        ),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
        children: [
          _StatItem(
            count: submissionCount,
            label: 'Submissions',
            onTap: onSubmissionsTap,
          ),
          _verticalDivider(isDark),
          _StatItem(
            count: followerCount,
            label: 'Followers',
            onTap: onFollowersTap,
          ),
          _verticalDivider(isDark),
          _StatItem(
            count: followingCount,
            label: 'Following',
            onTap: onFollowingTap,
          ),
        ],
      ),
    );
  }

  Widget _verticalDivider(bool isDark) {
    return Container(
      width: 1,
      height: 32,
      color: isDark ? AppColors.darkDivider : AppColors.lightDivider,
    );
  }
}

class _StatItem extends StatelessWidget {
  final int count;
  final String label;
  final VoidCallback? onTap;

  const _StatItem({
    required this.count,
    required this.label,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      behavior: HitTestBehavior.opaque,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            _formatCount(count),
            style: AppTextStyles.heading3,
          ),
          const SizedBox(height: 2),
          Text(
            label,
            style: AppTextStyles.caption.copyWith(
              color: Theme.of(context).brightness == Brightness.dark
                  ? AppColors.darkOnSurfaceVariant
                  : AppColors.lightOnSurfaceVariant,
            ),
          ),
        ],
      ),
    );
  }

  String _formatCount(int count) {
    if (count >= 1000000) {
      return '${(count / 1000000).toStringAsFixed(1)}M';
    } else if (count >= 1000) {
      return '${(count / 1000).toStringAsFixed(1)}K';
    }
    return count.toString();
  }
}
