/// Domain entity representing a user's video submission to a challenge.
///
/// A submission is a 30-second video recorded by a user in response to an
/// active challenge. It goes through transcoding and moderation before
/// becoming visible to voters.
class Submission {
  final String id;
  final String userId;
  final String challengeId;
  final String? caption;
  final String? videoUrl;
  final String? thumbnailUrl;
  final String? hlsUrl;
  final double? videoDuration;

  /// One of: pending, processing, completed, failed.
  final String transcodeStatus;

  /// One of: pending, approved, rejected, flagged.
  final String moderationStatus;

  final int voteCount;
  final int superVoteCount;
  final double wilsonScore;
  final int? rank;
  final int totalViews;
  final int giftCoinsReceived;
  final double boostScore;
  final DateTime createdAt;

  // User info for display (denormalized for convenience).
  final String? username;
  final String? displayName;
  final String? avatarUrl;

  const Submission({
    required this.id,
    required this.userId,
    required this.challengeId,
    this.caption,
    this.videoUrl,
    this.thumbnailUrl,
    this.hlsUrl,
    this.videoDuration,
    this.transcodeStatus = 'pending',
    this.moderationStatus = 'pending',
    this.voteCount = 0,
    this.superVoteCount = 0,
    this.wilsonScore = 0.0,
    this.rank,
    this.totalViews = 0,
    this.giftCoinsReceived = 0,
    this.boostScore = 0.0,
    required this.createdAt,
    this.username,
    this.displayName,
    this.avatarUrl,
  });

  // ---------------------------------------------------------------------------
  // Computed properties
  // ---------------------------------------------------------------------------

  /// Whether the video has finished transcoding and is ready to view.
  bool get isReady => transcodeStatus == 'completed';

  /// Whether the submission passed moderation.
  bool get isApproved => moderationStatus == 'approved';

  /// Whether the submission is publicly visible.
  bool get isVisible => isReady && isApproved;

  /// Whether this submission is currently boosted.
  bool get isBoosted => boostScore > 0;

  /// Total weighted votes including super votes (each super vote counts as 3).
  int get weightedVoteCount => voteCount + (superVoteCount * 3);

  /// Display name with fallback to username.
  String get displayNameOrUsername => displayName ?? username ?? 'Anonymous';

  // ---------------------------------------------------------------------------
  // JSON serialization
  // ---------------------------------------------------------------------------

  factory Submission.fromJson(Map<String, dynamic> json) {
    // Handle nested user object if present.
    final user = json['user'] as Map<String, dynamic>?;

    return Submission(
      id: json['id'] as String,
      userId: (json['user_id'] ?? json['userId']) as String,
      challengeId: (json['challenge_id'] ?? json['challengeId']) as String,
      caption: json['caption'] as String?,
      videoUrl: (json['video_url'] ?? json['videoUrl']) as String?,
      thumbnailUrl: (json['thumbnail_url'] ?? json['thumbnailUrl']) as String?,
      hlsUrl: (json['hls_url'] ?? json['hlsUrl']) as String?,
      videoDuration: ((json['video_duration'] ?? json['videoDuration']) as num?)?.toDouble(),
      transcodeStatus: (json['transcode_status'] ?? json['transcodeStatus']) as String? ?? 'pending',
      moderationStatus: (json['moderation_status'] ?? json['moderationStatus']) as String? ?? 'pending',
      voteCount: (json['vote_count'] ?? json['voteCount']) as int? ?? 0,
      superVoteCount: (json['super_vote_count'] ?? json['superVoteCount']) as int? ?? 0,
      wilsonScore: ((json['wilson_score'] ?? json['wilsonScore']) as num?)?.toDouble() ?? 0.0,
      rank: json['rank'] as int?,
      totalViews: (json['total_views'] ?? json['totalViews']) as int? ?? 0,
      giftCoinsReceived: (json['gift_coins_received'] ?? json['giftCoinsReceived']) as int? ?? 0,
      boostScore: ((json['boost_score'] ?? json['boostScore']) as num?)?.toDouble() ?? 0.0,
      createdAt: DateTime.parse((json['created_at'] ?? json['createdAt']) as String),
      username: user?['username'] as String? ?? json['username'] as String?,
      displayName:
          user?['display_name'] as String? ?? user?['displayName'] as String? ?? json['display_name'] as String? ?? json['displayName'] as String?,
      avatarUrl:
          user?['avatar_url'] as String? ?? user?['avatarUrl'] as String? ?? json['avatar_url'] as String? ?? json['avatarUrl'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'userId': userId,
      'challengeId': challengeId,
      'caption': caption,
      'videoUrl': videoUrl,
      'thumbnailUrl': thumbnailUrl,
      'hlsUrl': hlsUrl,
      'videoDuration': videoDuration,
      'transcodeStatus': transcodeStatus,
      'moderationStatus': moderationStatus,
      'voteCount': voteCount,
      'superVoteCount': superVoteCount,
      'wilsonScore': wilsonScore,
      'rank': rank,
      'totalViews': totalViews,
      'giftCoinsReceived': giftCoinsReceived,
      'boostScore': boostScore,
      'createdAt': createdAt.toIso8601String(),
      'username': username,
      'displayName': displayName,
      'avatarUrl': avatarUrl,
    };
  }

  Submission copyWith({
    String? id,
    String? userId,
    String? challengeId,
    String? caption,
    String? videoUrl,
    String? thumbnailUrl,
    String? hlsUrl,
    double? videoDuration,
    String? transcodeStatus,
    String? moderationStatus,
    int? voteCount,
    int? superVoteCount,
    double? wilsonScore,
    int? rank,
    int? totalViews,
    int? giftCoinsReceived,
    double? boostScore,
    DateTime? createdAt,
    String? username,
    String? displayName,
    String? avatarUrl,
  }) {
    return Submission(
      id: id ?? this.id,
      userId: userId ?? this.userId,
      challengeId: challengeId ?? this.challengeId,
      caption: caption ?? this.caption,
      videoUrl: videoUrl ?? this.videoUrl,
      thumbnailUrl: thumbnailUrl ?? this.thumbnailUrl,
      hlsUrl: hlsUrl ?? this.hlsUrl,
      videoDuration: videoDuration ?? this.videoDuration,
      transcodeStatus: transcodeStatus ?? this.transcodeStatus,
      moderationStatus: moderationStatus ?? this.moderationStatus,
      voteCount: voteCount ?? this.voteCount,
      superVoteCount: superVoteCount ?? this.superVoteCount,
      wilsonScore: wilsonScore ?? this.wilsonScore,
      rank: rank ?? this.rank,
      totalViews: totalViews ?? this.totalViews,
      giftCoinsReceived: giftCoinsReceived ?? this.giftCoinsReceived,
      boostScore: boostScore ?? this.boostScore,
      createdAt: createdAt ?? this.createdAt,
      username: username ?? this.username,
      displayName: displayName ?? this.displayName,
      avatarUrl: avatarUrl ?? this.avatarUrl,
    );
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is Submission &&
          runtimeType == other.runtimeType &&
          id == other.id;

  @override
  int get hashCode => id.hashCode;

  @override
  String toString() =>
      'Submission(id: $id, userId: $userId, challengeId: $challengeId)';
}
