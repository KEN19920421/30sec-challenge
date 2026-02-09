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
      userId: json['userId'] as String,
      challengeId: json['challengeId'] as String,
      caption: json['caption'] as String?,
      videoUrl: json['videoUrl'] as String?,
      thumbnailUrl: json['thumbnailUrl'] as String?,
      hlsUrl: json['hlsUrl'] as String?,
      videoDuration: (json['videoDuration'] as num?)?.toDouble(),
      transcodeStatus: json['transcodeStatus'] as String? ?? 'pending',
      moderationStatus: json['moderationStatus'] as String? ?? 'pending',
      voteCount: json['voteCount'] as int? ?? 0,
      superVoteCount: json['superVoteCount'] as int? ?? 0,
      wilsonScore: (json['wilsonScore'] as num?)?.toDouble() ?? 0.0,
      rank: json['rank'] as int?,
      totalViews: json['totalViews'] as int? ?? 0,
      giftCoinsReceived: json['giftCoinsReceived'] as int? ?? 0,
      createdAt: DateTime.parse(json['createdAt'] as String),
      username: user?['username'] as String? ?? json['username'] as String?,
      displayName:
          user?['displayName'] as String? ?? json['displayName'] as String?,
      avatarUrl:
          user?['avatarUrl'] as String? ?? json['avatarUrl'] as String?,
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
