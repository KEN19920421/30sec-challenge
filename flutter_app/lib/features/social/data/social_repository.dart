import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../../../core/network/api_response.dart';
import '../domain/entities/social_user.dart';
import '../domain/repositories/social_repository.dart';
import 'models/social_user_model.dart';

// Re-export domain entity so existing imports continue to work.
export '../domain/entities/social_user.dart';

/// Repository handling all social-related API communication.
class SocialRepository implements SocialRepositoryContract {
  final ApiClient _apiClient;

  SocialRepository({required ApiClient apiClient}) : _apiClient = apiClient;

  // ---------------------------------------------------------------------------
  // Follow / Unfollow
  // ---------------------------------------------------------------------------

  /// Follow a user.
  @override
  Future<void> follow(String userId) async {
    await _apiClient.post('/api/v1/social/follow/$userId');
  }

  /// Unfollow a user.
  @override
  Future<void> unfollow(String userId) async {
    await _apiClient.delete('/api/v1/social/follow/$userId');
  }

  // ---------------------------------------------------------------------------
  // Followers / Following lists
  // ---------------------------------------------------------------------------

  /// Fetches the followers of the user with the given [userId].
  @override
  Future<PaginatedResponse<SocialUser>> getFollowers(
    String userId, {
    int page = 1,
    int limit = 20,
    String? search,
  }) async {
    final queryParams = <String, dynamic>{
      'page': page,
      'limit': limit,
    };
    if (search != null && search.isNotEmpty) {
      queryParams['search'] = search;
    }

    final response = await _apiClient.get<Map<String, dynamic>>(
      '/api/v1/social/followers/$userId',
      queryParameters: queryParams,
    );
    final body = response.data;
    if (body == null) {
      return const PaginatedResponse<SocialUser>(
        data: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 1,
      );
    }
    return PaginatedResponse<SocialUser>.fromJson(
      body,
      (json) => SocialUserModel.fromJson(json),
    );
  }

  /// Fetches the users that [userId] is following.
  @override
  Future<PaginatedResponse<SocialUser>> getFollowing(
    String userId, {
    int page = 1,
    int limit = 20,
    String? search,
  }) async {
    final queryParams = <String, dynamic>{
      'page': page,
      'limit': limit,
    };
    if (search != null && search.isNotEmpty) {
      queryParams['search'] = search;
    }

    final response = await _apiClient.get<Map<String, dynamic>>(
      '/api/v1/social/following/$userId',
      queryParameters: queryParams,
    );
    final body = response.data;
    if (body == null) {
      return const PaginatedResponse<SocialUser>(
        data: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 1,
      );
    }
    return PaginatedResponse<SocialUser>.fromJson(
      body,
      (json) => SocialUserModel.fromJson(json),
    );
  }

  // ---------------------------------------------------------------------------
  // Block / Report
  // ---------------------------------------------------------------------------

  /// Block a user.
  @override
  Future<void> blockUser(String userId) async {
    await _apiClient.post('/api/v1/social/block/$userId');
  }

  /// Unblock a user.
  @override
  Future<void> unblockUser(String userId) async {
    await _apiClient.delete('/api/v1/social/block/$userId');
  }

  /// Report a user for abuse.
  @override
  Future<void> reportUser(String userId, {required String reason}) async {
    await _apiClient.post(
      '/api/v1/social/report/user',
      data: {'userId': userId, 'reason': reason},
    );
  }

  /// Report a submission for abuse.
  @override
  Future<void> reportSubmission(
    String submissionId, {
    required String reason,
  }) async {
    await _apiClient.post(
      '/api/v1/social/report/submission',
      data: {'submissionId': submissionId, 'reason': reason},
    );
  }
}

// ---------------------------------------------------------------------------
// Riverpod provider
// ---------------------------------------------------------------------------

final socialRepositoryProvider = Provider<SocialRepository>((ref) {
  final apiClient = ref.watch(apiClientProvider);
  return SocialRepository(apiClient: apiClient);
});
