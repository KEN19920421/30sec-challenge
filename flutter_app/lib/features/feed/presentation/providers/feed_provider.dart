import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/network/api_client.dart';
import '../../../../core/network/api_response.dart';
import '../../../challenge/domain/submission.dart';
import '../../data/repositories/feed_repository_impl.dart';
import '../../domain/repositories/feed_repository.dart';

// =============================================================================
// Feed State
// =============================================================================

enum FeedStatus { initial, loading, loaded, error }

class FeedState {
  final FeedStatus status;
  final List<Submission> trending;
  final List<Submission> submissions;
  final bool hasMore;
  final int currentPage;
  final String? selectedCategory;
  final String? searchQuery;
  final String? errorMessage;

  const FeedState({
    this.status = FeedStatus.initial,
    this.trending = const [],
    this.submissions = const [],
    this.hasMore = true,
    this.currentPage = 0,
    this.selectedCategory,
    this.searchQuery,
    this.errorMessage,
  });

  bool get isLoading => status == FeedStatus.loading;

  FeedState copyWith({
    FeedStatus? status,
    List<Submission>? trending,
    List<Submission>? submissions,
    bool? hasMore,
    int? currentPage,
    String? selectedCategory,
    String? searchQuery,
    String? errorMessage,
  }) {
    return FeedState(
      status: status ?? this.status,
      trending: trending ?? this.trending,
      submissions: submissions ?? this.submissions,
      hasMore: hasMore ?? this.hasMore,
      currentPage: currentPage ?? this.currentPage,
      selectedCategory: selectedCategory ?? this.selectedCategory,
      searchQuery: searchQuery ?? this.searchQuery,
      errorMessage: errorMessage ?? this.errorMessage,
    );
  }
}

// =============================================================================
// Feed Notifier
// =============================================================================

class FeedNotifier extends StateNotifier<FeedState> {
  final FeedRepository _repository;

  FeedNotifier({required FeedRepository repository})
      : _repository = repository,
        super(const FeedState());

  /// Loads the initial feed: trending + first page of submissions.
  Future<void> loadFeed() async {
    state = state.copyWith(status: FeedStatus.loading);
    try {
      final results = await Future.wait([
        _repository.getTrending(),
        _repository.getSubmissions(
          page: 1,
          category: state.selectedCategory,
          search: state.searchQuery,
        ),
      ]);

      final trending = results[0] as List<Submission>;
      final page = results[1] as PaginatedResponse<Submission>;

      state = state.copyWith(
        status: FeedStatus.loaded,
        trending: trending,
        submissions: page.data,
        hasMore: page.hasNextPage,
        currentPage: 1,
      );
    } catch (e) {
      state = state.copyWith(
        status: FeedStatus.error,
        errorMessage: e.toString(),
      );
    }
  }

  /// Loads the next page of submissions.
  Future<void> loadMore() async {
    if (!state.hasMore || state.isLoading) return;
    try {
      final nextPage = state.currentPage + 1;
      final page = await _repository.getSubmissions(
        page: nextPage,
        category: state.selectedCategory,
        search: state.searchQuery,
      );
      state = state.copyWith(
        submissions: [...state.submissions, ...page.data],
        hasMore: page.hasNextPage,
        currentPage: nextPage,
      );
    } catch (_) {}
  }

  /// Sets a category filter and reloads.
  Future<void> setCategory(String? category) async {
    state = state.copyWith(selectedCategory: category, currentPage: 0);
    await loadFeed();
  }

  /// Sets a search query and reloads.
  Future<void> search(String? query) async {
    state = state.copyWith(searchQuery: query, currentPage: 0);
    await loadFeed();
  }
}

// =============================================================================
// Riverpod Providers
// =============================================================================

/// Provides the [FeedRepository] implementation.
final feedRepositoryProvider = Provider<FeedRepository>((ref) {
  return FeedRepositoryImpl(apiClient: ref.watch(apiClientProvider));
});

/// Provides the [FeedNotifier] state notifier.
final feedProvider =
    StateNotifierProvider<FeedNotifier, FeedState>((ref) {
  return FeedNotifier(repository: ref.watch(feedRepositoryProvider));
});

/// Available feed categories.
final feedCategoriesProvider = Provider<List<String>>((ref) {
  return const [
    'All',
    'Dance',
    'Comedy',
    'Music',
    'Art',
    'Food',
    'Sports',
    'Tech',
    'Fashion',
  ];
});
