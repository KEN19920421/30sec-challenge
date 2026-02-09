import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../domain/leaderboard_entry.dart';

/// Podium display for the top 3 ranked entries.
///
/// Layout:
/// - Center (1st place): tallest pedestal, gold medal, larger avatar.
/// - Left (2nd place): medium pedestal, silver medal.
/// - Right (3rd place): shorter pedestal, bronze medal.
///
/// Each entry shows: avatar, username, vote count, and submission thumbnail.
/// Has a subtle slide-up entrance animation.
class TopThreePodium extends StatefulWidget {
  final List<LeaderboardEntry> topThree;
  final ValueChanged<LeaderboardEntry>? onEntryTap;

  const TopThreePodium({
    super.key,
    required this.topThree,
    this.onEntryTap,
  });

  @override
  State<TopThreePodium> createState() => _TopThreePodiumState();
}

class _TopThreePodiumState extends State<TopThreePodium>
    with SingleTickerProviderStateMixin {
  late AnimationController _animController;
  late Animation<double> _slideAnimation;
  late Animation<double> _fadeAnimation;

  @override
  void initState() {
    super.initState();
    _animController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 800),
    );
    _slideAnimation = Tween<double>(begin: 40, end: 0).animate(
      CurvedAnimation(parent: _animController, curve: Curves.easeOutCubic),
    );
    _fadeAnimation = Tween<double>(begin: 0, end: 1).animate(
      CurvedAnimation(parent: _animController, curve: Curves.easeIn),
    );
    _animController.forward();
  }

  @override
  void dispose() {
    _animController.dispose();
    super.dispose();
  }

  LeaderboardEntry? _entryForRank(int rank) {
    try {
      return widget.topThree.firstWhere((e) => e.rank == rank);
    } catch (_) {
      return null;
    }
  }

  @override
  Widget build(BuildContext context) {
    final first = _entryForRank(1);
    final second = _entryForRank(2);
    final third = _entryForRank(3);

    if (first == null) return const SizedBox.shrink();

    return AnimatedBuilder(
      animation: _animController,
      builder: (context, child) {
        return Transform.translate(
          offset: Offset(0, _slideAnimation.value),
          child: Opacity(
            opacity: _fadeAnimation.value,
            child: child,
          ),
        );
      },
      child: Container(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            // 2nd place (left).
            Expanded(
              child: second != null
                  ? _PodiumEntry(
                      entry: second,
                      rank: 2,
                      avatarSize: 56,
                      pedestalHeight: 80,
                      medalColor: AppColors.silver,
                      medalEmoji: '2',
                      onTap: () => widget.onEntryTap?.call(second),
                    )
                  : const SizedBox.shrink(),
            ),

            // 1st place (center).
            Expanded(
              child: _PodiumEntry(
                entry: first,
                rank: 1,
                avatarSize: 72,
                pedestalHeight: 110,
                medalColor: AppColors.gold,
                medalEmoji: '1',
                isFirst: true,
                onTap: () => widget.onEntryTap?.call(first),
              ),
            ),

            // 3rd place (right).
            Expanded(
              child: third != null
                  ? _PodiumEntry(
                      entry: third,
                      rank: 3,
                      avatarSize: 52,
                      pedestalHeight: 60,
                      medalColor: AppColors.bronze,
                      medalEmoji: '3',
                      onTap: () => widget.onEntryTap?.call(third),
                    )
                  : const SizedBox.shrink(),
            ),
          ],
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Individual podium entry
// ---------------------------------------------------------------------------

class _PodiumEntry extends StatelessWidget {
  final LeaderboardEntry entry;
  final int rank;
  final double avatarSize;
  final double pedestalHeight;
  final Color medalColor;
  final String medalEmoji;
  final bool isFirst;
  final VoidCallback? onTap;

  const _PodiumEntry({
    required this.entry,
    required this.rank,
    required this.avatarSize,
    required this.pedestalHeight,
    required this.medalColor,
    required this.medalEmoji,
    this.isFirst = false,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return GestureDetector(
      onTap: onTap,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Avatar with medal badge.
          Stack(
            clipBehavior: Clip.none,
            alignment: Alignment.center,
            children: [
              // Glow effect for 1st place.
              if (isFirst)
                Container(
                  width: avatarSize + 12,
                  height: avatarSize + 12,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    boxShadow: [
                      BoxShadow(
                        color: AppColors.gold.withValues(alpha: 0.4),
                        blurRadius: 20,
                        spreadRadius: 2,
                      ),
                    ],
                  ),
                ),

              // Avatar ring.
              Container(
                width: avatarSize + 6,
                height: avatarSize + 6,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  border: Border.all(color: medalColor, width: 3),
                ),
                child: ClipOval(
                  child: entry.avatarUrl != null
                      ? CachedNetworkImage(
                          imageUrl: entry.avatarUrl!,
                          width: avatarSize,
                          height: avatarSize,
                          fit: BoxFit.cover,
                          placeholder: (_, __) => _AvatarFallback(
                            name: entry.displayNameOrUsername,
                            size: avatarSize,
                          ),
                          errorWidget: (_, __, ___) => _AvatarFallback(
                            name: entry.displayNameOrUsername,
                            size: avatarSize,
                          ),
                        )
                      : _AvatarFallback(
                          name: entry.displayNameOrUsername,
                          size: avatarSize,
                        ),
                ),
              ),

              // Medal badge.
              Positioned(
                bottom: -4,
                child: Container(
                  width: 24,
                  height: 24,
                  decoration: BoxDecoration(
                    color: medalColor,
                    shape: BoxShape.circle,
                    border: Border.all(
                      color: isDark
                          ? AppColors.darkBackground
                          : AppColors.lightBackground,
                      width: 2,
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: medalColor.withValues(alpha: 0.4),
                        blurRadius: 6,
                        offset: const Offset(0, 2),
                      ),
                    ],
                  ),
                  child: Center(
                    child: Text(
                      medalEmoji,
                      style: const TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w900,
                        color: AppColors.white,
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),

          // Username.
          Text(
            entry.displayNameOrUsername,
            style: (isFirst ? AppTextStyles.bodyMediumBold : AppTextStyles.bodySmallBold)
                .copyWith(
              color: isDark
                  ? AppColors.darkOnSurface
                  : AppColors.lightOnSurface,
            ),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 2),

          // Vote count.
          Row(
            mainAxisSize: MainAxisSize.min,
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                Icons.how_to_vote_rounded,
                size: 12,
                color: isDark
                    ? AppColors.darkOnSurfaceVariant
                    : AppColors.lightOnSurfaceVariant,
              ),
              const SizedBox(width: 3),
              Text(
                _formatCount(entry.voteCount),
                style: AppTextStyles.caption.copyWith(
                  color: isDark
                      ? AppColors.darkOnSurfaceVariant
                      : AppColors.lightOnSurfaceVariant,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),

          // Pedestal.
          Container(
            height: pedestalHeight,
            decoration: BoxDecoration(
              borderRadius:
                  const BorderRadius.vertical(top: Radius.circular(12)),
              gradient: LinearGradient(
                colors: [
                  medalColor.withValues(alpha: 0.3),
                  medalColor.withValues(alpha: 0.1),
                ],
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
              ),
              border: Border(
                top: BorderSide(color: medalColor, width: 2),
                left: BorderSide(
                  color: medalColor.withValues(alpha: 0.3),
                  width: 1,
                ),
                right: BorderSide(
                  color: medalColor.withValues(alpha: 0.3),
                  width: 1,
                ),
              ),
            ),
            child: Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  // Score.
                  Text(
                    entry.score.toStringAsFixed(1),
                    style: (isFirst
                            ? AppTextStyles.heading3
                            : AppTextStyles.heading4)
                        .copyWith(
                      color: medalColor,
                    ),
                  ),
                  Text(
                    'pts',
                    style: AppTextStyles.caption.copyWith(
                      color: medalColor.withValues(alpha: 0.7),
                    ),
                  ),

                  // Thumbnail preview.
                  if (entry.thumbnailUrl != null) ...[
                    const SizedBox(height: 6),
                    ClipRRect(
                      borderRadius: BorderRadius.circular(6),
                      child: CachedNetworkImage(
                        imageUrl: entry.thumbnailUrl!,
                        width: isFirst ? 48 : 36,
                        height: isFirst ? 48 : 36,
                        fit: BoxFit.cover,
                        placeholder: (_, __) => Container(
                          color: medalColor.withValues(alpha: 0.2),
                        ),
                        errorWidget: (_, __, ___) => Container(
                          color: medalColor.withValues(alpha: 0.2),
                          child: Icon(
                            Icons.videocam_rounded,
                            size: 16,
                            color: medalColor,
                          ),
                        ),
                      ),
                    ),
                  ],
                ],
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
    return '$count';
  }
}

// ---------------------------------------------------------------------------
// Avatar fallback
// ---------------------------------------------------------------------------

class _AvatarFallback extends StatelessWidget {
  final String name;
  final double size;

  const _AvatarFallback({required this.name, required this.size});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      color: AppColors.primary.withValues(alpha: 0.2),
      child: Center(
        child: Text(
          name.isNotEmpty ? name[0].toUpperCase() : '?',
          style: TextStyle(
            color: AppColors.primary,
            fontWeight: FontWeight.w700,
            fontSize: size * 0.38,
          ),
        ),
      ),
    );
  }
}
