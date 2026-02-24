import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../core/widgets/empty_state_widget.dart';
import '../../../../core/widgets/error_state_widget.dart';
import '../../domain/entities/league_membership.dart';
import '../providers/league_provider.dart';

/// Displays the current user's weekly league tier, their rank and points,
/// a progress bar toward promotion, and a ranked list of all members in
/// the same tier.
class LeagueScreen extends ConsumerStatefulWidget {
  const LeagueScreen({super.key});

  @override
  ConsumerState<LeagueScreen> createState() => _LeagueScreenState();
}

class _LeagueScreenState extends ConsumerState<LeagueScreen> {
  final _scrollController = ScrollController();

  @override
  void initState() {
    super.initState();
    _scrollController.addListener(_onScroll);
    Future.microtask(() => ref.read(leagueProvider.notifier).loadMyLeague());
  }

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  void _onScroll() {
    if (_scrollController.position.pixels >=
        _scrollController.position.maxScrollExtent - 200) {
      ref.read(leagueProvider.notifier).loadMore();
    }
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(leagueProvider);
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Weekly League'),
        centerTitle: true,
      ),
      body: RefreshIndicator(
        color: AppColors.primary,
        onRefresh: () => ref.read(leagueProvider.notifier).loadMyLeague(),
        child: _buildBody(state, isDark),
      ),
    );
  }

  Widget _buildBody(LeagueState state, bool isDark) {
    // Full-screen loading on first load
    if (state.isLoading && state.myMembership == null) {
      return const Center(
        child: CircularProgressIndicator(color: AppColors.primary),
      );
    }

    // Full-screen error when no data has been loaded yet
    if (state.errorMessage != null && state.myMembership == null) {
      return ErrorStateWidget(
        title: 'Failed to load league',
        message: state.errorMessage,
        retryLabel: 'Retry',
        onRetry: () => ref.read(leagueProvider.notifier).loadMyLeague(),
      );
    }

    return CustomScrollView(
      controller: _scrollController,
      physics: const AlwaysScrollableScrollPhysics(),
      slivers: [
        // My league card
        if (state.myMembership != null)
          SliverToBoxAdapter(
            child: _MyLeagueCard(membership: state.myMembership!, isDark: isDark),
          ),

        // Rankings header
        if (state.myMembership != null)
          const SliverToBoxAdapter(
            child: Padding(
              padding: EdgeInsets.fromLTRB(16, 16, 16, 8),
              child: Text('League Rankings', style: AppTextStyles.heading3),
            ),
          ),

        // Empty state when no rankings yet
        if (state.tierRankings.isEmpty && !state.isLoading)
          const SliverToBoxAdapter(
            child: EmptyStateWidget(
              icon: Icons.emoji_events_outlined,
              title: 'No rankings yet',
              subtitle: 'Be the first to earn points this week!',
            ),
          )
        else
          SliverList(
            delegate: SliverChildBuilderDelegate(
              (context, index) {
                if (index >= state.tierRankings.length) {
                  return state.isLoadingMore
                      ? const Padding(
                          padding: EdgeInsets.all(16),
                          child: Center(
                            child: CircularProgressIndicator(
                              color: AppColors.primary,
                            ),
                          ),
                        )
                      : const SizedBox.shrink();
                }
                final member = state.tierRankings[index];
                final isMe = member.userId == state.myMembership?.userId;
                return _RankTile(member: member, isMe: isMe, isDark: isDark);
              },
              childCount:
                  state.tierRankings.length + (state.isLoadingMore ? 1 : 0),
            ),
          ),

        // Bottom padding
        const SliverToBoxAdapter(child: SizedBox(height: 32)),
      ],
    );
  }
}

// ---------------------------------------------------------------------------
// My League Card
// ---------------------------------------------------------------------------

class _MyLeagueCard extends StatelessWidget {
  final LeagueMembership membership;
  final bool isDark;

  const _MyLeagueCard({required this.membership, required this.isDark});

