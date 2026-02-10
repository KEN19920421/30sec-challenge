import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_mobile_ads/google_mobile_ads.dart';

import '../../../../core/constants/ad_constants.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../l10n/l10n.dart';
import '../../domain/leaderboard_entry.dart';
import '../providers/leaderboard_provider.dart';
import '../widgets/leaderboard_tab_bar.dart';
import '../widgets/rank_tile.dart';
import '../widgets/top_three_podium.dart';

/// Full-featured leaderboard screen for a challenge.
///
/// Features:
/// - Tab bar: Daily, Weekly, All Time, Friends.
/// - "My Rank" banner at top if the user has submitted.
/// - Top 3 podium section with medal display.
/// - Scrollable ranked list for 4th place onwards.
/// - Tap an entry to view the submission.
/// - Pull to refresh.
/// - Banner ad at bottom for free users.
/// - Pagination via scroll-to-bottom loading.
class LeaderboardScreen extends ConsumerStatefulWidget {
  final String challengeId;
  final String challengeTitle;
  final bool showBannerAd;

  const LeaderboardScreen({
    super.key,
    required this.challengeId,
    this.challengeTitle = 'Leaderboard',
    this.showBannerAd = true,
  });

  @override
  ConsumerState<LeaderboardScreen> createState() => _LeaderboardScreenState();
}

class _LeaderboardScreenState extends ConsumerState<LeaderboardScreen> {
  final ScrollController _scrollController = ScrollController();
  int _selectedTabIndex = 2; // Default to "All Time".

  BannerAd? _bannerAd;
  bool _bannerAdLoaded = false;

  @override
  void initState() {
    super.initState();
    _scrollController.addListener(_onScroll);
    if (widget.showBannerAd) _loadBannerAd();
  }

  @override
  void dispose() {
    _scrollController.dispose();
    _bannerAd?.dispose();
    super.dispose();
  }

  // ---------------------------------------------------------------------------
  // Ad management
  // ---------------------------------------------------------------------------

  void _loadBannerAd() {
    _bannerAd = BannerAd(
      adUnitId: AdConstants.bannerId,
      size: AdSize.banner,
      request: const AdRequest(),
      listener: BannerAdListener(
        onAdLoaded: (ad) {
          if (mounted) setState(() => _bannerAdLoaded = true);
        },
        onAdFailedToLoad: (ad, error) {
          ad.dispose();
        },
      ),
    )..load();
  }

  // ---------------------------------------------------------------------------
  // Scroll-to-bottom pagination
  // ---------------------------------------------------------------------------

  void _onScroll() {
    if (_scrollController.position.pixels >=
        _scrollController.position.maxScrollExtent - 200) {
      ref
          .read(leaderboardProvider(widget.challengeId).notifier)
          .loadNextPage();
    }
  }

  // ---------------------------------------------------------------------------
  // Tab handling
  // ---------------------------------------------------------------------------

