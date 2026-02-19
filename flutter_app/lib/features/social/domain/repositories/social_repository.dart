import '../../../../core/network/api_response.dart';
import '../entities/social_user.dart';

/// Abstract contract for social-related operations.
///
/// The data layer provides [SocialRepository] which implements this contract
/// by communicating with the remote API.
abstract class SocialRepositoryContract {
  /// Follow a user.
  Future<void> follow(String userId);

  /// Unfollow a user.
  Future<void> unfollow(String userId);

  /// Fetches the followers of the user with the given [userId].
  Future<PaginatedResponse<SocialUser>> getFollowers(
    String userId, {
    int page,
    int limit,
    String? search,
  });

  /// Fetches the users that [userId] is following.
  Future<PaginatedResponse<SocialUser>> getFollowing(
    String userId, {
    int page,
    int limit,
    String? search,
  });

  /// Block a user.
  Future<void> blockUser(String userId);

  /// Unblock a user.
  Future<void> unblockUser(String userId);

  /// Report a user for abuse.
  Future<void> reportUser(String userId, {required String reason});

  /// Report a submission for abuse.
  Future<void> reportSubmission(String submissionId, {required String reason});
}