  @override
  Widget build(BuildContext context) {
    final tierColor = Color(membership.tier.colorValue);
    // Promotion threshold: top points earners advance; 200 pts is the target.
    const promotionPoints = 200;
    final progress = (membership.points / promotionPoints).clamp(0.0, 1.0);

    return Container(
      margin: const EdgeInsets.all(16),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            tierColor.withValues(alpha: 0.3),
            tierColor.withValues(alpha: 0.1),
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: tierColor.withValues(alpha: 0.5),
          width: 2,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Tier header row
          Row(
            children: [
              Text(
                membership.tier.emoji,
                style: const TextStyle(fontSize: 40),
              ),
              const SizedBox(width: 12),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    membership.tier.displayName,
                    style: AppTextStyles.heading2.copyWith(color: tierColor),
                  ),
                  Text(
                    'Week of ${membership.seasonWeek}',
                    style: AppTextStyles.caption,
                  ),
                ],
              ),
              const Spacer(),
              if (membership.rank != null)
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(
                      '#${membership.rank}',
                      style:
                          AppTextStyles.heading2.copyWith(color: tierColor),
                    ),
                    const Text('Rank', style: AppTextStyles.caption),
                  ],
                ),
            ],
          ),

          const SizedBox(height: 16),

          // Points row and promotion/relegation badge
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                '${membership.points} pts',
                style: AppTextStyles.bodyLargeBold,
              ),
              if (membership.promoted)
                const _StatusBadge(label: 'Promoted', color: AppColors.success)
              else if (membership.relegated)
                const _StatusBadge(label: 'Relegated', color: AppColors.error),
            ],
          ),

          const SizedBox(height: 8),

          // Progress bar toward promotion threshold
          LinearProgressIndicator(
            value: progress,
            backgroundColor: tierColor.withValues(alpha: 0.2),
            valueColor: AlwaysStoppedAnimation<Color>(tierColor),
            borderRadius: BorderRadius.circular(4),
            minHeight: 8,
          ),

          const SizedBox(height: 4),

          const Text(
            'Top scorers advance to the next tier',
            style: AppTextStyles.caption,
          ),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Status badge (Promoted / Relegated)
// ---------------------------------------------------------------------------

class _StatusBadge extends StatelessWidget {
  final String label;
  final Color color;

  const _StatusBadge({required this.label, required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(
        label,
        style: const TextStyle(
          color: Colors.white,
          fontWeight: FontWeight.bold,
          fontSize: 12,
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Rank tile
// ---------------------------------------------------------------------------

class _RankTile extends StatelessWidget {
  final LeagueMembership member;
  final bool isMe;
  final bool isDark;

  const _RankTile({
    required this.member,
    required this.isMe,
    required this.isDark,
  });

  @override
  Widget build(BuildContext context) {
    final tierColor = Color(member.tier.colorValue);
    final surfaceColor =
        isDark ? AppColors.darkSurface : AppColors.lightSurface;

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: isMe ? tierColor.withValues(alpha: 0.15) : surfaceColor,
        borderRadius: BorderRadius.circular(12),
        border: isMe
            ? Border.all(color: tierColor.withValues(alpha: 0.5))
            : null,
      ),
      child: Row(
        children: [
          // Rank number
          SizedBox(
            width: 32,
            child: Text(
              member.rank != null ? '#${member.rank}' : '-',
              style: AppTextStyles.bodyLargeBold.copyWith(
                color: isMe ? tierColor : null,
              ),
              textAlign: TextAlign.center,
            ),
          ),

          const SizedBox(width: 12),

          // Avatar
          CircleAvatar(
            radius: 20,
            backgroundColor: tierColor.withValues(alpha: 0.3),
            backgroundImage: member.avatarUrl != null
                ? CachedNetworkImageProvider(member.avatarUrl!)
                : null,
            child: member.avatarUrl == null
                ? Text(
                    member.displayName.isNotEmpty
                        ? member.displayName[0].toUpperCase()
                        : '?',
                    style: AppTextStyles.bodyMediumBold,
                  )
                : null,
          ),

          const SizedBox(width: 12),

          // Display name and username
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  member.displayName.isNotEmpty
                      ? member.displayName
                      : member.username,
                  style: AppTextStyles.bodyLargeBold,
                  overflow: TextOverflow.ellipsis,
                ),
                Text(
                  '@${member.username}',
                  style: AppTextStyles.caption,
                ),
              ],
            ),
          ),

          // Points
          Text(
            '${member.points} pts',
            style: AppTextStyles.bodyLargeBold.copyWith(
              color: isMe ? tierColor : null,
            ),
          ),
        ],
      ),
    );
  }
}
