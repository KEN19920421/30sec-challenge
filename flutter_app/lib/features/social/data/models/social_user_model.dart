import '../../domain/entities/social_user.dart';

/// Data-layer model that extends [SocialUser] with JSON serialization.
///
/// Parses the user objects returned in follower/following API responses
/// and can convert back to a JSON map for local caching.
class SocialUserModel extends SocialUser {
  const SocialUserModel({
    required super.id,
    required super.username,
    required super.displayName,
    super.avatarUrl,
    super.isVerified,
    super.isFollowing,
    super.subscriptionTier,
  });

  /// Parse a social user from a JSON map as returned by the API.
  factory SocialUserModel.fromJson(Map<String, dynamic> json) {
    return SocialUserModel(
      id: json['id'] as String,
      username: json['username'] as String,
      displayName:
          json['displayName'] as String? ?? json['username'] as String,
      avatarUrl: json['avatarUrl'] as String?,
      isVerified: json['isVerified'] as bool? ?? false,
      isFollowing: json['isFollowing'] as bool? ?? false,
      subscriptionTier: json['subscriptionTier'] as String? ?? 'free',
    );
  }

  /// Convert this social user into a JSON map.
  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'username': username,
      'displayName': displayName,
      'avatarUrl': avatarUrl,
      'isVerified': isVerified,
      'isFollowing': isFollowing,
      'subscriptionTier': subscriptionTier,
    };
  }

  /// Create a [SocialUserModel] from an existing domain [SocialUser].
  factory SocialUserModel.fromEntity(SocialUser user) {
    return SocialUserModel(
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      isVerified: user.isVerified,
      isFollowing: user.isFollowing,
      subscriptionTier: user.subscriptionTier,
    );
  }
}
