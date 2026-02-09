import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../data/challenge_repository.dart';
import '../../domain/challenge.dart';
import '../../domain/submission.dart';

// =============================================================================
// Challenge state
// =============================================================================

/// Immutable state holder for the challenge feature.
class ChallengeState {
  final Challenge? currentChallenge;
  final List<Challenge> upcomingChallenges;
  final bool isLoading;
  final String? errorMessage;

  const ChallengeState({
    this.currentChallenge,
    this.upcomingChallenges = const [],
    this.isLoading = false,
    this.errorMessage,
  });

  ChallengeState copyWith({
    Challenge? currentChallenge,
    List<Challenge>? upcomingChallenges,
    bool? isLoading,
    String? errorMessage,
    bool clearError = false,
    bool clearChallenge = false,
  }) {
    return ChallengeState(
      currentChallenge:
          clearChallenge ? null : (currentChallenge ?? this.currentChallenge),
      upcomingChallenges: upcomingChallenges ?? this.upcomingChallenges,
      isLoading: isLoading ?? this.isLoading,
      errorMessage: clearError ? null : (errorMessage ?? this.errorMessage),
    );
  }
}

// =============================================================================
// Challenge notifier
// =============================================================================

/// Manages loading the current challenge and upcoming challenges.
///
/// Uses [ChallengeRepository] to fetch data from the API and exposes
/// the state via [ChallengeState].
class ChallengeNotifier extends StateNotifier<ChallengeState> {
  final ChallengeRepository _repository;
  Timer? _refreshTimer;

  ChallengeNotifier({required ChallengeRepository repository})
      : _repository = repository,
        super(const ChallengeState()) {
    loadAll();
    // Periodically refresh to catch challenge transitions.
    _refreshTimer = Timer.periodic(
      const Duration(minutes: 2),
      (_) => loadAll(),
    );
  }

  @override
  void dispose() {
    _refreshTimer?.cancel();
    super.dispose();
  }

  /// Loads both the current challenge and upcoming challenges.
  Future<void> loadAll() async {
    state = state.copyWith(isLoading: true, clearError: true);
    try {
      final results = await Future.wait([
        _repository.getCurrentChallenge(),
        _repository.getUpcoming(),
      ]);

      state = state.copyWith(
        currentChallenge: results[0] as Challenge?,
        upcomingChallenges: results[1] as List<Challenge>,
        isLoading: false,
        clearChallenge: results[0] == null,
      );
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        errorMessage: e.toString(),
      );
    }
  }

  /// Forces a refresh of all challenge data.
  Future<void> refresh() => loadAll();
}

// =============================================================================
// Challenge history state
// =============================================================================

class ChallengeHistoryState {
  final List<Challenge> challenges;
  final bool isLoading;
  final bool hasMore;
  final int currentPage;
  final String? selectedCategory;
  final String? errorMessage;

  const ChallengeHistoryState({
    this.challenges = const [],
    this.isLoading = false,
    this.hasMore = true,
    this.currentPage = 0,
    this.selectedCategory,
    this.errorMessage,
  });

  ChallengeHistoryState copyWith({
    List<Challenge>? challenges,
    bool? isLoading,
    bool? hasMore,
    int? currentPage,
    String? selectedCategory,
    String? errorMessage,
    bool clearError = false,
    bool clearCategory = false,
  }) {
    return ChallengeHistoryState(
      challenges: challenges ?? this.challenges,
      isLoading: isLoading ?? this.isLoading,
      hasMore: hasMore ?? this.hasMore,
      currentPage: currentPage ?? this.currentPage,
      selectedCategory:
          clearCategory ? null : (selectedCategory ?? this.selectedCategory),
      errorMessage: clearError ? null : (errorMessage ?? this.errorMessage),
    );
  }
}

/// Manages paginated loading of completed challenges.
class ChallengeHistoryNotifier extends StateNotifier<ChallengeHistoryState> {
  final ChallengeRepository _repository;

  ChallengeHistoryNotifier({required ChallengeRepository repository})
      : _repository = repository,
        super(const ChallengeHistoryState());

  /// Loads the first page (resets existing data).
  Future<void> loadInitial() async {
    state = state.copyWith(
      isLoading: true,
      clearError: true,
      challenges: [],
      currentPage: 0,
      hasMore: true,
    );
    await _loadPage(1);
  }

  /// Loads the next page of results (infinite scroll).
  Future<void> loadMore() async {
    if (state.isLoading || !state.hasMore) return;
    state = state.copyWith(isLoading: true);
    await _loadPage(state.currentPage + 1);
  }

