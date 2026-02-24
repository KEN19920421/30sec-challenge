import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/network/api_client.dart';
import '../../../../core/network/api_response.dart';
import '../../domain/entities/league_membership.dart';

/// Repository for all league-related API operations.
///
/// Handles fetching the current user's league membership and tier rankings.
class LeagueRepository {
  final ApiClient _apiClient;

  const LeagueRepository({required ApiClient apiClient})
      : _apiClient = apiClient;

  /// Fetches the current user's league membership for the current week.
  Future<LeagueMembership> getMyLeague() async {
    final response = await _apiClient.get<Map<String, dynamic>>(
      '/api/v1/leagues/me',
    );
    final body = response.data;
    if (body == null) throw Exception('Failed to load league data');
    return LeagueMembership.fromJson(body['data'] as Map<String, dynamic>);
  }

  /// Fetches paginated rankings for a specific tier.
  Future<PaginatedResponse<LeagueMembership>> getTierRankings({
    required String tier,
    int page = 1,
    int limit = 20,
  }) async {
    final response = await _apiClient.get<Map<String, dynamic>>(
      '/api/v1/leagues/$tier',
      queryParameters: {'page': page, 'limit': limit},
    );
    final body = response.data;
    if (body == null) {
      return PaginatedResponse<LeagueMembership>(
        data: const [],
        total: 0,
        page: page,
        limit: limit,
        totalPages: 1,
      );
    }
    return PaginatedResponse<LeagueMembership>.fromJson(
      body,
      (json) => LeagueMembership.fromJson(json),
    );
  }
}

// ---------------------------------------------------------------------------
// Riverpod provider
// ---------------------------------------------------------------------------

/// Provides the singleton [LeagueRepository].
final leagueRepositoryProvider = Provider<LeagueRepository>((ref) {
  final apiClient = ref.watch(apiClientProvider);
  return LeagueRepository(apiClient: apiClient);
});
