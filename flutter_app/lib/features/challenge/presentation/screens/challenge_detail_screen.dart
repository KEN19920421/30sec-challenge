import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../l10n/l10n.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../domain/challenge.dart';
import '../../domain/submission.dart';
import '../providers/challenge_provider.dart';
import '../widgets/challenge_countdown.dart';
import '../widgets/sponsor_badge.dart';

/// Full challenge detail screen.
///
/// Shows the challenge header with title, description, category, and difficulty.
/// Displays stats (submissions count, total votes, time remaining), action
/// buttons (record or view results), a preview of the top 5 submissions, and
/// an optional sponsor section.
class ChallengeDetailScreen extends ConsumerWidget {
  final String challengeId;

  const ChallengeDetailScreen({
    super.key,
    required this.challengeId,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final asyncChallenge = ref.watch(challengeDetailProvider(challengeId));

    return Scaffold(
      body: asyncChallenge.when(
        loading: () => const Center(
          child: CircularProgressIndicator(color: AppColors.primary),
        ),
        error: (error, _) => _ErrorBody(
          message: error.toString(),
          onRetry: () => ref.invalidate(challengeDetailProvider(challengeId)),
        ),
        data: (challenge) => _ChallengeDetailBody(
          challenge: challenge,
          challengeId: challengeId,
        ),
      ),
    );
  }
}

class _ChallengeDetailBody extends ConsumerWidget {
  final Challenge challenge;
  final String challengeId;

  const _ChallengeDetailBody({
    required this.challenge,
    required this.challengeId,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final resultsState = ref.watch(challengeResultsProvider(challengeId));

    return CustomScrollView(
      slivers: [
        // Collapsible app bar with thumbnail.
        SliverAppBar(
          expandedHeight: 240,
          pinned: true,
          backgroundColor: AppColors.primary,
          foregroundColor: AppColors.white,
          flexibleSpace: FlexibleSpaceBar(
            background: _buildHeaderImage(),
          ),
          leading: IconButton(
            icon: const Icon(Icons.arrow_back_rounded),
            onPressed: () => context.pop(),
          ),
          actions: [
            IconButton(
              icon: const Icon(Icons.share_rounded),
              onPressed: () {
                // TODO: Share challenge.
              },
            ),
          ],
        ),

        // Challenge info.
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Category + difficulty row.
                Row(
                  children: [
                    _CategoryChip(category: challenge.category),
                    const SizedBox(width: 8),
                    _DifficultyDots(difficulty: challenge.difficulty),
                    const Spacer(),
                    _StatusLabel(status: challenge.status),
                  ],
                ),

                const SizedBox(height: 16),

                // Title.
                Text(
                  challenge.title,
                  style: AppTextStyles.heading1.copyWith(
                    color: theme.colorScheme.onSurface,
                  ),
                ),

                const SizedBox(height: 12),

                // Description.
                Text(
                  challenge.description,
                  style: AppTextStyles.bodyLarge.copyWith(
                    color: theme.colorScheme.onSurface.withValues(alpha: 0.8),
                  ),
                ),

                const SizedBox(height: 24),

                // Stats row.
                _StatsRow(challenge: challenge),

                const SizedBox(height: 24),

                // Countdown.
                if (challenge.isActive)
                  Center(
                    child: ChallengeCountdown(
                      targetTime: challenge.endsAt,
                      label: 'Challenge ends in',
                    ),
                  )
                else if (challenge.isVoting)
                  Center(
                    child: ChallengeCountdown(
                      targetTime: challenge.votingEndsAt,
                      label: 'Voting ends in',
                    ),
                  )
                else if (challenge.isScheduled)
                  Center(
                    child: ChallengeCountdown(
                      targetTime: challenge.startsAt,
                      label: 'Starts in',
                    ),
                  ),

                const SizedBox(height: 24),

                // Action buttons.
                if (challenge.isActive) ...[
                  SizedBox(
                    width: double.infinity,
                    height: 56,
                    child: ElevatedButton.icon(
                      onPressed: () => context.push(
                        '/record',
                        extra: {'challengeId': challenge.id},
                      ),
                      icon: const Icon(Icons.fiber_manual_record, size: 20),
                      label: Text(
                        context.l10n.recordYourEntry,
                        style: AppTextStyles.buttonLarge,
                      ),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.primary,
                        foregroundColor: AppColors.white,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(16),
                        ),
                        elevation: 4,
                        shadowColor: AppColors.primary.withValues(alpha: 0.4),
                      ),
                    ),
                  ),
                ],
                if (challenge.isVoting || challenge.isCompleted) ...[
                  SizedBox(
                    width: double.infinity,
                    height: 56,
                    child: ElevatedButton.icon(
                      onPressed: () => context.push(
                        '/challenges/$challengeId/results',
                      ),
                      icon: const Icon(Icons.emoji_events_outlined, size: 22),
                      label: Text(
                        context.l10n.viewResults,
                        style: AppTextStyles.buttonLarge,
                      ),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.primary,
                        foregroundColor: AppColors.white,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(16),
                        ),
                      ),
                    ),
                  ),
                ],

