import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../l10n/l10n.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../domain/submission.dart';
import '../providers/challenge_provider.dart';

/// Challenge results / leaderboard screen.
///
/// Shows a winner showcase at the top, a podium display for the top 3, and a
/// full ranked list below with infinite scroll. Each entry shows rank, avatar,
/// username, vote count, and Wilson score.
class ChallengeResultsScreen extends ConsumerStatefulWidget {
  final String challengeId;

  const ChallengeResultsScreen({
    super.key,
    required this.challengeId,
  });

  @override
  ConsumerState<ChallengeResultsScreen> createState() =>
      _ChallengeResultsScreenState();
}

class _ChallengeResultsScreenState
    extends ConsumerState<ChallengeResultsScreen> {
  final ScrollController _scrollController = ScrollController();

  @override
  void initState() {
    super.initState();
    _scrollController.addListener(_onScroll);
  }

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  void _onScroll() {
    if (_scrollController.position.pixels >=
        _scrollController.position.maxScrollExtent - 200) {
      ref
          .read(challengeResultsProvider(widget.challengeId).notifier)
          .loadMore();
    }
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(challengeResultsProvider(widget.challengeId));
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: Text(
          context.l10n.results,
          style: AppTextStyles.heading3.copyWith(
            color: theme.colorScheme.onSurface,
          ),
        ),
        backgroundColor: theme.scaffoldBackgroundColor,
        surfaceTintColor: Colors.transparent,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded),
          onPressed: () => context.pop(),
        ),
      ),
      body: state.submissions.isEmpty && state.isLoading
          ? const Center(
              child: CircularProgressIndicator(color: AppColors.primary),
            )
          : state.submissions.isEmpty && state.errorMessage != null
              ? _ErrorView(
                  message: state.errorMessage!,
                  onRetry: () => ref
                      .read(
                          challengeResultsProvider(widget.challengeId).notifier)
                      .loadInitial(),
                )
              : state.submissions.isEmpty
                  ? _EmptyView()
                  : CustomScrollView(
                      controller: _scrollController,
                      slivers: [
                        // Winner showcase.
                        if (state.submissions.isNotEmpty)
                          SliverToBoxAdapter(
                            child: _WinnerShowcase(
                              winner: state.submissions.first,
                            ),
                          ),

                        // Top 3 podium.
                        if (state.submissions.length >= 3)
                          SliverToBoxAdapter(
                            child: _PodiumDisplay(
                              top3: state.submissions.take(3).toList(),
                            ),
                          ),

                        // Section header.
                        SliverToBoxAdapter(
                          child: Padding(
                            padding: const EdgeInsets.fromLTRB(20, 24, 20, 8),
                            child: Text(
                              context.l10n.fullRankings,
                              style: AppTextStyles.heading3.copyWith(
                                color: theme.colorScheme.onSurface,
                              ),
                            ),
                          ),
                        ),

                        // Full ranked list.
                        SliverPadding(
                          padding: const EdgeInsets.symmetric(horizontal: 20),
                          sliver: SliverList(
                            delegate: SliverChildBuilderDelegate(
                              (context, index) {
                                if (index >= state.submissions.length) {
                                  return state.hasMore
                                      ? const Padding(
                                          padding: EdgeInsets.all(16),
                                          child: Center(
                                            child: CircularProgressIndicator(
                                              color: AppColors.primary,
                                              strokeWidth: 2,
                                            ),
                                          ),
                                        )
                                      : null;
                                }
                                return _RankedSubmissionTile(
                                  submission: state.submissions[index],
                                  rank: index + 1,
                                  onTap: () {
                                    // Navigate to view submission video.
                                    context.push(
                                      '/submissions/${state.submissions[index].id}',
                                    );
                                  },
                                );
                              },
                              childCount: state.submissions.length +
                                  (state.hasMore ? 1 : 0),
                            ),
                          ),
                        ),

                        // Bottom padding.
                        const SliverToBoxAdapter(
                          child: SizedBox(height: 40),
                        ),
                      ],
                    ),
    );
  }
}

// =============================================================================
// Winner showcase
// =============================================================================

class _WinnerShowcase extends StatelessWidget {
  final Submission winner;