  /// Sets a category filter and reloads from page 1.
  Future<void> setCategory(String? category) async {
    state = state.copyWith(
      selectedCategory: category,
      clearCategory: category == null,
      challenges: [],
      currentPage: 0,
      hasMore: true,
    );
    await _loadPage(1);
  }

  Future<void> _loadPage(int page) async {
    try {
      final response = await _repository.getHistory(
        page: page,
        category: state.selectedCategory,
      );

      final allChallenges = page == 1
          ? response.data
          : [...state.challenges, ...response.data];

      state = state.copyWith(
        challenges: allChallenges,
        isLoading: false,
        hasMore: response.hasNextPage,
        currentPage: page,
      );
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        errorMessage: e.toString(),
      );
    }
  }
}

// =============================================================================
// Challenge results state
// =============================================================================

class ChallengeResultsState {
  final String challengeId;
  final List<Submission> submissions;
  final bool isLoading;
  final bool hasMore;
  final int currentPage;
  final String? errorMessage;

  const ChallengeResultsState({
    required this.challengeId,
    this.submissions = const [],
    this.isLoading = false,
    this.hasMore = true,
    this.currentPage = 0,
    this.errorMessage,
  });

  ChallengeResultsState copyWith({
    List<Submission>? submissions,
    bool? isLoading,
    bool? hasMore,
    int? currentPage,
    String? errorMessage,
    bool clearError = false,
  }) {
    return ChallengeResultsState(
      challengeId: challengeId,
      submissions: submissions ?? this.submissions,
      isLoading: isLoading ?? this.isLoading,
      hasMore: hasMore ?? this.hasMore,
      currentPage: currentPage ?? this.currentPage,
      errorMessage: clearError ? null : (errorMessage ?? this.errorMessage),
    );
  }
}

/// Manages paginated loading of ranked submissions for a challenge.
class ChallengeResultsNotifier extends StateNotifier<ChallengeResultsState> {
  final ChallengeRepository _repository;

  ChallengeResultsNotifier({
    required ChallengeRepository repository,
    required String challengeId,
  })  : _repository = repository,
        super(ChallengeResultsState(challengeId: challengeId)) {
    loadInitial();
  }

  Future<void> loadInitial() async {
    state = state.copyWith(
      isLoading: true,
      clearError: true,
      submissions: [],
      currentPage: 0,
      hasMore: true,
    );
    await _loadPage(1);
  }

  Future<void> loadMore() async {
    if (state.isLoading || !state.hasMore) return;
    state = state.copyWith(isLoading: true);
    await _loadPage(state.currentPage + 1);
  }

  Future<void> _loadPage(int page) async {
    try {
      final response = await _repository.getResults(
        state.challengeId,
        page: page,
      );

      final all = page == 1
          ? response.data
          : [...state.submissions, ...response.data];

      state = state.copyWith(
        submissions: all,
        isLoading: false,
        hasMore: response.hasNextPage,
        currentPage: page,
      );
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        errorMessage: e.toString(),
      );
    }
  }
}

// =============================================================================
// Providers
// =============================================================================

/// Provides the main challenge state (current + upcoming).
final challengeNotifierProvider =
    StateNotifierProvider<ChallengeNotifier, ChallengeState>((ref) {
  final repository = ref.watch(challengeRepositoryProvider);
  return ChallengeNotifier(repository: repository);
});

/// Convenience accessor for the current active challenge.
final currentChallengeProvider = Provider<Challenge?>((ref) {
  return ref.watch(challengeNotifierProvider).currentChallenge;
});

/// Convenience accessor for upcoming challenges.
final upcomingChallengesProvider = Provider<List<Challenge>>((ref) {
  return ref.watch(challengeNotifierProvider).upcomingChallenges;
});

/// Provides the history state (paginated completed challenges).
final challengeHistoryProvider =
    StateNotifierProvider<ChallengeHistoryNotifier, ChallengeHistoryState>(
        (ref) {
  final repository = ref.watch(challengeRepositoryProvider);
  return ChallengeHistoryNotifier(repository: repository);
});

/// Provides challenge detail by ID.
final challengeDetailProvider =
    FutureProvider.family<Challenge, String>((ref, id) async {
  final repository = ref.watch(challengeRepositoryProvider);
  return repository.getById(id);
});

/// Provides ranked results for a specific challenge.
final challengeResultsProvider = StateNotifierProvider.family<
    ChallengeResultsNotifier, ChallengeResultsState, String>(
  (ref, challengeId) {
    final repository = ref.watch(challengeRepositoryProvider);
    return ChallengeResultsNotifier(
      repository: repository,
      challengeId: challengeId,
    );
  },
);
