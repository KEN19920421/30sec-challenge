import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/network/api_client.dart';
import '../../../challenge/domain/submission.dart';

// =============================================================================
// Discover State
// =============================================================================

enum DiscoverStatus { initial, loading, loaded, error }

class DiscoverState {
  final DiscoverStatus status;
  final List<Submission> submissions;
  final bool hasMore;
  final int currentPage;
  final String? errorMessage;

  const DiscoverState({
    this.status = DiscoverStatus.initial,
    this.submissions = const [],
    this.hasMore = true,
    this.currentPage = 0,
    this.errorMessage,
  });

  bool get isLoading => status == DiscoverStatus.loading;

  DiscoverState copyWith({
    DiscoverStatus? status,
    List<Submission>? submissions,
    bool? hasMore,
    int? currentPage,
    String? errorMessage,
  }) {
    return DiscoverState(
      status: status ?? this.status,
      submissions: submissions ?? this.submissions,
      hasMore: hasMore ?? this.hasMore,
      currentPage: currentPage ?? this.currentPage,
      errorMessage: errorMessage,
    );
  }
}

// =============================================================================
// Discover Notifier
// =============================================================================

class DiscoverNotifier extends StateNotifier<DiscoverState> {
  final ApiClient _apiClient;

  DiscoverNotifier(this._apiClient) : super(const DiscoverState());

  /// Loads (or reloads) the first page of the discover feed.
  Future<void> loadDiscover() async {
    state = state.copyWith(status: DiscoverStatus.loading, errorMessage: null);
    try {
      final response = await _apiClient.get<Map<String, dynamic>>(
        '/api/v1/feed/discover',
        queryParameters: {'page': 1, 'limit': 20},
      );
      final body = response.data;
      if (body == null) {
        state = state.copyWith(
          status: DiscoverStatus.loaded,
          submissions: [],
          hasMore: false,
          currentPage: 1,
        );
        return;
      }
      final list = body['data'] as List<dynamic>? ?? [];
      final meta = body['meta'] as Map<String, dynamic>? ?? {};
      final submissions = list
          .map((e) => Submission.fromJson(e as Map<String, dynamic>))
          .toList();
      final totalPages = (meta['total_pages'] as num?)?.toInt() ?? 1;
      state = state.copyWith(
        status: DiscoverStatus.loaded,
        submissions: submissions,
        hasMore: 1 < totalPages,
        currentPage: 1,
      );
    } catch (e) {
      state = state.copyWith(
        status: DiscoverStatus.error,
        errorMessage: e.toString(),
      );
    }
  }

  /// Loads the next page and appends results to the current list.
  Future<void> loadMore() async {
    if (state.isLoading || !state.hasMore) return;
    final nextPage = state.currentPage + 1;
    try {
      final response = await _apiClient.get<Map<String, dynamic>>(
        '/api/v1/feed/discover',
        queryParameters: {'page': nextPage, 'limit': 20},
      );
      final body = response.data;
      if (body == null) return;
      final list = body['data'] as List<dynamic>? ?? [];
      final meta = body['meta'] as Map<String, dynamic>? ?? {};
      final submissions = list
          .map((e) => Submission.fromJson(e as Map<String, dynamic>))
          .toList();
      final totalPages = (meta['total_pages'] as num?)?.toInt() ?? 1;
      state = state.copyWith(
        submissions: [...state.submissions, ...submissions],
        hasMore: nextPage < totalPages,
        currentPage: nextPage,
      );
    } catch (_) {}
  }
}

// =============================================================================
// Riverpod Provider
// =============================================================================

final discoverProvider =
    StateNotifierProvider<DiscoverNotifier, DiscoverState>((ref) {
  final apiClient = ref.watch(apiClientProvider);
  return DiscoverNotifier(apiClient);
});
