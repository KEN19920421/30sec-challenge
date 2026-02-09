import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/network/api_client.dart';
import '../../../../core/network/api_response.dart';
import '../../../challenge/domain/submission.dart';

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
  final ApiClient _apiClient;

  FeedNotifier({required ApiClient apiClient})
      : _apiClient = apiClient,
        super(const FeedState());

  /// Loads the initial feed: trending + first page of submissions.
  Future<void> loadFeed() async {
    state = state.copyWith(status: FeedStatus.loading);
    try {
      final results = await Future.wait([
        _fetchTrending(),
        _fetchSubmissions(page: 1),
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
      final page = await _fetchSubmissions(page: nextPage);
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

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  Future<List<Submission>> _fetchTrending() async {
    final response = await _apiClient.get<Map<String, dynamic>>(
      '/api/v1/feed/trending',
      queryParameters: {'limit': 10},
    );
    final body = response.data;
    if (body == null) return [];
    final list = body['data'] as List<dynamic>? ?? [];
    return list
        .map((item) => Submission.fromJson(item as Map<String, dynamic>))
        .toList();
  }

  Future<PaginatedResponse<Submission>> _fetchSubmissions({
    int page = 1,
  }) async {
    final queryParams = <String, dynamic>{
      'page': page,
      'limit': 20,
    };
    if (state.selectedCategory != null) {
      queryParams['category'] = state.selectedCategory;
    }
    if (state.searchQuery != null && state.searchQuery!.isNotEmpty) {
      queryParams['search'] = state.searchQuery;
    }

    final response = await _apiClient.get<Map<String, dynamic>>(
      '/api/v1/feed/for-you',
      queryParameters: queryParams,
    );
    final body = response.data;
    if (body == null) {
      return const PaginatedResponse<Submission>(
        data: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 1,
      );
    }
    return PaginatedResponse<Submission>.fromJson(
      body,
      (json) => Submission.fromJson(json),
    );
  }
}

// =============================================================================
// Riverpod Providers
// =============================================================================

final feedProvider =
    StateNotifierProvider<FeedNotifier, FeedState>((ref) {
  return FeedNotifier(apiClient: ref.watch(apiClientProvider));
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
