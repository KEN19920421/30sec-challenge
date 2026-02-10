import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_mobile_ads/google_mobile_ads.dart';

import '../../../../core/constants/ad_constants.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../l10n/l10n.dart';
import '../../../challenge/domain/submission.dart';
import '../providers/voting_provider.dart';
import '../widgets/rewarded_ad_prompt.dart';
import '../widgets/swipe_card.dart';
import '../widgets/video_vote_player.dart';
import '../widgets/vote_buttons.dart';

/// Full-screen Tinder-like swipe voting screen.
///
/// Features:
/// - Stack of video cards (current + next for smooth transitions).
/// - Auto-playing video that fills the screen.
/// - Swipe right = upvote, swipe left = downvote.
/// - Bottom bar with downvote, super vote, and upvote buttons.
/// - Top bar with challenge title, close button, and remaining count.
/// - User info overlay at bottom (avatar, username, caption).
/// - Super vote with rewarded ad for free users.
/// - Native ad card inserted every 5 votes (free users).
/// - Empty state when the queue is exhausted.
class VotingScreen extends ConsumerStatefulWidget {
  final String challengeId;
  final String challengeTitle;

  const VotingScreen({
    super.key,
    required this.challengeId,
    this.challengeTitle = 'Vote',
  });

  @override
  ConsumerState<VotingScreen> createState() => _VotingScreenState();
}

class _VotingScreenState extends ConsumerState<VotingScreen> {
  final GlobalKey<SwipeCardState> _swipeCardKey = GlobalKey();
  NativeAd? _nativeAd;
  bool _nativeAdLoaded = false;

  @override
  void dispose() {
    _nativeAd?.dispose();
    super.dispose();
  }

  // ---------------------------------------------------------------------------
  // Ad helpers
  // ---------------------------------------------------------------------------

  void _loadNativeAd() {
    _nativeAd?.dispose();
    _nativeAd = NativeAd(
      adUnitId: AdConstants.nativeId,
      request: const AdRequest(),
      listener: NativeAdListener(
        onAdLoaded: (ad) {
          if (mounted) {
            setState(() => _nativeAdLoaded = true);
          }
        },
        onAdFailedToLoad: (ad, error) {
          ad.dispose();
          if (mounted) {
            setState(() => _nativeAdLoaded = false);
          }
        },
      ),
      nativeTemplateStyle: NativeTemplateStyle(
        templateType: TemplateType.medium,
        mainBackgroundColor: AppColors.lightSurface,
        callToActionTextStyle: NativeTemplateTextStyle(
          textColor: AppColors.white,
          backgroundColor: AppColors.primary,
          style: NativeTemplateFontStyle.bold,
          size: 16,
        ),
      ),
    )..load();
  }

  void _handleSuperVoteTap(VotingReady state) async {
    if (state.superVoteBalance.hasRemaining) {
      // Has super votes -- use directly.
      ref.read(votingProvider(widget.challengeId).notifier).superVote();
      return;
    }

    // No super votes -- prompt for rewarded ad.
    final earned = await RewardedAdPrompt.show(context, isProUser: false);

    if (earned && mounted) {
      // Refresh balance and cast super vote.
      final notifier =
          ref.read(votingProvider(widget.challengeId).notifier);
      await notifier.refreshSuperVoteBalance();
      notifier.superVote();
    }
  }

  // ---------------------------------------------------------------------------
  // Build
  // ---------------------------------------------------------------------------

  @override
  Widget build(BuildContext context) {
    final votingState = ref.watch(votingProvider(widget.challengeId));

    // Set system UI for immersive full-screen.
    SystemChrome.setSystemUIOverlayStyle(
      const SystemUiOverlayStyle(
        statusBarBrightness: Brightness.dark,
        statusBarIconBrightness: Brightness.light,
      ),
    );

    return Scaffold(
      backgroundColor: AppColors.black,
      body: switch (votingState) {
        VotingLoading() => _buildLoading(),
        final VotingReady state => _buildReady(state),
        final VotingError state => _buildError(state),
        final VotingExhausted state => _buildExhausted(state),
      },
    );
  }