                // Sponsor section.
                if (challenge.isSponsored) ...[
                  const SizedBox(height: 24),
                  SponsorBadge(
                    sponsorName: challenge.sponsorName!,
                    sponsorLogoUrl: challenge.sponsorLogoUrl,
                  ),
                ],
              ],
            ),
          ),
        ),

        // Top submissions preview (top 5).
        if (resultsState.submissions.isNotEmpty) ...[
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(20, 8, 20, 12),
              child: Row(
                children: [
                  Text(
                    'Top Submissions',
                    style: AppTextStyles.heading3.copyWith(
                      color: theme.colorScheme.onSurface,
                    ),
                  ),
                  const Spacer(),
                  if (challenge.isVoting || challenge.isCompleted)
                    TextButton(
                      onPressed: () => context.push(
                        '/challenges/$challengeId/results',
                      ),
                      child: Text(
                        'View All',
                        style: AppTextStyles.bodyMediumBold.copyWith(
                          color: AppColors.primary,
                        ),
                      ),
                    ),
                ],
              ),
            ),
          ),
          SliverPadding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            sliver: SliverList(
              delegate: SliverChildBuilderDelegate(
                (context, index) {
                  final sub = resultsState.submissions[index];
                  return _SubmissionPreviewTile(
                    submission: sub,
                    rank: index + 1,
                  );
                },
                childCount: resultsState.submissions.length.clamp(0, 5),
              ),
            ),
          ),
        ],

        // Bottom padding.
        const SliverToBoxAdapter(child: SizedBox(height: 40)),
      ],
    );
  }

  Widget _buildHeaderImage() {
    if (challenge.thumbnailUrl != null && challenge.thumbnailUrl!.isNotEmpty) {
      return Stack(
        fit: StackFit.expand,
        children: [
          CachedNetworkImage(
            imageUrl: challenge.thumbnailUrl!,
            fit: BoxFit.cover,
          ),
          Container(
            decoration: const BoxDecoration(
              gradient: AppColors.darkOverlayGradient,
            ),
          ),
        ],
      );
    }

    return Container(
      decoration: const BoxDecoration(
        gradient: AppColors.primaryGradient,
      ),
    );
  }
}

// =============================================================================
// Stats row
// =============================================================================

class _StatsRow extends StatelessWidget {
  final Challenge challenge;

  const _StatsRow({required this.challenge});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: theme.colorScheme.surfaceContainerHighest.withValues(alpha: 0.5),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceAround,
        children: [
          _StatItem(
            icon: Icons.videocam_outlined,
            value: challenge.submissionCount.toString(),
            label: 'Entries',
          ),
          Container(
            width: 1,
            height: 40,
            color: theme.colorScheme.outline.withValues(alpha: 0.2),
          ),
          _StatItem(
            icon: Icons.how_to_vote_outlined,
            value: _formatCount(challenge.totalVotes),
            label: 'Votes',
          ),
          Container(
            width: 1,
            height: 40,
            color: theme.colorScheme.outline.withValues(alpha: 0.2),
          ),
          _StatItem(
            icon: Icons.timer_outlined,
            value: _formatDuration(challenge.timeRemaining),
            label: 'Remaining',
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

  String _formatDuration(Duration duration) {
    if (duration == Duration.zero) return '--';
    if (duration.inDays > 0) return '${duration.inDays}d';
    if (duration.inHours > 0) return '${duration.inHours}h';
    return '${duration.inMinutes}m';
  }
}

class _StatItem extends StatelessWidget {
  final IconData icon;
  final String value;
  final String label;

  const _StatItem({
    required this.icon,
    required this.value,
    required this.label,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 22, color: AppColors.primary),
        const SizedBox(height: 4),
        Text(
          value,
          style: AppTextStyles.heading4.copyWith(
            color: theme.colorScheme.onSurface,
          ),
        ),
        Text(
          label,
          style: AppTextStyles.caption.copyWith(
            color: theme.colorScheme.onSurface.withValues(alpha: 0.6),
          ),
        ),
      ],
    );
  }
}

// =============================================================================
// Submission preview tile
// =============================================================================