  void _onTabChanged(int index) {
    HapticFeedback.selectionClick();
    setState(() => _selectedTabIndex = index);

    final notifier =
        ref.read(leaderboardProvider(widget.challengeId).notifier);

    if (index == 3) {
      // Friends tab.
      notifier.loadFriendsLeaderboard();
    } else {
      final period = LeaderboardTabBar.periodForIndex(index);
      if (period != null) {
        notifier.changePeriod(period);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Entry tap
  // ---------------------------------------------------------------------------

  void _onEntryTap(LeaderboardEntry entry) {
    HapticFeedback.lightImpact();
    // Navigate to submission detail (to be wired via go_router).
    // context.push('/submission/${entry.submissionId}');
  }

  // ---------------------------------------------------------------------------
  // Build
  // ---------------------------------------------------------------------------

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(leaderboardProvider(widget.challengeId));
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      appBar: AppBar(
        title: Text(widget.challengeTitle),
        actions: [
          IconButton(
            icon: const Icon(Icons.info_outline_rounded),
            tooltip: 'Scoring Info',
            onPressed: () => _showScoringInfo(context),
          ),
        ],
      ),
      body: Column(
        children: [
          // Tab bar.
          LeaderboardTabBar(
            selectedIndex: _selectedTabIndex,
            onTabChanged: _onTabChanged,
          ),

          // Main content.
          Expanded(
            child: state.isLoading && state.entries.isEmpty
                ? _buildLoading()
                : state.errorMessage != null && state.entries.isEmpty
                    ? _buildError(state.errorMessage!)
                    : _buildContent(state, isDark),
          ),

          // Banner ad.
          if (widget.showBannerAd && _bannerAdLoaded && _bannerAd != null)
            SafeArea(
              top: false,
              child: Container(
                width: double.infinity,
                height: _bannerAd!.size.height.toDouble(),
                color: isDark ? AppColors.darkSurface : AppColors.lightSurface,
                alignment: Alignment.center,
                child: AdWidget(ad: _bannerAd!),
              ),
            ),
        ],
      ),
    );
  }

  // ---------------------------------------------------------------------------
  // Loading
  // ---------------------------------------------------------------------------

  Widget _buildLoading() {
    return const Center(
      child: CircularProgressIndicator(color: AppColors.primary),
    );
  }

  // ---------------------------------------------------------------------------
  // Error
  // ---------------------------------------------------------------------------

  Widget _buildError(String message) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(
              Icons.error_outline_rounded,
              color: AppColors.error,
              size: 48,
            ),
            const SizedBox(height: 16),
            Text(
              context.l10n.failedToLoadLeaderboard,
              style: AppTextStyles.heading4,
            ),
            const SizedBox(height: 8),
            Text(
              message,
              style: AppTextStyles.bodyMedium.copyWith(
                color: AppColors.lightOnSurfaceVariant,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 20),
            ElevatedButton.icon(
              onPressed: () {
                ref
                    .read(leaderboardProvider(widget.challengeId).notifier)
                    .refresh();
              },
              icon: const Icon(Icons.refresh_rounded),
              label: Text(context.l10n.retry),
            ),
          ],
        ),
      ),
    );
  }

  // ---------------------------------------------------------------------------
  // Main content
  // ---------------------------------------------------------------------------

  Widget _buildContent(LeaderboardState state, bool isDark) {
    return RefreshIndicator(
      color: AppColors.primary,
      onRefresh: () async {
        await ref
            .read(leaderboardProvider(widget.challengeId).notifier)
            .refresh();
      },
      child: CustomScrollView(
        controller: _scrollController,
        physics: const AlwaysScrollableScrollPhysics(),
        slivers: [
          // My rank banner.
          if (state.hasMyRank)
            SliverToBoxAdapter(
              child: _MyRankBanner(
                rank: state.myRank!,
                isDark: isDark,
              ),
            ),

          // Top 3 podium.
          if (state.topThree.isNotEmpty)
            SliverToBoxAdapter(
              child: TopThreePodium(
                topThree: state.topThree,
                onEntryTap: _onEntryTap,
              ),
            ),

          // Divider between podium and list.
          if (state.topThree.isNotEmpty && state.restEntries.isNotEmpty)
            const SliverToBoxAdapter(
              child: Padding(
                padding: EdgeInsets.fromLTRB(16, 16, 16, 8),
                child: Divider(),
              ),
            ),

          // Ranked list (4th place onwards).
          if (state.restEntries.isNotEmpty)
            SliverList(
              delegate: SliverChildBuilderDelegate(
                (context, index) {
                  if (index >= state.restEntries.length) {
                    // Loading more indicator.
                    return state.isLoadingMore
                        ? const Padding(
                            padding: EdgeInsets.all(16),
                            child: Center(
                              child: CircularProgressIndicator(
                                color: AppColors.primary,
                                strokeWidth: 2,
                              ),
                            ),
                          )
                        : const SizedBox.shrink();
                  }

                  final entry = state.restEntries[index];
                  // TODO: Compare with actual current user ID.
                  final isCurrentUser = false;

                  return RankTile(
                    entry: entry,
                    isCurrentUser: isCurrentUser,
                    onTap: () => _onEntryTap(entry),
                  );
                },
                childCount: state.restEntries.length + (state.hasMorePages ? 1 : 0),
              ),
            ),

          // Empty state.
          if (state.entries.isEmpty && !state.isLoading)
            SliverFillRemaining(
              child: _buildEmptyState(isDark),
            ),

          // Bottom padding.
          const SliverToBoxAdapter(
            child: SizedBox(height: 16),
          ),
        ],
      ),
    );
  }

  // ---------------------------------------------------------------------------
  // Empty state
  // ---------------------------------------------------------------------------

  Widget _buildEmptyState(bool isDark) {
    final isFriends = _selectedTabIndex == 3;

    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              isFriends
                  ? Icons.people_outline_rounded
                  : Icons.leaderboard_rounded,
              size: 56,
              color: isDark
                  ? AppColors.darkOnSurfaceVariant
                  : AppColors.lightOnSurfaceVariant,
            ),
            const SizedBox(height: 16),
            Text(
              isFriends ? 'No friends on this leaderboard' : 'No rankings yet',
              style: AppTextStyles.heading4.copyWith(
                color: isDark
                    ? AppColors.darkOnSurface
                    : AppColors.lightOnSurface,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 8),
            Text(
              isFriends
                  ? 'Invite your friends to join this challenge!'
                  : 'Be the first to submit and get ranked.',
              style: AppTextStyles.bodyMedium.copyWith(
                color: isDark
                    ? AppColors.darkOnSurfaceVariant
                    : AppColors.lightOnSurfaceVariant,
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }

  // ---------------------------------------------------------------------------
  // Scoring info dialog
  // ---------------------------------------------------------------------------

  void _showScoringInfo(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: Text(context.l10n.howScoringWorks),
          content: const Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _ScoringRow(icon: Icons.thumb_up_rounded, label: 'Upvote', value: '+1 point'),
              SizedBox(height: 8),
              _ScoringRow(icon: Icons.thumb_down_rounded, label: 'Downvote', value: '-1 point'),
              SizedBox(height: 8),
              _ScoringRow(icon: Icons.star_rounded, label: 'Super Vote', value: '+3 points'),
              SizedBox(height: 16),
              Text(
                'Rankings are calculated using a Wilson score algorithm that accounts for both vote count and ratio, giving a fair ranking even for entries with different numbers of votes.',
                style: TextStyle(fontSize: 13, height: 1.5),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: Text(context.l10n.gotIt),
            ),
          ],
        );
      },
    );
  }
}

