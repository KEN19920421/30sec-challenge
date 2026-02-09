import '../../domain/entities/user.dart';

/// Data-layer model that extends [User] with JSON serialization.
///
/// Parses the `user` object returned by the backend API and can convert
/// back to a JSON map for local caching.
class UserModel extends User {
  const UserModel({
    required super.id,
    required super.username,
    required super.email,
    required super.displayName,
    super.avatarUrl,
    super.bio,
    super.role,
    super.subscriptionTier,
    super.subscriptionExpiresAt,
    super.coinBalance,
    super.followerCount,
    super.followingCount,
    super.submissionCount,
    super.isVerified,
    super.locale,
    required super.createdAt,
  });

  /// Parse a user from a JSON map as returned by the API.
  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      id: json['id'] as String? ?? json['_id'] as String? ?? '',
      username: json['username'] as String? ?? '',
      email: json['email'] as String? ?? '',
      displayName: json['display_name'] as String? ??
          json['displayName'] as String? ??
          '',
      avatarUrl: json['avatar_url'] as String? ??
          json['avatarUrl'] as String?,
      bio: json['bio'] as String?,
      role: json['role'] as String? ?? 'user',
      subscriptionTier: json['subscription_tier'] as String? ??
          json['subscriptionTier'] as String? ??
          'free',
      subscriptionExpiresAt: _parseDateTime(
        json['subscription_expires_at'] ?? json['subscriptionExpiresAt'],
      ),
      coinBalance: json['coin_balance'] as int? ??
          json['coinBalance'] as int? ??
          0,
      followerCount: json['follower_count'] as int? ??
          json['followerCount'] as int? ??
          0,
      followingCount: json['following_count'] as int? ??
          json['followingCount'] as int? ??
          0,
      submissionCount: json['submission_count'] as int? ??
          json['submissionCount'] as int? ??
          0,
      isVerified: json['is_verified'] as bool? ??
          json['isVerified'] as bool? ??
          false,
      locale: json['locale'] as String? ?? 'en',
      createdAt: _parseDateTime(
            json['created_at'] ?? json['createdAt'],
          ) ??
          DateTime.now(),
    );
  }

  /// Convert this user into a JSON map suitable for local storage.
  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'username': username,
      'email': email,
      'display_name': displayName,
      'avatar_url': avatarUrl,
      'bio': bio,
      'role': role,
      'subscription_tier': subscriptionTier,
      'subscription_expires_at': subscriptionExpiresAt?.toIso8601String(),
      'coin_balance': coinBalance,
      'follower_count': followerCount,
      'following_count': followingCount,
      'submission_count': submissionCount,
      'is_verified': isVerified,
      'locale': locale,
      'created_at': createdAt.toIso8601String(),
    };
  }

  /// Create a [UserModel] from an existing domain [User].
  factory UserModel.fromEntity(User user) {
    return UserModel(
      id: user.id,
      username: user.username,
      email: user.email,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      bio: user.bio,
      role: user.role,
      subscriptionTier: user.subscriptionTier,
      subscriptionExpiresAt: user.subscriptionExpiresAt,
      coinBalance: user.coinBalance,
      followerCount: user.followerCount,
      followingCount: user.followingCount,
      submissionCount: user.submissionCount,
      isVerified: user.isVerified,
      locale: user.locale,
      createdAt: user.createdAt,
    );
  }

  static DateTime? _parseDateTime(dynamic value) {
    if (value == null) return null;
    if (value is DateTime) return value;
    if (value is String) return DateTime.tryParse(value);
    return null;
  }
}
