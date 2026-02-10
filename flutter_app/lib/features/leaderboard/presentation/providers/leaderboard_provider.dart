import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../data/leaderboard_repository.dart';
import '../../domain/leaderboard_entry.dart';

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

/// Represents the current state of the leaderboard screen.
class LeaderboardState {
  final List<LeaderboardEntry> entries;
  final LeaderboardPeriod period;
  final UserRank? myRank;
  final bool isLoading;
  final bool isLoadingMore;
  final String? errorMessage;
  final int currentPage;
  final bool hasMorePages;
  final bool isFriendsTab;

  const LeaderboardState({
    this.entries = const [],
    this.period = LeaderboardPeriod.allTime,
    this.myRank,
    this.isLoading = false,
    this.isLoadingMore = false,
    this.errorMessage,
    this.currentPage = 1,
    this.hasMorePages = true,
    this.isFriendsTab = false,
  });

  /// Top 3 entries for the podium display.
  List<LeaderboardEntry> get topThree =>
      entries.where((e) => e.rank <= 3).toList()
        ..sort((a, b) => a.rank.compareTo(b.rank));

  /// Entries from rank 4 onwards for the scrollable list.
  List<LeaderboardEntry> get restEntries =>
      entries.where((e) => e.rank > 3).toList()
        ..sort((a, b) => a.rank.compareTo(b.rank));

  /// Whether the user has a rank in this challenge.
  bool get hasMyRank => myRank != null && myRank!.hasRank;

  LeaderboardState copyWith({
    List<LeaderboardEntry>? entries,
    LeaderboardPeriod? period,
    UserRank? myRank,
    bool? isLoading,
    bool? isLoadingMore,
    String? errorMessage,
    int? currentPage,
    bool? hasMorePages,
    bool? isFriendsTab,
  }) {
    return LeaderboardState(
      entries: entries ?? this.entries,
      period: period ?? this.period,
      myRank: myRank ?? this.myRank,
      isLoading: isLoading ?? this.isLoading,
      isLoadingMore: isLoadingMore ?? this.isLoadingMore,
      errorMessage: errorMessage,
      currentPage: currentPage ?? this.currentPage,
      hasMorePages: hasMorePages ?? this.hasMorePages,
      isFriendsTab: isFriendsTab ?? this.isFriendsTab,
    );
  }
}

// ---------------------------------------------------------------------------
// Notifier
// ---------------------------------------------------------------------------

/// Manages the leaderboard data and filtering.
///
/// Supports period switching (daily/weekly/all-time), pagination, friend
/// leaderboard, and the current user's rank.
class LeaderboardNotifier extends StateNotifier<LeaderboardState> {
  final LeaderboardRepository _repository;
  final String _challengeId;

  LeaderboardNotifier({
    required LeaderboardRepository repository,
    required String challengeId,
  })  : _repository = repository,
        _challengeId = challengeId,
        super(const LeaderboardState()) {
    loadLeaderboard();
    loadMyRank();
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /// Loads the leaderboard from scratch (page 1).
  Future<void> loadLeaderboard() async {
    state = state.copyWith(
      isLoading: true,
      errorMessage: null,
      currentPage: 1,
    );

    try {
      if (state.isFriendsTab) {
        await _loadFriendsLeaderboard(page: 1);
      } else {
        await _loadPeriodLeaderboard(page: 1);
      }
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        errorMessage: e.toString().replaceAll('Exception: ', ''),
      );
    }
  }

  /// Loads the next page of results.
  Future<void> loadNextPage() async {
    if (state.isLoadingMore || !state.hasMorePages) return;

    state = state.copyWith(isLoadingMore: true);
    final nextPage = state.currentPage + 1;

    try {
      if (state.isFriendsTab) {
        await _loadFriendsLeaderboard(page: nextPage, append: true);
      } else {
        await _loadPeriodLeaderboard(page: nextPage, append: true);
      }
    } catch (e) {
      state = state.copyWith(isLoadingMore: false);
    }
  }

  /// Changes the leaderboard time period and reloads.
  void changePeriod(LeaderboardPeriod period) {
    if (state.period == period && !state.isFriendsTab) return;

    state = state.copyWith(
      period: period,
      isFriendsTab: false,
      entries: [],
    );
    loadLeaderboard();
  }