class _SubmissionPreviewTile extends StatelessWidget {
  final Submission submission;
  final int rank;

  const _SubmissionPreviewTile({
    required this.submission,
    required this.rank,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: theme.colorScheme.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: theme.colorScheme.outline.withValues(alpha: 0.1),
        ),
      ),
      child: Row(
        children: [
          // Rank badge.
          _RankBadge(rank: rank),
          const SizedBox(width: 12),

          // Thumbnail.
          ClipRRect(
            borderRadius: BorderRadius.circular(8),
            child: Container(
              width: 48,
              height: 48,
              color: theme.colorScheme.surfaceContainerHighest,
              child: submission.thumbnailUrl != null
                  ? CachedNetworkImage(
                      imageUrl: submission.thumbnailUrl!,
                      fit: BoxFit.cover,
                    )
                  : const Icon(Icons.play_circle_outline,
                      color: AppColors.primary),
            ),
          ),
          const SizedBox(width: 12),

          // User info.
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
                if (submission.caption != null)
                  Text(
                    submission.caption!,
                    style: AppTextStyles.caption.copyWith(
                      color:
                          theme.colorScheme.onSurface.withValues(alpha: 0.6),
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
              ],
            ),
          ),

          // Vote count.
          Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                submission.voteCount.toString(),
                style: AppTextStyles.bodyMediumBold.copyWith(
                  color: AppColors.primary,
                ),
              ),
              Text(
                'votes',
                style: AppTextStyles.overline.copyWith(
                  color:
                      theme.colorScheme.onSurface.withValues(alpha: 0.5),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

// =============================================================================
// Reusable rank badge
// =============================================================================

class _RankBadge extends StatelessWidget {
  final int rank;

  const _RankBadge({required this.rank});

  Color get _color {
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
    return Container(
      width: 32,
      height: 32,
      decoration: BoxDecoration(
        color: _color.withValues(alpha: 0.15),
        shape: BoxShape.circle,
        border: Border.all(color: _color.withValues(alpha: 0.4)),
      ),
      alignment: Alignment.center,
      child: Text(
        '#$rank',
        style: AppTextStyles.bodySmallBold.copyWith(color: _color),
      ),
    );
  }
}

// =============================================================================
// Helper widgets
// =============================================================================

class _CategoryChip extends StatelessWidget {
  final String category;

  const _CategoryChip({required this.category});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: AppColors.primary.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(
        category.toUpperCase(),
        style: AppTextStyles.overline.copyWith(color: AppColors.primary),
      ),
    );
  }
}

class _DifficultyDots extends StatelessWidget {
  final String difficulty;

  const _DifficultyDots({required this.difficulty});

  int get _filled {
    switch (difficulty.toLowerCase()) {
      case 'easy':
        return 1;
      case 'medium':
        return 2;
      case 'hard':
        return 3;
      default:
        return 1;
    }
  }

  Color get _color {
    switch (difficulty.toLowerCase()) {
      case 'easy':
        return AppColors.success;
      case 'medium':
        return AppColors.warning;
      case 'hard':
        return AppColors.error;
      default:
        return AppColors.info;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: List.generate(3, (i) {
        return Container(
          width: 8,
          height: 8,
          margin: const EdgeInsets.only(right: 3),
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: i < _filled
                ? _color
                : _color.withValues(alpha: 0.2),
          ),
        );
      }),
    );
  }
}

class _StatusLabel extends StatelessWidget {
  final String status;

  const _StatusLabel({required this.status});

  Color get _color {
    switch (status) {
      case 'active':
        return AppColors.success;
      case 'voting':
        return AppColors.info;
      case 'completed':
        return AppColors.lightOnSurfaceVariant;
      case 'scheduled':
        return AppColors.warning;
      default:
        return AppColors.lightOnSurfaceVariant;
    }
  }

  String get _label {
    switch (status) {
      case 'active':
        return 'Live';
      case 'voting':
        return 'Voting';
      case 'completed':
        return 'Completed';
      case 'scheduled':
        return 'Upcoming';
      default:
        return status;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: _color.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(
        _label.toUpperCase(),
        style: AppTextStyles.overline.copyWith(color: _color),
      ),
    );
  }
}

// =============================================================================
// Error body
// =============================================================================

class _ErrorBody extends StatelessWidget {
  final String message;
  final VoidCallback onRetry;

  const _ErrorBody({required this.message, required this.onRetry});

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
            Text('Failed to load challenge', style: AppTextStyles.heading3),
            const SizedBox(height: 8),
            Text(
              message,
              style: AppTextStyles.bodyMedium,
              textAlign: TextAlign.center,
            ),
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
