import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../data/repositories/league_repository_impl.dart';
import '../../domain/entities/league_membership.dart';

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

/// Represents the current state of the league screen.
class LeagueState {
  final LeagueMembership? myMembership;
  final List<LeagueMembership> tierRankings;
  final bool isLoading;
  final bool isLoadingMore;
  final String? errorMessage;
  final int currentPage;
  final bool hasMore;

  const LeagueState({
    this.myMembership,
    this.tierRankings = const [],
    this.isLoading = false,
    this.isLoadingMore = false,
    this.errorMessage,
    this.currentPage = 1,
    this.hasMore = true,
  });

  LeagueState copyWith({
    LeagueMembership? myMembership,
    List<LeagueMembership>? tierRankings,
    bool? isLoading,
    bool? isLoadingMore,
    String? errorMessage,
    int? currentPage,
    bool? hasMore,
  }) {
    return LeagueState(
      myMembership: myMembership ?? this.myMembership,
      tierRankings: tierRankings ?? this.tierRankings,
      isLoading: isLoading ?? this.isLoading,
      isLoadingMore: isLoadingMore ?? this.isLoadingMore,
      errorMessage: errorMessage,
      currentPage: currentPage ?? this.currentPage,
      hasMore: hasMore ?? this.hasMore,
    );
  }
}

// ---------------------------------------------------------------------------
// Notifier
// ---------------------------------------------------------------------------

/// Manages league data: the user's membership and tier rankings.
class LeagueNotifier extends StateNotifier<LeagueState> {
  final LeagueRepository _repository;

  LeagueNotifier(this._repository) : super(const LeagueState());

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /// Loads the current user's membership then fetches tier rankings from page 1.
  Future<void> loadMyLeague() async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      final membership = await _repository.getMyLeague();
      final rankings = await _repository.getTierRankings(
        tier: membership.tier.name,
      );
      state = state.copyWith(
        isLoading: false,
        myMembership: membership,
        tierRankings: rankings.data,
        hasMore: rankings.hasNextPage,
        currentPage: 1,
      );
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        errorMessage: e.toString().replaceAll('Exception: ', ''),
      );
    }
  }

  /// Loads the next page of tier rankings and appends to the existing list.
  Future<void> loadMore() async {
    if (state.isLoadingMore || !state.hasMore || state.myMembership == null) {
      return;
    }
    state = state.copyWith(isLoadingMore: true);
    try {
      final nextPage = state.currentPage + 1;
      final result = await _repository.getTierRankings(
        tier: state.myMembership!.tier.name,
        page: nextPage,
      );
      state = state.copyWith(
        isLoadingMore: false,
        tierRankings: [...state.tierRankings, ...result.data],
        currentPage: nextPage,
        hasMore: result.hasNextPage,
      );
    } catch (e) {
      state = state.copyWith(isLoadingMore: false);
    }
  }
}

// ---------------------------------------------------------------------------
// Riverpod provider
// ---------------------------------------------------------------------------

/// Provides a [LeagueNotifier] for the league screen.
final leagueProvider = StateNotifierProvider<LeagueNotifier, LeagueState>((ref) {
  final repository = ref.watch(leagueRepositoryProvider);
  return LeagueNotifier(repository);
});
