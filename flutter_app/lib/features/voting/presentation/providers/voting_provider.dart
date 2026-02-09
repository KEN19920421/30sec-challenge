import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:video_player/video_player.dart';

import '../../../challenge/domain/submission.dart';
import '../../data/voting_repository.dart';
import '../../domain/vote.dart';

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

/// Represents the current state of the voting screen.
sealed class VotingState {
  const VotingState();
}

/// Initial loading state while fetching the vote queue.
class VotingLoading extends VotingState {
  const VotingLoading();
}

/// Ready state with submissions to vote on.
class VotingReady extends VotingState {
  final List<Submission> submissions;
  final int currentIndex;
  final SuperVoteBalance superVoteBalance;
  final int votesCastCount;
  final bool isVoting;
  final bool showAdCard;

  const VotingReady({
    required this.submissions,
    required this.currentIndex,
    required this.superVoteBalance,
    this.votesCastCount = 0,
    this.isVoting = false,
    this.showAdCard = false,
  });

  /// The submission currently displayed to the user.
  Submission? get currentSubmission =>
      currentIndex < submissions.length ? submissions[currentIndex] : null;

  /// The next submission for pre-buffering.
  Submission? get nextSubmission =>
      currentIndex + 1 < submissions.length
          ? submissions[currentIndex + 1]
          : null;

  /// The submission after next for pre-buffering.
  Submission? get nextNextSubmission =>
      currentIndex + 2 < submissions.length
          ? submissions[currentIndex + 2]
          : null;

  /// Whether we have exhausted all submissions in the queue.
  bool get isQueueExhausted => currentIndex >= submissions.length;

  /// Whether the ad card should show (every 5 votes for free users).
  bool get shouldShowAd => votesCastCount > 0 && votesCastCount % 5 == 0;

  /// Remaining submissions in the queue.
  int get remainingCount =>
      (submissions.length - currentIndex).clamp(0, submissions.length);

  VotingReady copyWith({
    List<Submission>? submissions,
    int? currentIndex,
    SuperVoteBalance? superVoteBalance,
    int? votesCastCount,
    bool? isVoting,
    bool? showAdCard,
  }) {
    return VotingReady(
      submissions: submissions ?? this.submissions,
      currentIndex: currentIndex ?? this.currentIndex,
      superVoteBalance: superVoteBalance ?? this.superVoteBalance,
      votesCastCount: votesCastCount ?? this.votesCastCount,
      isVoting: isVoting ?? this.isVoting,
      showAdCard: showAdCard ?? this.showAdCard,
    );
  }
}

/// Error state with a message and retry capability.
class VotingError extends VotingState {
  final String message;

  const VotingError({required this.message});
}

/// Queue is completely exhausted -- no more submissions to vote on.
class VotingExhausted extends VotingState {
  final int totalVotesCast;

  const VotingExhausted({required this.totalVotesCast});
}

// ---------------------------------------------------------------------------
// Notifier
// ---------------------------------------------------------------------------

/// Manages the voting flow: loading the queue, casting votes, tracking state.
///
/// Pre-buffers the next 2 videos for smooth transitions. Tracks vote count
/// for ad insertion logic (every 5 votes for free users).
class VotingNotifier extends StateNotifier<VotingState> {
  final VotingRepository _repository;
  final String _challengeId;

  /// Video controllers for pre-buffering. Keyed by submission ID.
  final Map<String, VideoPlayerController> _videoControllers = {};

  /// Total votes cast across the session.
  int _totalVotesCast = 0;