  const _WinnerShowcase({required this.winner});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.fromLTRB(20, 8, 20, 0),
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFFFFD700), Color(0xFFFFA500)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(24),
        boxShadow: [
          BoxShadow(
            color: AppColors.gold.withValues(alpha: 0.3),
            blurRadius: 16,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: Column(
        children: [
          // Trophy icon.
          const Icon(
            Icons.emoji_events_rounded,
            size: 48,
            color: AppColors.white,
          ),
          const SizedBox(height: 8),
          Text(
            'WINNER',
            style: AppTextStyles.overline.copyWith(
              color: AppColors.white,
              letterSpacing: 3,
              fontSize: 14,
            ),
          ),
          const SizedBox(height: 16),

          // Winner avatar.
          Container(
            width: 80,
            height: 80,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              border: Border.all(color: AppColors.white, width: 3),
              boxShadow: [
                BoxShadow(
                  color: AppColors.black.withValues(alpha: 0.2),
                  blurRadius: 8,
                ),
              ],
            ),
            child: ClipOval(
              child: winner.avatarUrl != null
                  ? CachedNetworkImage(
                      imageUrl: winner.avatarUrl!,
                      fit: BoxFit.cover,
                    )
                  : Container(
                      color: AppColors.primaryLight,
                      alignment: Alignment.center,
                      child: Text(
                        winner.displayNameOrUsername.isNotEmpty
                            ? winner.displayNameOrUsername[0].toUpperCase()
                            : '?',
                        style: AppTextStyles.heading1
                            .copyWith(color: AppColors.white),
                      ),
                    ),
            ),
          ),
          const SizedBox(height: 12),

          // Winner name.
          Text(
            winner.displayNameOrUsername,
            style:
                AppTextStyles.heading2.copyWith(color: AppColors.white),
          ),
          const SizedBox(height: 4),

          // Vote count.
          Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.favorite, size: 18, color: AppColors.white),
              const SizedBox(width: 4),
              Text(
                '${winner.voteCount} votes',
                style: AppTextStyles.bodyMediumBold.copyWith(
                  color: AppColors.white.withValues(alpha: 0.9),
                ),
              ),
            ],
          ),

          // Video thumbnail.
          if (winner.thumbnailUrl != null) ...[
            const SizedBox(height: 16),
            ClipRRect(
              borderRadius: BorderRadius.circular(12),
              child: AspectRatio(
                aspectRatio: 16 / 9,
                child: Stack(
                  fit: StackFit.expand,
                  children: [
                    CachedNetworkImage(
                      imageUrl: winner.thumbnailUrl!,
                      fit: BoxFit.cover,
                    ),
                    Center(
                      child: Container(
                        width: 48,
                        height: 48,
                        decoration: BoxDecoration(
                          color: AppColors.white.withValues(alpha: 0.9),
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(
                          Icons.play_arrow_rounded,
                          size: 32,
                          color: AppColors.primary,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

// =============================================================================
// Podium display
// =============================================================================

class _PodiumDisplay extends StatelessWidget {
  final List<Submission> top3;

  const _PodiumDisplay({required this.top3});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 24, 20, 0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          // 2nd place.
          if (top3.length > 1)
            Expanded(
              child: _PodiumColumn(
                submission: top3[1],
                rank: 2,
                height: 100,
                color: AppColors.silver,
              ),
            ),

          // 1st place.
          Expanded(
            child: _PodiumColumn(
              submission: top3[0],
              rank: 1,
              height: 130,
              color: AppColors.gold,
            ),
          ),

          // 3rd place.
          if (top3.length > 2)
            Expanded(
              child: _PodiumColumn(
                submission: top3[2],
                rank: 3,
                height: 80,
                color: AppColors.bronze,
              ),
            ),
        ],
      ),
    );
  }
}

class _PodiumColumn extends StatelessWidget {
  final Submission submission;
  final int rank;
  final double height;
  final Color color;

  const _PodiumColumn({
    required this.submission,
    required this.rank,
    required this.height,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        // Avatar.
        Container(
          width: rank == 1 ? 56 : 44,
          height: rank == 1 ? 56 : 44,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            border: Border.all(color: color, width: 2),
          ),
          child: ClipOval(
            child: submission.avatarUrl != null
                ? CachedNetworkImage(
                    imageUrl: submission.avatarUrl!,
                    fit: BoxFit.cover,
                  )
                : Container(
                    color: color.withValues(alpha: 0.2),
                    alignment: Alignment.center,
                    child: Text(
                      submission.displayNameOrUsername.isNotEmpty
                          ? submission.displayNameOrUsername[0].toUpperCase()
                          : '?',
                      style: AppTextStyles.bodyMediumBold
                          .copyWith(color: color),
                    ),
                  ),
          ),
        ),
        const SizedBox(height: 6),

        // Username.
        Text(
          submission.displayNameOrUsername,
          style: AppTextStyles.bodySmallBold.copyWith(
            color: theme.colorScheme.onSurface,
          ),
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          textAlign: TextAlign.center,
        ),

        // Vote count.
        Text(
          '${submission.voteCount}',
          style: AppTextStyles.caption.copyWith(
            color: theme.colorScheme.onSurface.withValues(alpha: 0.6),
          ),
        ),
        const SizedBox(height: 8),

        // Pedestal.
        Container(
          height: height,
          decoration: BoxDecoration(
            color: color.withValues(alpha: 0.15),
            borderRadius: const BorderRadius.vertical(
              top: Radius.circular(12),
            ),
            border: Border.all(color: color.withValues(alpha: 0.3)),
          ),
          alignment: Alignment.center,
          child: Text(
            '#$rank',
            style: AppTextStyles.heading2.copyWith(
              color: color,
            ),
          ),
        ),
      ],
    );
  }
}

// =============================================================================
// Ranked submission tile
// =============================================================================

class _RankedSubmissionTile extends StatelessWidget {
  final Submission submission;
  final int rank;
  final VoidCallback? onTap;

  const _RankedSubmissionTile({
    required this.submission,
    required this.rank,
    this.onTap,
  });

  Color get _rankColor {
    switch (rank) {
      case 1:
        return AppColors.gold;
      case 2:
        return AppColors.silver;
      case 3:
        return AppColors.bronze;
      default:
        return AppColors.lightOnSurfaceVariant;
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        margin: const EdgeInsets.only(bottom: 4),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
        decoration: BoxDecoration(
          color: rank <= 3
              ? _rankColor.withValues(alpha: 0.05)
              : Colors.transparent,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Row(
          children: [
            // Rank number.
            SizedBox(
              width: 36,
              child: Text(
                '#$rank',
                style: AppTextStyles.bodyMediumBold.copyWith(
                  color: _rankColor,
                ),
              ),
            ),

            // Avatar.
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                border: rank <= 3
                    ? Border.all(color: _rankColor, width: 2)
                    : null,
              ),
              child: ClipOval(
                child: submission.avatarUrl != null
                    ? CachedNetworkImage(
                        imageUrl: submission.avatarUrl!,
                        fit: BoxFit.cover,
                      )
                    : Container(
                        color: theme.colorScheme.surfaceContainerHighest,
                        alignment: Alignment.center,
                        child: Text(
                          submission.displayNameOrUsername.isNotEmpty
                              ? submission.displayNameOrUsername[0]
                                  .toUpperCase()
                              : '?',
                          style: AppTextStyles.bodyMediumBold.copyWith(
                            color: theme.colorScheme.onSurface,
                          ),
                        ),
                      ),
              ),
            ),
            const SizedBox(width: 12),

            // Name + score.
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    submission.displayNameOrUsername,
                    style: AppTextStyles.bodyMediumBold.copyWith(
                      color: theme.colorScheme.onSurface,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  Text(
                    'Score: ${submission.wilsonScore.toStringAsFixed(3)}',
                    style: AppTextStyles.caption.copyWith(
                      color: theme.colorScheme.onSurface
                          .withValues(alpha: 0.5),
                    ),
                  ),
                ],
              ),
            ),

            // Vote count.
            Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      Icons.favorite,
                      size: 14,
                      color: AppColors.primary.withValues(alpha: 0.7),
                    ),
                    const SizedBox(width: 4),
                    Text(
                      submission.voteCount.toString(),
                      style: AppTextStyles.bodyMediumBold.copyWith(
                        color: AppColors.primary,
                      ),
                    ),
                  ],
                ),
                if (submission.superVoteCount > 0)
                  Text(
                    '+${submission.superVoteCount} super',
                    style: AppTextStyles.overline.copyWith(
                      color: AppColors.accent,
                    ),
                  ),
              ],
            ),

            const SizedBox(width: 4),
            Icon(
              Icons.chevron_right_rounded,
              size: 20,
              color: theme.colorScheme.onSurface.withValues(alpha: 0.3),
            ),
          ],
        ),
      ),
    );
  }
}

// =============================================================================
// Empty / Error views
// =============================================================================

class _EmptyView extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.emoji_events_outlined,
              size: 64,
              color: AppColors.primary.withValues(alpha: 0.4),
            ),
            const SizedBox(height: 16),
            Text(context.l10n.noResultsYet, style: AppTextStyles.heading3),
            const SizedBox(height: 8),
            Text(
              'Results will appear once voting starts.',
              style: AppTextStyles.bodyMedium.copyWith(
                color: Theme.of(context)
                    .colorScheme
                    .onSurface
                    .withValues(alpha: 0.6),
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}

class _ErrorView extends StatelessWidget {
  final String message;
  final VoidCallback onRetry;

  const _ErrorView({required this.message, required this.onRetry});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.error_outline_rounded,
              size: 64,
              color: AppColors.error.withValues(alpha: 0.5),
            ),
            const SizedBox(height: 16),
            Text(context.l10n.failedToLoadResults, style: AppTextStyles.heading3),
            const SizedBox(height: 24),
            ElevatedButton.icon(
              onPressed: onRetry,
              icon: const Icon(Icons.refresh),
              label: const Text('Retry'),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                foregroundColor: AppColors.white,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
