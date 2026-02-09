import 'package:flutter/material.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../data/leaderboard_repository.dart';

/// Custom tab bar for leaderboard period selection: Daily | Weekly | All Time | Friends.
///
/// Uses Material 3 styling with an animated indicator and the primary color.
/// The [selectedIndex] determines which tab is currently active.
/// [onTabChanged] fires when a tab is tapped.
class LeaderboardTabBar extends StatelessWidget {
  final int selectedIndex;
  final ValueChanged<int> onTabChanged;

  const LeaderboardTabBar({
    super.key,
    required this.selectedIndex,
    required this.onTabChanged,
  });

  static const List<_TabItem> _tabs = [
    _TabItem(label: 'Daily', icon: Icons.today_rounded),
    _TabItem(label: 'Weekly', icon: Icons.date_range_rounded),
    _TabItem(label: 'All Time', icon: Icons.emoji_events_rounded),
    _TabItem(label: 'Friends', icon: Icons.people_rounded),
  ];

  /// Maps a tab index to the corresponding [LeaderboardPeriod] (or null
  /// for the Friends tab which is handled separately).
  static LeaderboardPeriod? periodForIndex(int index) {
    switch (index) {
      case 0:
        return LeaderboardPeriod.daily;
      case 1:
        return LeaderboardPeriod.weekly;
      case 2:
        return LeaderboardPeriod.allTime;
      default:
        return null; // Friends tab.
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      height: 48,
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      decoration: BoxDecoration(
        color: isDark
            ? AppColors.darkSurfaceVariant
            : AppColors.lightSurfaceVariant,
        borderRadius: BorderRadius.circular(24),
      ),
      child: Row(
        children: List.generate(_tabs.length, (index) {
          final tab = _tabs[index];
          final isSelected = index == selectedIndex;

          return Expanded(
            child: GestureDetector(
              onTap: () => onTabChanged(index),
              behavior: HitTestBehavior.opaque,
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 250),
                curve: Curves.easeInOut,
                margin: const EdgeInsets.all(4),
                decoration: BoxDecoration(
                  color: isSelected ? AppColors.primary : Colors.transparent,
                  borderRadius: BorderRadius.circular(20),
                  boxShadow: isSelected
                      ? [
                          BoxShadow(
                            color: AppColors.primary.withValues(alpha: 0.3),
                            blurRadius: 8,
                            offset: const Offset(0, 2),
                          ),
                        ]
                      : null,
                ),
                child: Center(
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      if (isSelected) ...[
                        Icon(
                          tab.icon,
                          size: 14,
                          color: AppColors.white,
                        ),
                        const SizedBox(width: 4),
                      ],
                      Flexible(
                        child: Text(
                          tab.label,
                          style: (isSelected
                                  ? AppTextStyles.bodySmallBold
                                  : AppTextStyles.bodySmall)
                              .copyWith(
                            color: isSelected
                                ? AppColors.white
                                : isDark
                                    ? AppColors.darkOnSurfaceVariant
                                    : AppColors.lightOnSurfaceVariant,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          );
        }),
      ),
    );
  }
}

class _TabItem {
  final String label;
  final IconData icon;

  const _TabItem({required this.label, required this.icon});
}