  VotingNotifier({
    required VotingRepository repository,
    required String challengeId,
  })  : _repository = repository,
        _challengeId = challengeId,
        super(const VotingLoading()) {
    loadQueue();
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /// Loads the initial vote queue and super vote balance.
  Future<void> loadQueue() async {
    state = const VotingLoading();

    try {
      final results = await Future.wait([
        _repository.getVoteQueue(challengeId: _challengeId),
        _repository.getSuperVoteBalance(),
      ]);

      final submissions = results[0] as List<Submission>;
      final balance = results[1] as SuperVoteBalance;

      if (submissions.isEmpty) {
        state = VotingExhausted(totalVotesCast: _totalVotesCast);
        return;
      }

      state = VotingReady(
        submissions: submissions,
        currentIndex: 0,
        superVoteBalance: balance,
        votesCastCount: _totalVotesCast,
      );

      // Pre-buffer the first video and the next one.
      _preBufferVideos();
    } catch (e) {
      state = VotingError(
        message: e.toString().replaceAll('Exception: ', ''),
      );
    }
  }

  /// Swipe right = upvote (+1).
  Future<void> swipeRight() async {
    await _castVote(value: 1);
  }

  /// Swipe left = downvote (-1).
  Future<void> swipeLeft() async {
    await _castVote(value: -1);
  }

  /// Cast a super vote on the current submission.
  ///
  /// Super votes count 3x in rankings. Requires available balance.
  Future<void> superVote() async {
    final currentState = state;
    if (currentState is! VotingReady) return;

    if (!currentState.superVoteBalance.hasRemaining) return;

    await _castVote(value: 1, isSuperVote: true);
  }

  /// Skip the current submission without voting. Advances to next.
  void skipToNext() {
    final currentState = state;
    if (currentState is! VotingReady) return;

    _advanceToNext(currentState);
  }

  /// Gets or creates a [VideoPlayerController] for a given submission.
  ///
  /// Returns null if the submission has no video URL.
  VideoPlayerController? getController(Submission submission) {
    final url = submission.hlsUrl ?? submission.videoUrl;
    if (url == null) return null;
    return _videoControllers[submission.id];
  }

  /// Initializes a video controller for a submission and begins buffering.
  Future<VideoPlayerController?> initializeController(
      Submission submission) async {
    final url = submission.hlsUrl ?? submission.videoUrl;
    if (url == null) return null;

    // Return existing controller if already initialized.
    if (_videoControllers.containsKey(submission.id)) {
      return _videoControllers[submission.id];
    }

    final controller = VideoPlayerController.networkUrl(
      Uri.parse(url),
      videoPlayerOptions: VideoPlayerOptions(mixWithOthers: true),
    );

    _videoControllers[submission.id] = controller;

    try {
      await controller.initialize();
      controller.setLooping(true);
      controller.setVolume(0.0); // Muted by default.
    } catch (_) {
      // Silently handle initialization failures -- the UI shows a fallback.
    }

    return controller;
  }

  /// Disposes a specific controller for a submission that scrolled off.
  void disposeController(String submissionId) {
    final controller = _videoControllers.remove(submissionId);
    controller?.dispose();
  }

  @override
  void dispose() {
    _disposeAllControllers();
    super.dispose();
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  Future<void> _castVote({
    required int value,
    bool isSuperVote = false,
  }) async {
    final currentState = state;
    if (currentState is! VotingReady) return;
    if (currentState.isVoting) return;

    final submission = currentState.currentSubmission;
    if (submission == null) return;

    // Mark as voting to prevent double-taps.
    state = currentState.copyWith(isVoting: true);

    try {
      await _repository.castVote(
        submissionId: submission.id,
        value: value,
        isSuperVote: isSuperVote,
      );

      _totalVotesCast++;

      // Decrement super vote balance if used.
      final newBalance = isSuperVote
          ? currentState.superVoteBalance.copyWith(
              remaining: currentState.superVoteBalance.remaining - 1,
            )
          : currentState.superVoteBalance;

      final updatedState = currentState.copyWith(
        superVoteBalance: newBalance,
        votesCastCount: _totalVotesCast,
        isVoting: false,
        showAdCard: _totalVotesCast % 5 == 0,
      );

      state = updatedState;

      // If ad card is shown, wait for it to be dismissed. Otherwise advance.
      if (!updatedState.showAdCard) {
        _advanceToNext(updatedState);
      }
    } catch (e) {
      // Revert to non-voting state so the user can retry.
      state = currentState.copyWith(isVoting: false);
    }
  }

  /// Advances to the next submission in the queue.
  void _advanceToNext(VotingReady currentState) {
    final nextIndex = currentState.currentIndex + 1;

    // Dispose the controller for the submission that just scrolled off.
    final previousSubmission = currentState.currentSubmission;
    if (previousSubmission != null) {
      disposeController(previousSubmission.id);
    }

    if (nextIndex >= currentState.submissions.length) {
      // Queue is exhausted. Try to fetch more.
      _fetchMoreOrExhaust(currentState);
      return;
    }

    state = currentState.copyWith(
      currentIndex: nextIndex,
      isVoting: false,
      showAdCard: false,
    );

    _preBufferVideos();
  }

  /// Attempts to load more submissions when the current queue runs out.
  Future<void> _fetchMoreOrExhaust(VotingReady currentState) async {
    try {
      final moreSubmissions = await _repository.getVoteQueue(
        challengeId: _challengeId,
      );

      if (moreSubmissions.isEmpty) {
        state = VotingExhausted(totalVotesCast: _totalVotesCast);
        return;
      }

      state = VotingReady(
        submissions: moreSubmissions,
        currentIndex: 0,
        superVoteBalance: currentState.superVoteBalance,
        votesCastCount: _totalVotesCast,
      );

      _preBufferVideos();
    } catch (_) {
      state = VotingExhausted(totalVotesCast: _totalVotesCast);
    }
  }

  /// Pre-buffers video controllers for the current, next, and next-next
  /// submissions for smooth playback transitions.
  void _preBufferVideos() {
    final currentState = state;
    if (currentState is! VotingReady) return;

    final current = currentState.currentSubmission;
    final next = currentState.nextSubmission;
    final nextNext = currentState.nextNextSubmission;

    if (current != null) initializeController(current);
    if (next != null) initializeController(next);
    if (nextNext != null) initializeController(nextNext);
  }

  /// Disposes all active video controllers.
  void _disposeAllControllers() {
    for (final controller in _videoControllers.values) {
      controller.dispose();
    }
    _videoControllers.clear();
  }

  /// Dismiss the ad card and advance to the next submission.
  void dismissAdCard() {
    final currentState = state;
    if (currentState is! VotingReady) return;

    final updated = currentState.copyWith(showAdCard: false);
    _advanceToNext(updated);
  }

  /// Refresh the super vote balance (e.g. after watching a rewarded ad).
  Future<void> refreshSuperVoteBalance() async {
    final currentState = state;
    if (currentState is! VotingReady) return;

    try {
      final balance = await _repository.getSuperVoteBalance();
      state = currentState.copyWith(superVoteBalance: balance);
    } catch (_) {
      // Silently fail -- balance will refresh on next action.
    }
  }
}

// ---------------------------------------------------------------------------
// Riverpod providers
// ---------------------------------------------------------------------------

/// Provides a [VotingNotifier] scoped to a specific challenge.
///
/// Usage: `ref.watch(votingProvider('challenge_id'))`
final votingProvider =
    StateNotifierProvider.family<VotingNotifier, VotingState, String>(
  (ref, challengeId) {
    final repository = ref.watch(votingRepositoryProvider);
    return VotingNotifier(
      repository: repository,
      challengeId: challengeId,
    );
  },
);
