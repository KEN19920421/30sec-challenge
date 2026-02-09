import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../../../core/network/api_response.dart';
import '../domain/challenge.dart';
import '../domain/submission.dart';

/// Repository handling all challenge-related API communication.
///
/// Provides methods to fetch the current active challenge, upcoming challenges,
/// history (paginated), individual challenge details, and ranked results.
class ChallengeRepository {
  final ApiClient _apiClient;

  ChallengeRepository({required ApiClient apiClient})
      : _apiClient = apiClient;

  // ---------------------------------------------------------------------------
  // Active / Current challenge
  // ---------------------------------------------------------------------------

  /// Fetches the currently active challenge.
  ///
  /// Returns `null` if there is no active challenge at this time.
  Future<Challenge?> getCurrentChallenge() async {
    final response = await _apiClient.get<Map<String, dynamic>>(
      '/api/v1/challenges',
    );
    final body = response.data;
    if (body == null || body['data'] == null) return null;

    return Challenge.fromJson(body['data'] as Map<String, dynamic>);
  }

  // ---------------------------------------------------------------------------
  // Upcoming
  // ---------------------------------------------------------------------------

  /// Fetches the list of upcoming (scheduled) challenges.
  Future<List<Challenge>> getUpcoming() async {
    final response = await _apiClient.get<Map<String, dynamic>>(
      '/api/v1/challenges/upcoming',
    );
    final body = response.data;
    if (body == null) return [];

    final list = body['data'] as List<dynamic>? ?? [];
    return list
        .map((item) => Challenge.fromJson(item as Map<String, dynamic>))
        .toList();
  }

  // ---------------------------------------------------------------------------
  // History (paginated)
  // ---------------------------------------------------------------------------

  /// Fetches completed challenges with pagination.
  Future<PaginatedResponse<Challenge>> getHistory({
    int page = 1,
    int limit = 20,
    String? category,
  }) async {
    final queryParams = <String, dynamic>{
      'page': page,
      'limit': limit,
    };
    if (category != null && category.isNotEmpty) {
      queryParams['category'] = category;
    }

    final response = await _apiClient.get<Map<String, dynamic>>(
      '/api/v1/challenges/history',
      queryParameters: queryParams,
    );
    final body = response.data;
    if (body == null) {
      return const PaginatedResponse<Challenge>(
        data: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 1,
      );
    }

    return PaginatedResponse<Challenge>.fromJson(
      body,
      (json) => Challenge.fromJson(json),
    );
  }

  // ---------------------------------------------------------------------------
  // Detail
  // ---------------------------------------------------------------------------

  /// Fetches a single challenge by its [id].
  Future<Challenge> getById(String id) async {
    final response = await _apiClient.get<Map<String, dynamic>>(
      '/api/v1/challenges/$id',
    );
    final body = response.data!;
    final apiResp = ApiResponse<Challenge>.fromJson(
      body,
      (data) => Challenge.fromJson(data as Map<String, dynamic>),
    );
    return apiResp.data!;
  }

  // ---------------------------------------------------------------------------
  // Results
  // ---------------------------------------------------------------------------

  /// Fetches ranked submissions (results) for a challenge.
  Future<PaginatedResponse<Submission>> getResults(
    String challengeId, {
    int page = 1,
    int limit = 20,
  }) async {
    final response = await _apiClient.get<Map<String, dynamic>>(
      '/api/v1/challenges/$challengeId/results',
      queryParameters: {'page': page, 'limit': limit},
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

// ---------------------------------------------------------------------------
// Riverpod provider
// ---------------------------------------------------------------------------

final challengeRepositoryProvider = Provider<ChallengeRepository>((ref) {
  final apiClient = ref.watch(apiClientProvider);
  return ChallengeRepository(apiClient: apiClient);
});
