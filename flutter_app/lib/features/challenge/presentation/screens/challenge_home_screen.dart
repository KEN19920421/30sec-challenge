import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../l10n/l10n.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../domain/challenge.dart';
import '../providers/challenge_provider.dart';
import '../widgets/challenge_card.dart';
import '../widgets/challenge_countdown.dart';
import '../widgets/sponsor_badge.dart';

/// Main home screen showing today's active challenge.
///
/// Displays a hero section with the challenge title, description, category
/// badge, difficulty indicator, and a countdown timer. Below the hero is a
/// "Record Now" CTA button, submission count badge, and scrollable upcoming
/// challenges preview.
class ChallengeHomeScreen extends ConsumerWidget {
  const ChallengeHomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(challengeNotifierProvider);
    final theme = Theme.of(context);

    return Scaffold(
      body: RefreshIndicator(
        color: AppColors.primary,
        onRefresh: () =>
            ref.read(challengeNotifierProvider.notifier).refresh(),
        child: CustomScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          slivers: [
            // App bar
            SliverAppBar(
              expandedHeight: 0,
              floating: true,
              backgroundColor: theme.scaffoldBackgroundColor,
              surfaceTintColor: Colors.transparent,
              title: Text(
                context.l10n.appTitle,
                style: AppTextStyles.heading3.copyWith(
                  color: AppColors.primary,
                  fontWeight: FontWeight.w800,
                ),
              ),
              actions: [
                IconButton(
                  icon: const Icon(Icons.history_rounded),
                  color: theme.colorScheme.onSurface,
                  onPressed: () => context.push('/challenges/history'),
                  tooltip: context.l10n.challengeHistory,
                ),
                const SizedBox(width: 4),
              ],
            ),

            // Content
            if (state.isLoading && state.currentChallenge == null)
              const SliverFillRemaining(
                child: Center(
                  child: CircularProgressIndicator(color: AppColors.primary),
                ),
              )
            else if (state.errorMessage != null &&
                state.currentChallenge == null)
              SliverFillRemaining(
                child: _ErrorView(
                  message: state.errorMessage!,
                  onRetry: () =>
                      ref.read(challengeNotifierProvider.notifier).refresh(),
                ),
              )
            else ...[
              // Hero challenge section.
              SliverToBoxAdapter(
                child: state.currentChallenge != null
                    ? _ActiveChallengeHero(challenge: state.currentChallenge!)
                    : _NoChallengeView(
                        upcomingChallenges: state.upcomingChallenges),
              ),

              // Upcoming challenges section.
              if (state.upcomingChallenges.isNotEmpty) ...[
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(20, 32, 20, 12),
                    child: Row(
                      children: [
                        Text(
                          context.l10n.upcomingChallenges,
                          style: AppTextStyles.heading3.copyWith(
                            color: theme.colorScheme.onSurface,
                          ),
                        ),
                        const Spacer(),
                        TextButton(
                          onPressed: () => context.push('/challenges/history'),
                          child: Text(
                            context.l10n.seeAll,
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
                        final upcoming = state.upcomingChallenges[index];
                        return Padding(
                          padding: const EdgeInsets.only(bottom: 12),
                          child: ChallengeCard(
                            challenge: upcoming,
                            onTap: () =>
                                context.push('/challenges/${upcoming.id}'),
                          ),
                        );
                      },
                      childCount: state.upcomingChallenges.length,
                    ),
                  ),
                ),
              ],

              // Bottom padding.
              const SliverToBoxAdapter(
                child: SizedBox(height: 100),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

// =============================================================================
// Active challenge hero section
// =============================================================================

class _ActiveChallengeHero extends StatelessWidget {
  final Challenge challenge;

  const _ActiveChallengeHero({required this.challenge});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 8, 20, 0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Challenge card with gradient background.
          Container(
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(24),
              gradient: const LinearGradient(
                colors: [AppColors.primary, Color(0xFFFF8F6B)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              boxShadow: [
                BoxShadow(
                  color: AppColors.primary.withValues(alpha: 0.3),
                  blurRadius: 20,
                  offset: const Offset(0, 8),
                ),
              ],
            ),
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Category + difficulty row.
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 12, vertical: 6),
                        decoration: BoxDecoration(
                          color: AppColors.white.withValues(alpha: 0.2),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Text(
                          challenge.category.toUpperCase(),
                          style: AppTextStyles.overline.copyWith(
                            color: AppColors.white,
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      _DifficultyChip(difficulty: challenge.difficulty),
                      const Spacer(),
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: AppColors.success.withValues(alpha: 0.2),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(
                            color: AppColors.success.withValues(alpha: 0.4),
                          ),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Container(
                              width: 6,
                              height: 6,
                              decoration: const BoxDecoration(
                                shape: BoxShape.circle,
                                color: AppColors.success,
                              ),
                            ),
                            const SizedBox(width: 4),
                            Text(
                              context.l10n.live,
                              style: AppTextStyles.overline.copyWith(
                                color: AppColors.success,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),

                  const SizedBox(height: 20),

                  // Title.
                  Text(
                    challenge.title,
                    style: AppTextStyles.heading1.copyWith(
                      color: AppColors.white,
                    ),
                    maxLines: 3,
                    overflow: TextOverflow.ellipsis,
                  ),

                  const SizedBox(height: 8),

                  // Description.
                  Text(
                    challenge.description,
                    style: AppTextStyles.bodyMedium.copyWith(
                      color: AppColors.white.withValues(alpha: 0.85),
                    ),
                    maxLines: 3,
                    overflow: TextOverflow.ellipsis,
                  ),

                  const SizedBox(height: 20),

                  // Countdown timer.
                  Center(
                    child: ChallengeCountdown(
                      targetTime: challenge.endsAt,
                      label: 'Ends in',
                      digitStyle: AppTextStyles.heading2,
                    ),
                  ),

                  const SizedBox(height: 16),

                  // Submission count badge.
                  Center(
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 14, vertical: 6),
                      decoration: BoxDecoration(
                        color: AppColors.white.withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(Icons.videocam_rounded,
                              size: 18, color: AppColors.white),
                          const SizedBox(width: 6),
                          Text(
                            context.l10n.entriesCount(challenge.submissionCount),
                            style: AppTextStyles.bodySmallBold.copyWith(
                              color: AppColors.white,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),

          const SizedBox(height: 20),

          // Record Now CTA button.
          SizedBox(
            height: 56,
            child: ElevatedButton(
              onPressed: () =>
                  context.push('/record', extra: {'challengeId': challenge.id}),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                foregroundColor: AppColors.white,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                ),
                elevation: 4,
                shadowColor: AppColors.primary.withValues(alpha: 0.4),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.fiber_manual_record, size: 20),
                  const SizedBox(width: 8),
                  Text(
                    'Record Now',
                    style: AppTextStyles.buttonLarge,
                  ),
                ],
              ),
            ),
          ),

          // Sponsor badge (if sponsored).
          if (challenge.isSponsored) ...[
            const SizedBox(height: 16),
            Center(
              child: SponsorBadge(
                sponsorName: challenge.sponsorName!,
                sponsorLogoUrl: challenge.sponsorLogoUrl,
              ),
            ),
          ],
        ],
      ),
    );
  }
}

// =============================================================================
// No active challenge view
// =============================================================================

class _NoChallengeView extends StatelessWidget {
  final List<Challenge> upcomingChallenges;

  const _NoChallengeView({required this.upcomingChallenges});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final nextChallenge =
        upcomingChallenges.isNotEmpty ? upcomingChallenges.first : null;

    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 40, 20, 0),
      child: Column(
        children: [
          // Icon.
          Container(
            width: 80,
            height: 80,
            decoration: BoxDecoration(
              color: AppColors.primary.withValues(alpha: 0.1),
              shape: BoxShape.circle,
            ),
            child: const Icon(
              Icons.timer_outlined,
              size: 40,
              color: AppColors.primary,
            ),
          ),

          const SizedBox(height: 24),

          Text(
            'No Active Challenge',
            style: AppTextStyles.heading2.copyWith(
              color: theme.colorScheme.onSurface,
            ),
          ),

          const SizedBox(height: 8),

          Text(
            nextChallenge != null
                ? 'The next challenge is almost here!'
                : 'Check back soon for the next challenge.',
            style: AppTextStyles.bodyMedium.copyWith(
              color: theme.colorScheme.onSurface.withValues(alpha: 0.6),
            ),
            textAlign: TextAlign.center,
          ),

          if (nextChallenge != null) ...[
            const SizedBox(height: 32),
            ChallengeCountdown(
              targetTime: nextChallenge.startsAt,
              label: 'Next challenge starts in',
            ),
            const SizedBox(height: 24),
            Text(
              nextChallenge.title,
              style: AppTextStyles.heading3.copyWith(
                color: theme.colorScheme.onSurface,
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ],
      ),
    );
  }
}

// =============================================================================
// Difficulty chip
// =============================================================================

class _DifficultyChip extends StatelessWidget {
  final String difficulty;

  const _DifficultyChip({required this.difficulty});

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
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: _color.withValues(alpha: 0.2),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(
        difficulty.toUpperCase(),
        style: AppTextStyles.overline.copyWith(color: _color),
      ),
    );
  }
}

// =============================================================================
// Error view
// =============================================================================

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
              Icons.cloud_off_rounded,
              size: 64,
              color: AppColors.error.withValues(alpha: 0.5),
            ),
            const SizedBox(height: 16),
            Text(
              'Something went wrong',
              style: AppTextStyles.heading3,
            ),
            const SizedBox(height: 8),
            Text(
              message,
              style: AppTextStyles.bodyMedium.copyWith(
                color: Theme.of(context)
                    .colorScheme
                    .onSurface
                    .withValues(alpha: 0.6),
              ),
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