// ---------------------------------------------------------------------------
// My Rank Banner
// ---------------------------------------------------------------------------

class _MyRankBanner extends StatelessWidget {
  final UserRank rank;
  final bool isDark;

  const _MyRankBanner({required this.rank, required this.isDark});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.fromLTRB(16, 8, 16, 4),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      decoration: BoxDecoration(
        gradient: AppColors.primaryGradient,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: AppColors.primary.withValues(alpha: 0.3),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Row(
        children: [
          // Rank badge.
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              color: AppColors.white.withValues(alpha: 0.2),
              shape: BoxShape.circle,
            ),
            child: Center(
              child: Text(
                '#${rank.rank}',
                style: AppTextStyles.heading4.copyWith(
                  color: AppColors.white,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ),
          ),
          const SizedBox(width: 14),

          // Info.
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Your Rank',
                  style: AppTextStyles.bodySmall.copyWith(
                    color: AppColors.white.withValues(alpha: 0.85),
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  '${rank.score.toStringAsFixed(1)} points',
                  style: AppTextStyles.bodyLargeBold.copyWith(
                    color: AppColors.white,
                  ),
                ),
              ],
            ),
          ),

          // Percentile.
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                rank.percentileDisplay,
                style: AppTextStyles.bodyMediumBold.copyWith(
                  color: AppColors.white,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                'of ${rank.totalParticipants} entries',
                style: AppTextStyles.caption.copyWith(
                  color: AppColors.white.withValues(alpha: 0.75),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Scoring info row
// ---------------------------------------------------------------------------

class _ScoringRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;

  const _ScoringRow({
    required this.icon,
    required this.label,
    required this.value,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(icon, size: 20, color: AppColors.primary),
        const SizedBox(width: 10),
        Text(label, style: AppTextStyles.bodyMedium),
        const Spacer(),
        Text(
          value,
          style: AppTextStyles.bodyMediumBold.copyWith(
            color: AppColors.primary,
          ),
        ),
      ],
    );
  }
}
