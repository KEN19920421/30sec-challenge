import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../../../core/network/api_response.dart';

/// Lightweight user model used in follower/following lists.
class SocialUser {
  final String id;
  final String username;
  final String displayName;
  final String? avatarUrl;
  final bool isVerified;
  final bool isFollowing;
  final String subscriptionTier;

  const SocialUser({
    required this.id,
    required this.username,
    required this.displayName,
    this.avatarUrl,
    this.isVerified = false,
    this.isFollowing = false,
    this.subscriptionTier = 'free',
  });

  bool get isPro => subscriptionTier != 'free';

  factory SocialUser.fromJson(Map<String, dynamic> json) {
    return SocialUser(
      id: json['id'] as String,
      username: json['username'] as String,
      displayName: json['displayName'] as String? ?? json['username'] as String,
      avatarUrl: json['avatarUrl'] as String?,
      isVerified: json['isVerified'] as bool? ?? false,
      isFollowing: json['isFollowing'] as bool? ?? false,
      subscriptionTier: json['subscriptionTier'] as String? ?? 'free',
    );
  }

  SocialUser copyWith({bool? isFollowing}) {
    return SocialUser(
      id: id,
      username: username,
      displayName: displayName,
      avatarUrl: avatarUrl,
      isVerified: isVerified,
      isFollowing: isFollowing ?? this.isFollowing,
      subscriptionTier: subscriptionTier,
    );
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is SocialUser && runtimeType == other.runtimeType && id == other.id;

  @override
  int get hashCode => id.hashCode;
}

/// Repository handling all social-related API communication.
class SocialRepository {
  final ApiClient _apiClient;

  SocialRepository({required ApiClient apiClient}) : _apiClient = apiClient;

  // ---------------------------------------------------------------------------
  // Follow / Unfollow
  // ---------------------------------------------------------------------------

  /// Follow a user.
  Future<void> follow(String userId) async {
    await _apiClient.post('/api/v1/social/follow/$userId');
  }

  /// Unfollow a user.
  Future<void> unfollow(String userId) async {
    await _apiClient.delete('/api/v1/social/follow/$userId');
  }

  // ---------------------------------------------------------------------------
  // Followers / Following lists
  // ---------------------------------------------------------------------------

  /// Fetches the followers of the user with the given [userId].
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
      (json) => SocialUser.fromJson(json),
    );
  }

  /// Fetches the users that [userId] is following.
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
      (json) => SocialUser.fromJson(json),
    );
  }

  // ---------------------------------------------------------------------------
  // Block / Report
  // ---------------------------------------------------------------------------

  /// Block a user.
  Future<void> blockUser(String userId) async {
    await _apiClient.post('/api/v1/social/block/$userId');
  }

  /// Unblock a user.
  Future<void> unblockUser(String userId) async {
    await _apiClient.delete('/api/v1/social/block/$userId');
  }

  /// Report a user for abuse.
  Future<void> reportUser(String userId, {required String reason}) async {
    await _apiClient.post(
      '/api/v1/social/report/user',
      data: {'userId': userId, 'reason': reason},
    );
  }

  /// Report a submission for abuse.
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