  /// Switches to the friends leaderboard tab.
  void loadFriendsLeaderboard() {
    if (state.isFriendsTab) return;

    state = state.copyWith(
      isFriendsTab: true,
      entries: [],
    );
    loadLeaderboard();
  }

  /// Loads the current user's rank for this challenge.
  Future<void> loadMyRank() async {
    try {
      final rank = await _repository.getMyRank(challengeId: _challengeId);
      state = state.copyWith(myRank: rank);
    } catch (_) {
      // Silently fail -- not having a rank is a valid state.
    }
  }

  /// Refreshes all data (leaderboard + my rank).
  Future<void> refresh() async {
    await Future.wait([
      loadLeaderboard(),
      loadMyRank(),
    ]);
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  Future<void> _loadPeriodLeaderboard({
    required int page,
    bool append = false,
  }) async {
    final response = await _repository.getLeaderboard(
      challengeId: _challengeId,
      period: state.period,
      page: page,
    );

    final newEntries =
        append ? [...state.entries, ...response.data] : response.data;

    state = state.copyWith(
      entries: newEntries,
      isLoading: false,
      isLoadingMore: false,
      currentPage: page,
      hasMorePages: response.hasNextPage,
    );
  }

  Future<void> _loadFriendsLeaderboard({
    required int page,
    bool append = false,
  }) async {
    final response = await _repository.getFriendsLeaderboard(
      challengeId: _challengeId,
      page: page,
    );

    final newEntries =
        append ? [...state.entries, ...response.data] : response.data;

    state = state.copyWith(
      entries: newEntries,
      isLoading: false,
      isLoadingMore: false,
      currentPage: page,
      hasMorePages: response.hasNextPage,
    );
  }
}

// ---------------------------------------------------------------------------
// Riverpod providers
// ---------------------------------------------------------------------------

/// Provides a [LeaderboardNotifier] scoped to a specific challenge.
///
/// Usage: `ref.watch(leaderboardProvider('challenge_id'))`
final leaderboardProvider = StateNotifierProvider.family<LeaderboardNotifier,
    LeaderboardState, String>(
  (ref, challengeId) {
    final repository = ref.watch(leaderboardRepositoryProvider);
    return LeaderboardNotifier(
      repository: repository,
      challengeId: challengeId,
    );
  },
);

// ---------------------------------------------------------------------------
// Top Creators
// ---------------------------------------------------------------------------

enum TopCreatorsStatus { initial, loading, loaded, error }

class TopCreatorsState {
  final TopCreatorsStatus status;
  final List<TopCreator> creators;
  final LeaderboardPeriod period;
  final String? errorMessage;

  const TopCreatorsState({
    this.status = TopCreatorsStatus.initial,
    this.creators = const [],
    this.period = LeaderboardPeriod.weekly,
    this.errorMessage,
  });

  TopCreatorsState copyWith({
    TopCreatorsStatus? status,
    List<TopCreator>? creators,
    LeaderboardPeriod? period,
    String? errorMessage,
  }) {
    return TopCreatorsState(
      status: status ?? this.status,
      creators: creators ?? this.creators,
      period: period ?? this.period,
      errorMessage: errorMessage,
    );
  }
}

class TopCreatorsNotifier extends StateNotifier<TopCreatorsState> {
  final LeaderboardRepository _repository;

  TopCreatorsNotifier({required LeaderboardRepository repository})
      : _repository = repository,
        super(const TopCreatorsState()) {
    load();
  }

  Future<void> load() async {
    state = state.copyWith(status: TopCreatorsStatus.loading, errorMessage: null);
    try {
      final creators = await _repository.getTopCreators(
        period: state.period,
        limit: 20,
      );
      state = state.copyWith(
        status: TopCreatorsStatus.loaded,
        creators: creators,
      );
    } catch (e) {
      state = state.copyWith(
        status: TopCreatorsStatus.error,
        errorMessage: e.toString().replaceAll('Exception: ', ''),
      );
    }
  }

  void changePeriod(LeaderboardPeriod period) {
    if (state.period == period) return;
    state = state.copyWith(period: period, creators: []);
    load();
  }
}

final topCreatorsProvider =
    StateNotifierProvider<TopCreatorsNotifier, TopCreatorsState>((ref) {
  final repository = ref.watch(leaderboardRepositoryProvider);
  return TopCreatorsNotifier(repository: repository);
});
