/// Domain entities for the voting feature.
///
/// [Vote] represents a single vote cast on a submission.
/// [SuperVoteBalance] tracks the user's remaining super votes for the day.

class Vote {
  final String id;
  final String submissionId;
  final int value;
  final bool isSuperVote;
  final DateTime createdAt;

  const Vote({
    required this.id,
    required this.submissionId,
    required this.value,
    this.isSuperVote = false,
    required this.createdAt,
  });

  factory Vote.fromJson(Map<String, dynamic> json) {
    return Vote(
      id: json['id'] as String,
      submissionId: json['submissionId'] as String,
      value: json['value'] as int,
      isSuperVote: json['isSuperVote'] as bool? ?? false,
      createdAt: DateTime.parse(json['createdAt'] as String),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'submissionId': submissionId,
      'value': value,
      'isSuperVote': isSuperVote,
      'createdAt': createdAt.toIso8601String(),
    };
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is Vote && runtimeType == other.runtimeType && id == other.id;

  @override
  int get hashCode => id.hashCode;

  @override
  String toString() =>
      'Vote(id: $id, submissionId: $submissionId, value: $value, super: $isSuperVote)';
}

class SuperVoteBalance {
  final int remaining;
  final int maxDaily;
  final String source;

  const SuperVoteBalance({
    required this.remaining,
    required this.maxDaily,
    this.source = 'daily',
  });

  /// Whether the user has any super votes left.
  bool get hasRemaining => remaining > 0;

  /// Percentage of super votes used (0.0 to 1.0).
  double get usedPercentage =>
      maxDaily > 0 ? (maxDaily - remaining) / maxDaily : 1.0;

  factory SuperVoteBalance.fromJson(Map<String, dynamic> json) {
    return SuperVoteBalance(
      remaining: json['remaining'] as int? ?? 0,
      maxDaily: json['maxDaily'] as int? ?? 3,
      source: json['source'] as String? ?? 'daily',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'remaining': remaining,
      'maxDaily': maxDaily,
      'source': source,
    };
  }

  SuperVoteBalance copyWith({
    int? remaining,
    int? maxDaily,
    String? source,
  }) {
    return SuperVoteBalance(
      remaining: remaining ?? this.remaining,
      maxDaily: maxDaily ?? this.maxDaily,
      source: source ?? this.source,
    );
  }

  @override
  String toString() =>
      'SuperVoteBalance(remaining: $remaining, maxDaily: $maxDaily, source: $source)';
}