  // ---------------------------------------------------------------------------
  // Loading state
  // ---------------------------------------------------------------------------

  Widget _buildLoading() {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const CircularProgressIndicator(color: AppColors.primary),
          const SizedBox(height: 16),
          Text(
            context.l10n.loadingSubmissions,
            style: const TextStyle(color: AppColors.white, fontSize: 16),
          ),
        ],
      ),
    );
  }

  // ---------------------------------------------------------------------------
  // Error state
  // ---------------------------------------------------------------------------

  Widget _buildError(VotingError state) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(
              Icons.error_outline_rounded,
              color: AppColors.error,
              size: 56,
            ),
            const SizedBox(height: 16),
            Text(
              context.l10n.somethingWentWrong,
              style: AppTextStyles.heading3.copyWith(color: AppColors.white),
            ),
            const SizedBox(height: 8),
            Text(
              state.message,
              style: AppTextStyles.bodyMedium.copyWith(
                color: AppColors.white.withValues(alpha: 0.7),
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 24),
            ElevatedButton.icon(
              onPressed: () {
                ref
                    .read(votingProvider(widget.challengeId).notifier)
                    .loadQueue();
              },
              icon: const Icon(Icons.refresh_rounded),
              label: Text(context.l10n.tryAgain),
            ),
          ],
        ),
      ),
    );
  }

  // ---------------------------------------------------------------------------
  // Exhausted state (no more submissions)
  // ---------------------------------------------------------------------------

  Widget _buildExhausted(VotingExhausted state) {
    return SafeArea(
      child: Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 80,
                height: 80,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: AppColors.primary.withValues(alpha: 0.15),
                ),
                child: const Icon(
                  Icons.check_circle_rounded,
                  color: AppColors.primary,
                  size: 48,
                ),
              ),
              const SizedBox(height: 24),
              Text(
                context.l10n.allEntriesVoted,
                style: AppTextStyles.heading3.copyWith(color: AppColors.white),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 8),
              Text(
                context.l10n.comeBackLaterForVotes,
                style: AppTextStyles.bodyMedium.copyWith(
                  color: AppColors.white.withValues(alpha: 0.7),
                ),
                textAlign: TextAlign.center,
              ),
              if (state.totalVotesCast > 0) ...[
                const SizedBox(height: 16),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  decoration: BoxDecoration(
                    color: AppColors.primary.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(
                    '${state.totalVotesCast} votes cast this session',
                    style: AppTextStyles.bodyMediumBold.copyWith(
                      color: AppColors.primary,
                    ),
                  ),
                ),
              ],
              const SizedBox(height: 32),
              OutlinedButton.icon(
                onPressed: () => Navigator.of(context).pop(),
                icon: const Icon(Icons.arrow_back_rounded),
                label: Text(context.l10n.goBack),
                style: OutlinedButton.styleFrom(
                  foregroundColor: AppColors.white,
                  side: const BorderSide(color: AppColors.white, width: 1.5),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // ---------------------------------------------------------------------------
  // Ready state (main voting UI)
  // ---------------------------------------------------------------------------

  Widget _buildReady(VotingReady state) {
    final submission = state.currentSubmission;

    // Show ad card if triggered.
    if (state.showAdCard) {
      if (!_nativeAdLoaded) _loadNativeAd();
      return _buildAdCard(state);
    }

    if (submission == null) {
      return _buildExhausted(VotingExhausted(totalVotesCast: state.votesCastCount));
    }

    return Stack(
      fit: StackFit.expand,
      children: [
        // Background next card (visible during swipe).
        if (state.nextSubmission != null) _buildBackgroundCard(state),

        // Main swipeable card.
        _buildSwipeableCard(submission, state),

        // Top bar overlay.
        _buildTopBar(state),

        // Bottom area: user info + vote buttons.
        _buildBottomArea(submission, state),
      ],
    );
  }

  Widget _buildBackgroundCard(VotingReady state) {
    final nextSubmission = state.nextSubmission!;
    final notifier = ref.read(votingProvider(widget.challengeId).notifier);
    final controller = notifier.getController(nextSubmission);

    return Positioned.fill(
      child: ClipRRect(
        borderRadius: BorderRadius.circular(16),
        child: Transform.scale(
          scale: 0.92,
          child: VideoVotePlayer(
            controller: controller,
            autoPlay: false,
          ),
        ),
      ),
    );
  }

  Widget _buildSwipeableCard(Submission submission, VotingReady state) {
    final notifier = ref.read(votingProvider(widget.challengeId).notifier);
    final controller = notifier.getController(submission);

    return Positioned.fill(
      child: SwipeCard(
        key: _swipeCardKey,
        enabled: !state.isVoting,
        onSwipeCompleted: (direction) {
          if (direction == SwipeDirection.right) {
            notifier.swipeRight();
          } else {
            notifier.swipeLeft();
          }
        },
        child: Stack(
          fit: StackFit.expand,
          children: [
            // Video player.
            VideoVotePlayer(
              controller: controller,
              autoPlay: true,
            ),

            // Dark gradient overlay at bottom for text readability.
            const Positioned(
              left: 0,
              right: 0,
              bottom: 0,
              height: 200,
              child: DecoratedBox(
                decoration: BoxDecoration(
                  gradient: AppColors.darkOverlayGradient,
                  borderRadius: BorderRadius.only(
                    bottomLeft: Radius.circular(16),
                    bottomRight: Radius.circular(16),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ---------------------------------------------------------------------------
  // Top bar
  // ---------------------------------------------------------------------------

  Widget _buildTopBar(VotingReady state) {
    return Positioned(
      top: 0,
      left: 0,
      right: 0,
      child: SafeArea(
        bottom: false,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          child: Row(
            children: [
              // Close button.
              _CircleButton(
                icon: Icons.close_rounded,
                onTap: () => Navigator.of(context).pop(),
              ),
              const SizedBox(width: 12),

              // Challenge title.
              Expanded(
                child: Text(
                  widget.challengeTitle,
                  style: AppTextStyles.heading4.copyWith(
                    color: AppColors.white,
                    shadows: [
                      Shadow(
                        color: AppColors.black.withValues(alpha: 0.5),
                        blurRadius: 8,
                      ),
                    ],
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  textAlign: TextAlign.center,
                ),
              ),
              const SizedBox(width: 12),

              // Remaining count.
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  color: AppColors.black.withValues(alpha: 0.45),
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Text(
                  '${state.remainingCount} left',
                  style: AppTextStyles.bodySmallBold.copyWith(
                    color: AppColors.white,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // ---------------------------------------------------------------------------
  // Bottom area (user info + buttons)
  // ---------------------------------------------------------------------------

  Widget _buildBottomArea(Submission submission, VotingReady state) {
    return Positioned(
      left: 0,
      right: 0,
      bottom: 0,
      child: SafeArea(
        top: false,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // User info.
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: _UserInfoOverlay(submission: submission),
            ),
            const SizedBox(height: 16),

            // Vote buttons.
            VoteButtons(
              onDownvote: state.isVoting
                  ? null
                  : () =>
                      _swipeCardKey.currentState?.animateSwipe(SwipeDirection.left),
              onUpvote: state.isVoting
                  ? null
                  : () => _swipeCardKey.currentState
                      ?.animateSwipe(SwipeDirection.right),
              onSuperVote:
                  state.isVoting ? null : () => _handleSuperVoteTap(state),
              superVoteCount: state.superVoteBalance.remaining,
              enabled: !state.isVoting,
            ),
            const SizedBox(height: 8),
          ],
        ),
      ),
    );
  }

  // ---------------------------------------------------------------------------
  // Ad card
  // ---------------------------------------------------------------------------

  Widget _buildAdCard(VotingReady state) {
    return SafeArea(
      child: Column(
        children: [
          // Top bar during ad.
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Row(
              children: [
                _CircleButton(
                  icon: Icons.close_rounded,
                  onTap: () => Navigator.of(context).pop(),
                ),
                const Spacer(),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: AppColors.white.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Text(
                    '${state.votesCastCount} votes cast',
                    style: AppTextStyles.bodySmallBold.copyWith(
                      color: AppColors.white,
                    ),
                  ),
                ),
              ],
            ),
          ),

          const Spacer(),

          // Ad content.
          if (_nativeAdLoaded && _nativeAd != null)
            Container(
              margin: const EdgeInsets.symmetric(horizontal: 16),
              height: 320,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(16),
                color: AppColors.lightSurface,
              ),
              clipBehavior: Clip.antiAlias,
              child: AdWidget(ad: _nativeAd!),
            )
          else
            Container(
              margin: const EdgeInsets.symmetric(horizontal: 16),
              height: 320,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(16),
                color: AppColors.darkSurfaceVariant,
              ),
              child: const Center(
                child: CircularProgressIndicator(color: AppColors.primary),
              ),
            ),

          const SizedBox(height: 24),

          // Continue button.
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 32),
            child: SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: () {
                  _nativeAd?.dispose();
                  _nativeAd = null;
                  _nativeAdLoaded = false;
                  ref
                      .read(votingProvider(widget.challengeId).notifier)
                      .dismissAdCard();
                },
                child: Text(context.l10n.continueVoting),
              ),
            ),
          ),

          const Spacer(),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// User info overlay
// ---------------------------------------------------------------------------

class _UserInfoOverlay extends StatelessWidget {
  final Submission submission;

  const _UserInfoOverlay({required this.submission});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        // Avatar.
        CircleAvatar(
          radius: 20,
          backgroundColor: AppColors.primary.withValues(alpha: 0.3),
          backgroundImage: submission.avatarUrl != null
              ? CachedNetworkImageProvider(submission.avatarUrl!)
              : null,
          child: submission.avatarUrl == null
              ? Text(
                  submission.displayNameOrUsername[0].toUpperCase(),
                  style: AppTextStyles.bodyLargeBold.copyWith(
                    color: AppColors.white,
                  ),
                )
              : null,
        ),
        const SizedBox(width: 12),

        // Username and caption.
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                '@${submission.username ?? 'user'}',
                style: AppTextStyles.bodyMediumBold.copyWith(
                  color: AppColors.white,
                  shadows: [
                    Shadow(
                      color: AppColors.black.withValues(alpha: 0.5),
                      blurRadius: 4,
                    ),
                  ],
                ),
              ),
              if (submission.caption != null &&
                  submission.caption!.isNotEmpty) ...[
                const SizedBox(height: 2),
                Text(
                  submission.caption!,
                  style: AppTextStyles.bodySmall.copyWith(
                    color: AppColors.white.withValues(alpha: 0.9),
                    shadows: [
                      Shadow(
                        color: AppColors.black.withValues(alpha: 0.5),
                        blurRadius: 4,
                      ),
                    ],
                  ),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ],
          ),
        ),
      ],
    );
  }
}

// ---------------------------------------------------------------------------
// Circle button helper
// ---------------------------------------------------------------------------

class _CircleButton extends StatelessWidget {
  final IconData icon;
  final VoidCallback onTap;

  const _CircleButton({required this.icon, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () {
        HapticFeedback.lightImpact();
        onTap();
      },
      child: Container(
        width: 40,
        height: 40,
        decoration: BoxDecoration(
          color: AppColors.black.withValues(alpha: 0.45),
          shape: BoxShape.circle,
        ),
        child: Icon(
          icon,
          color: AppColors.white,
          size: 22,
        ),
      ),
    );
  }
}
