/// Domain entity representing a full user profile as returned by the API.
///
/// Extends the base [User] concept with social stats and viewer-relative
/// fields like [isFollowing].
class UserProfile {
  final String id;
  final String username;
  final String displayName;
  final String email;
  final String? avatarUrl;
  final String? bio;
  final String role;
  final String subscriptionTier;
  final int coinBalance;
  final int followerCount;
  final int followingCount;
  final int submissionCount;
  final int totalVotesReceived;
  final bool isVerified;

  /// Whether the currently authenticated user follows this profile.
  final bool isFollowing;
  final DateTime createdAt;

  const UserProfile({
    required this.id,
    required this.username,
    required this.displayName,
    required this.email,
    this.avatarUrl,
    this.bio,
    this.role = 'user',
    this.subscriptionTier = 'free',
    this.coinBalance = 0,
    this.followerCount = 0,
    this.followingCount = 0,
    this.submissionCount = 0,
    this.totalVotesReceived = 0,
    this.isVerified = false,
    this.isFollowing = false,
    required this.createdAt,
  });

  /// Whether this user has an active Pro subscription.
  bool get isPro => subscriptionTier != 'free';

  factory UserProfile.fromJson(Map<String, dynamic> json) {
    return UserProfile(
      id: json['id'] as String,
      username: json['username'] as String,
      displayName: json['displayName'] as String? ?? json['username'] as String,
      email: json['email'] as String? ?? '',
      avatarUrl: json['avatarUrl'] as String?,
      bio: json['bio'] as String?,
      role: json['role'] as String? ?? 'user',
      subscriptionTier: json['subscriptionTier'] as String? ?? 'free',
      coinBalance: json['coinBalance'] as int? ?? 0,
      followerCount: json['followerCount'] as int? ?? 0,
      followingCount: json['followingCount'] as int? ?? 0,
      submissionCount: json['submissionCount'] as int? ?? 0,
      totalVotesReceived: json['totalVotesReceived'] as int? ?? 0,
      isVerified: json['isVerified'] as bool? ?? false,
      isFollowing: json['isFollowing'] as bool? ?? false,
      createdAt: DateTime.parse(json['createdAt'] as String),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'username': username,
      'displayName': displayName,
      'email': email,
      'avatarUrl': avatarUrl,
      'bio': bio,
      'role': role,
      'subscriptionTier': subscriptionTier,
      'coinBalance': coinBalance,
      'followerCount': followerCount,
      'followingCount': followingCount,
      'submissionCount': submissionCount,
      'totalVotesReceived': totalVotesReceived,
      'isVerified': isVerified,
      'isFollowing': isFollowing,
      'createdAt': createdAt.toIso8601String(),
    };
  }

  UserProfile copyWith({
    String? id,
    String? username,
    String? displayName,
    String? email,
    String? avatarUrl,
    String? bio,
    String? role,
    String? subscriptionTier,
    int? coinBalance,
    int? followerCount,
    int? followingCount,
    int? submissionCount,
    int? totalVotesReceived,
    bool? isVerified,
    bool? isFollowing,
    DateTime? createdAt,
  }) {
    return UserProfile(
      id: id ?? this.id,
      username: username ?? this.username,
      displayName: displayName ?? this.displayName,
      email: email ?? this.email,
      avatarUrl: avatarUrl ?? this.avatarUrl,
      bio: bio ?? this.bio,
      role: role ?? this.role,
      subscriptionTier: subscriptionTier ?? this.subscriptionTier,
      coinBalance: coinBalance ?? this.coinBalance,
      followerCount: followerCount ?? this.followerCount,
      followingCount: followingCount ?? this.followingCount,
      submissionCount: submissionCount ?? this.submissionCount,
      totalVotesReceived: totalVotesReceived ?? this.totalVotesReceived,
      isVerified: isVerified ?? this.isVerified,
      isFollowing: isFollowing ?? this.isFollowing,
      createdAt: createdAt ?? this.createdAt,
    );
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is UserProfile &&
          runtimeType == other.runtimeType &&
          id == other.id;

  @override
  int get hashCode => id.hashCode;

  @override
  String toString() =>
      'UserProfile(id: $id, username: $username, displayName: $displayName)';
}
