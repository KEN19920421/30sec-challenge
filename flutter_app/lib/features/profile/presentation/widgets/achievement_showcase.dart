import 'package:flutter/material.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';

/// Represents a single achievement badge.
class Achievement {
  final String id;
  final String name;
  final String iconAsset;
  final String description;
  final bool isEarned;
  final DateTime? earnedAt;

  const Achievement({
    required this.id,
    required this.name,
    required this.iconAsset,
    required this.description,
    this.isEarned = false,
    this.earnedAt,
  });
}

/// Horizontal scrolling showcase of earned achievement badges.
class AchievementShowcase extends StatelessWidget {
  final List<Achievement> achievements;

  const AchievementShowcase({
    super.key,
    required this.achievements,
  });

  @override
  Widget build(BuildContext context) {
    final earned = achievements.where((a) => a.isEarned).toList();

    if (earned.isEmpty) return const SizedBox.shrink();

    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Row(
            children: [
              const Icon(Icons.emoji_events_outlined,
                  color: AppColors.accent, size: 20),
              const SizedBox(width: 8),
              Text(
                'Achievements',
                style: AppTextStyles.heading4,
              ),
              const Spacer(),
              Text(
                '${earned.length}/${achievements.length}',
                style: AppTextStyles.caption.copyWith(
                  color: isDark
                      ? AppColors.darkOnSurfaceVariant
                      : AppColors.lightOnSurfaceVariant,
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        SizedBox(
          height: 100,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 16),
            itemCount: earned.length,
            separatorBuilder: (_, __) => const SizedBox(width: 12),
            itemBuilder: (context, index) {
              return _AchievementBadge(achievement: earned[index]);
            },
          ),
        ),
      ],
    );
  }
}

class _AchievementBadge extends StatelessWidget {
  final Achievement achievement;

  const _AchievementBadge({required this.achievement});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => _showDetails(context),
      child: SizedBox(
        width: 80,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 56,
              height: 56,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: const LinearGradient(
                  colors: [AppColors.accent, AppColors.primary],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                boxShadow: [
                  BoxShadow(
                    color: AppColors.primary.withValues(alpha: 0.3),
                    blurRadius: 8,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
              child: Center(
                child: _buildIcon(),
              ),
            ),
            const SizedBox(height: 6),
            Text(
              achievement.name,
              style: AppTextStyles.caption.copyWith(
                fontWeight: FontWeight.w600,
              ),
              maxLines: 2,
              textAlign: TextAlign.center,
              overflow: TextOverflow.ellipsis,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildIcon() {
    // Map common achievement types to icons.
    final iconMap = <String, IconData>{
      'first_submission': Icons.rocket_launch,
      'ten_submissions': Icons.star,
      'hundred_votes': Icons.favorite,
      'first_win': Icons.emoji_events,
      'streak_7': Icons.local_fire_department,
      'top_10': Icons.leaderboard,
      'gifter': Icons.card_giftcard,
      'popular': Icons.trending_up,
    };

    final icon = iconMap[achievement.id] ?? Icons.military_tech;
    return Icon(icon, color: Colors.white, size: 28);
  }

  void _showDetails(BuildContext context) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(achievement.name),
        content: Text(achievement.description),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text('OK'),
          ),
        ],
      ),
    );
  }
}
