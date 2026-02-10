import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../../../core/network/api_response.dart';
import '../domain/leaderboard_entry.dart';

/// Allowed time periods for leaderboard filtering.
enum LeaderboardPeriod {
  daily('daily'),
  weekly('weekly'),
  allTime('all_time');

  final String value;
  const LeaderboardPeriod(this.value);

  String get displayName {
    switch (this) {
      case LeaderboardPeriod.daily:
        return 'Daily';
      case LeaderboardPeriod.weekly:
        return 'Weekly';
      case LeaderboardPeriod.allTime:
        return 'All Time';
    }
  }
}

/// Repository for all leaderboard-related API operations.
///
/// Handles fetching challenge leaderboards, user ranks, and friend rankings.
class LeaderboardRepository {
  final ApiClient _apiClient;

  LeaderboardRepository({required ApiClient apiClient})
      : _apiClient = apiClient;

  // ---------------------------------------------------------------------------
  // Challenge Leaderboard
  // ---------------------------------------------------------------------------

  /// Fetches a paginated leaderboard for a specific challenge.
  ///
  /// [challengeId] identifies the challenge.
  /// [period] filters by time period (daily, weekly, or all_time).
  /// [page] and [limit] control pagination.
  Future<PaginatedResponse<LeaderboardEntry>> getLeaderboard({
    required String challengeId,
    LeaderboardPeriod period = LeaderboardPeriod.allTime,
    int page = 1,
    int limit = 20,
  }) async {
    final response = await _apiClient.get<Map<String, dynamic>>(
      '/api/v1/leaderboards/challenge/$challengeId',
      queryParameters: {
        'period': period.value,
        'page': page,
        'limit': limit,
      },
    );

    return PaginatedResponse<LeaderboardEntry>.fromJson(
      response.data!,
      (json) => LeaderboardEntry.fromJson(json),
    );
  }

  // ---------------------------------------------------------------------------
  // My Rank
  // ---------------------------------------------------------------------------

  /// Fetches the current user's rank in a specific challenge.
  ///
  /// Returns [UserRank] with the user's position, score, and total
  /// participants. Returns a rank of 0 if the user has not submitted.
  Future<UserRank> getMyRank({
    required String challengeId,
  }) async {
    final response = await _apiClient.get<Map<String, dynamic>>(
      '/api/v1/leaderboards/challenge/$challengeId/me',
    );

    final apiResponse = ApiResponse<UserRank>.fromJson(
      response.data!,
      (data) => UserRank.fromJson(data as Map<String, dynamic>),
    );

    return apiResponse.data!;
  }

  // ---------------------------------------------------------------------------
  // Friends Leaderboard
  // ---------------------------------------------------------------------------

  // ---------------------------------------------------------------------------
  // Top Creators
  // ---------------------------------------------------------------------------

  /// Fetches the top creators ranked by aggregate Wilson Scores.
  Future<List<TopCreator>> getTopCreators({
    LeaderboardPeriod period = LeaderboardPeriod.weekly,
    int limit = 20,
  }) async {
    final response = await _apiClient.get<Map<String, dynamic>>(
      '/api/v1/leaderboards/top-creators',
      queryParameters: {
        'period': period.value,
        'limit': limit,
      },
    );

    final apiResponse = ApiResponse<List<TopCreator>>.fromJson(
      response.data!,
      (data) => (data as List<dynamic>)
          .map((item) => TopCreator.fromJson(item as Map<String, dynamic>))
          .toList(),
    );

    return apiResponse.data ?? [];
  }

  // ---------------------------------------------------------------------------
  // Friends Leaderboard
  // ---------------------------------------------------------------------------

  /// Fetches a paginated leaderboard filtered to just the user's friends.
  ///
  /// Same response shape as [getLeaderboard] but only includes entries from
  /// users the current user follows.
  Future<PaginatedResponse<LeaderboardEntry>> getFriendsLeaderboard({
    required String challengeId,
    int page = 1,
    int limit = 20,
  }) async {
    final response = await _apiClient.get<Map<String, dynamic>>(
      '/api/v1/leaderboards/challenge/$challengeId/friends',
      queryParameters: {
        'page': page,
        'limit': limit,
      },
    );

    return PaginatedResponse<LeaderboardEntry>.fromJson(
      response.data!,
      (json) => LeaderboardEntry.fromJson(json),
    );
  }
}

// ---------------------------------------------------------------------------
// Riverpod provider
// ---------------------------------------------------------------------------

/// Provides the singleton [LeaderboardRepository].
final leaderboardRepositoryProvider = Provider<LeaderboardRepository>((ref) {
  final apiClient = ref.watch(apiClientProvider);
  return LeaderboardRepository(apiClient: apiClient);
});
