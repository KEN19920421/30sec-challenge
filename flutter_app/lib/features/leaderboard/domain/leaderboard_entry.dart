/// Domain entities for the leaderboard feature.
///
/// [LeaderboardEntry] represents a single ranked entry in a challenge
/// leaderboard. [UserRank] is a lightweight summary of the current user's
/// position in the rankings.

class LeaderboardEntry {
  final String submissionId;
  final String userId;
  final String username;
  final String displayName;
  final String? avatarUrl;
  final String? thumbnailUrl;
  final int rank;
  final double score;
  final int voteCount;
  final int superVoteCount;

  const LeaderboardEntry({
    required this.submissionId,
    required this.userId,
    required this.username,
    required this.displayName,
    this.avatarUrl,
    this.thumbnailUrl,
    required this.rank,
    required this.score,
    this.voteCount = 0,
    this.superVoteCount = 0,
  });

  /// Total weighted score including super votes (each counts as 3).
  int get weightedVoteCount => voteCount + (superVoteCount * 3);

  /// Display name with fallback to username.
  String get displayNameOrUsername =>
      displayName.isNotEmpty ? displayName : username;

  factory LeaderboardEntry.fromJson(Map<String, dynamic> json) {
    final user = json['user'] as Map<String, dynamic>?;

    return LeaderboardEntry(
      submissionId: json['submissionId'] as String? ?? json['id'] as String,
      userId: json['userId'] as String? ??
          user?['id'] as String? ??
          '',
      username: json['username'] as String? ??
          user?['username'] as String? ??
          'Unknown',
      displayName: json['displayName'] as String? ??
          user?['displayName'] as String? ??
          '',
      avatarUrl: json['avatarUrl'] as String? ??
          user?['avatarUrl'] as String?,
      thumbnailUrl: json['thumbnailUrl'] as String?,
      rank: json['rank'] as int? ?? 0,
      score: (json['score'] as num?)?.toDouble() ?? 0.0,
      voteCount: json['voteCount'] as int? ?? 0,
      superVoteCount: json['superVoteCount'] as int? ?? 0,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'submissionId': submissionId,
      'userId': userId,
      'username': username,
      'displayName': displayName,
      'avatarUrl': avatarUrl,
      'thumbnailUrl': thumbnailUrl,
      'rank': rank,
      'score': score,
      'voteCount': voteCount,
      'superVoteCount': superVoteCount,
    };
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is LeaderboardEntry &&
          runtimeType == other.runtimeType &&
          submissionId == other.submissionId;

  @override
  int get hashCode => submissionId.hashCode;

  @override
  String toString() =>
      'LeaderboardEntry(rank: $rank, username: $username, score: $score)';
}

class UserRank {
  final int rank;
  final double score;
  final int totalParticipants;

  const UserRank({
    required this.rank,
    required this.score,
    required this.totalParticipants,
  });

  /// Whether the user has a valid rank (has submitted to the challenge).
  bool get hasRank => rank > 0;

  /// User's percentile ranking (top X%).
  double get percentile =>
      totalParticipants > 0 ? (rank / totalParticipants) * 100 : 100;

  /// Friendly percentile display (e.g. "Top 5%").
  String get percentileDisplay {
    if (!hasRank) return '--';
    final pct = percentile.ceil();
    if (pct <= 1) return 'Top 1%';
    if (pct <= 5) return 'Top 5%';
    if (pct <= 10) return 'Top 10%';
    if (pct <= 25) return 'Top 25%';
    if (pct <= 50) return 'Top 50%';
    return 'Top $pct%';
  }

  factory UserRank.fromJson(Map<String, dynamic> json) {
    return UserRank(
      rank: json['rank'] as int? ?? 0,
      score: (json['score'] as num?)?.toDouble() ?? 0.0,
      totalParticipants: json['totalParticipants'] as int? ?? 0,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'rank': rank,
      'score': score,
      'totalParticipants': totalParticipants,
    };
  }

  @override
  String toString() =>
      'UserRank(rank: $rank, score: $score, total: $totalParticipants)';
}
