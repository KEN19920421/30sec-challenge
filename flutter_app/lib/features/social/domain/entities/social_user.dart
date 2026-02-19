/// Domain entity representing a user in social contexts (follower/following lists).
///
/// This is a pure domain object with no serialization logic. The data layer
/// provides [SocialUserModel] which extends this and adds JSON conversion.
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

  /// Whether the user has a paid subscription.
  bool get isPro => subscriptionTier != 'free';

  /// Creates a copy of this user with the given fields replaced.
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

  @override
  String toString() =>
      'SocialUser(id: $id, username: $username, displayName: $displayName)';
}
