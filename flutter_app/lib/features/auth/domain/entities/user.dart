/// Domain entity representing an authenticated user.
///
/// This is the core user model used across the application. The data layer
/// provides a [UserModel] subclass that adds JSON serialization.
class User {
  final String id;
  final String username;
  final String email;
  final String displayName;
  final String? avatarUrl;
  final String? bio;
  final String role;
  final String subscriptionTier;
  final DateTime? subscriptionExpiresAt;
  final int coinBalance;
  final int followerCount;
  final int followingCount;
  final int submissionCount;
  final bool isVerified;
  final String locale;
  final DateTime createdAt;

  const User({
    required this.id,
    required this.username,
    required this.email,
    required this.displayName,
    this.avatarUrl,
    this.bio,
    this.role = 'user',
    this.subscriptionTier = 'free',
    this.subscriptionExpiresAt,
    this.coinBalance = 0,
    this.followerCount = 0,
    this.followingCount = 0,
    this.submissionCount = 0,
    this.isVerified = false,
    this.locale = 'en',
    required this.createdAt,
  });

  /// Creates a copy of this user with the given fields replaced.
  User copyWith({
    String? id,
    String? username,
    String? email,
    String? displayName,
    String? avatarUrl,
    String? bio,
    String? role,
    String? subscriptionTier,
    DateTime? subscriptionExpiresAt,
    int? coinBalance,
    int? followerCount,
    int? followingCount,
    int? submissionCount,
    bool? isVerified,
    String? locale,
    DateTime? createdAt,
  }) {
    return User(
      id: id ?? this.id,
      username: username ?? this.username,
      email: email ?? this.email,
      displayName: displayName ?? this.displayName,
      avatarUrl: avatarUrl ?? this.avatarUrl,
      bio: bio ?? this.bio,
      role: role ?? this.role,
      subscriptionTier: subscriptionTier ?? this.subscriptionTier,
      subscriptionExpiresAt:
          subscriptionExpiresAt ?? this.subscriptionExpiresAt,
      coinBalance: coinBalance ?? this.coinBalance,
      followerCount: followerCount ?? this.followerCount,
      followingCount: followingCount ?? this.followingCount,
      submissionCount: submissionCount ?? this.submissionCount,
      isVerified: isVerified ?? this.isVerified,
      locale: locale ?? this.locale,
      createdAt: createdAt ?? this.createdAt,
    );
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is User && runtimeType == other.runtimeType && id == other.id;

  @override
  int get hashCode => id.hashCode;

  @override
  String toString() => 'User(id: $id, username: $username, email: $email)';
}
