import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../../../core/network/api_response.dart';
import '../../challenge/domain/submission.dart';
import '../domain/user_profile.dart';

/// Repository handling all profile-related API communication.
class ProfileRepository {
  final ApiClient _apiClient;

  ProfileRepository({required ApiClient apiClient}) : _apiClient = apiClient;

  // ---------------------------------------------------------------------------
  // Profile
  // ---------------------------------------------------------------------------

  /// Fetches the profile of the user with the given [userId].
  Future<UserProfile> getProfile(String userId) async {
    final response = await _apiClient.get<Map<String, dynamic>>(
      '/api/v1/users/$userId',
    );
    final body = response.data!;
    final apiResp = ApiResponse<UserProfile>.fromJson(
      body,
      (data) => UserProfile.fromJson(data as Map<String, dynamic>),
    );
    return apiResp.data!;
  }

  /// Updates the authenticated user's profile.
  Future<UserProfile> updateProfile({
    String? displayName,
    String? username,
    String? bio,
  }) async {
    final data = <String, dynamic>{};
    if (displayName != null) data['displayName'] = displayName;
    if (username != null) data['username'] = username;
    if (bio != null) data['bio'] = bio;

    final response = await _apiClient.put<Map<String, dynamic>>(
      '/api/v1/users/profile',
      data: data,
    );
    final body = response.data!;
    final apiResp = ApiResponse<UserProfile>.fromJson(
      body,
      (data) => UserProfile.fromJson(data as Map<String, dynamic>),
    );
    return apiResp.data!;
  }

  /// Uploads a new avatar image for the authenticated user.
  Future<String> uploadAvatar(String filePath) async {
    final formData = FormData.fromMap({
      'avatar': await MultipartFile.fromFile(filePath),
    });
    final response = await _apiClient.upload<Map<String, dynamic>>(
      '/api/v1/users/profile/avatar',
      data: formData,
    );
    final body = response.data!;
    return body['data']?['avatarUrl'] as String? ?? '';
  }

  /// Fetches the submissions of the user with the given [userId].
  Future<PaginatedResponse<Submission>> getUserSubmissions(
    String userId, {
    int page = 1,
    int limit = 20,
  }) async {
    final response = await _apiClient.get<Map<String, dynamic>>(
      '/api/v1/users/$userId/submissions',
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

  /// Checks whether a username is available.
  Future<bool> checkUsernameAvailability(String username) async {
    try {
      final response = await _apiClient.get<Map<String, dynamic>>(
        '/api/v1/users/check-username',
        queryParameters: {'username': username},
      );
      final body = response.data;
      return body?['data']?['available'] as bool? ?? false;
    } catch (_) {
      return false;
    }
  }
}

// ---------------------------------------------------------------------------
// Riverpod provider
// ---------------------------------------------------------------------------

final profileRepositoryProvider = Provider<ProfileRepository>((ref) {
  final apiClient = ref.watch(apiClientProvider);
  return ProfileRepository(apiClient: apiClient);
});
