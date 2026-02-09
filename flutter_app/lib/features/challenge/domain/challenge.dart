/// Domain entity representing a video challenge.
///
/// A challenge is the core concept of the app: a time-limited prompt that
/// users record 30-second video responses to. Challenges move through the
/// lifecycle: draft -> scheduled -> active -> voting -> completed.
class Challenge {
  final String id;
  final String title;
  final String? titleJa;
  final String description;
  final String? descriptionJa;
  final String category;
  final String difficulty;
  final String? thumbnailUrl;
  final String? sponsorName;
  final String? sponsorLogoUrl;

  /// One of: draft, scheduled, active, voting, completed.
  final String status;

  final DateTime startsAt;
  final DateTime endsAt;
  final DateTime votingEndsAt;
  final int submissionCount;
  final int totalVotes;
  final bool isPremiumEarlyAccess;
  final DateTime createdAt;

  const Challenge({
    required this.id,
    required this.title,
    this.titleJa,
    required this.description,
    this.descriptionJa,
    required this.category,
    required this.difficulty,
    this.thumbnailUrl,
    this.sponsorName,
    this.sponsorLogoUrl,
    required this.status,
    required this.startsAt,
    required this.endsAt,
    required this.votingEndsAt,
    this.submissionCount = 0,
    this.totalVotes = 0,
    this.isPremiumEarlyAccess = false,
    required this.createdAt,
  });

  // ---------------------------------------------------------------------------
  // Computed properties
  // ---------------------------------------------------------------------------

  /// Whether this challenge is currently accepting submissions.
  bool get isActive => status == 'active';

  /// Whether this challenge is in the voting phase.
  bool get isVoting => status == 'voting';

  /// Whether this challenge has finished entirely.
  bool get isCompleted => status == 'completed';

  /// Whether this challenge is scheduled but not yet started.
  bool get isScheduled => status == 'scheduled';

  /// Whether this challenge has a sponsor.
  bool get isSponsored => sponsorName != null && sponsorName!.isNotEmpty;

  /// Time remaining until [endsAt]. Returns [Duration.zero] if already past.
  Duration get timeRemaining {
    final remaining = endsAt.difference(DateTime.now());
    return remaining.isNegative ? Duration.zero : remaining;
  }

  /// Time remaining until [startsAt]. Returns [Duration.zero] if already past.
  Duration get timeUntilStart {
    final remaining = startsAt.difference(DateTime.now());
    return remaining.isNegative ? Duration.zero : remaining;
  }

  /// Time remaining until voting ends.
  Duration get votingTimeRemaining {
    final remaining = votingEndsAt.difference(DateTime.now());
    return remaining.isNegative ? Duration.zero : remaining;
  }

  // ---------------------------------------------------------------------------
  // JSON serialization
  // ---------------------------------------------------------------------------

  factory Challenge.fromJson(Map<String, dynamic> json) {
    return Challenge(
      id: json['id'] as String,
      title: json['title'] as String,
      titleJa: json['titleJa'] as String?,
      description: json['description'] as String,
      descriptionJa: json['descriptionJa'] as String?,
      category: json['category'] as String,
      difficulty: json['difficulty'] as String,
      thumbnailUrl: json['thumbnailUrl'] as String?,
      sponsorName: json['sponsorName'] as String?,
      sponsorLogoUrl: json['sponsorLogoUrl'] as String?,
      status: json['status'] as String,
      startsAt: DateTime.parse(json['startsAt'] as String),
      endsAt: DateTime.parse(json['endsAt'] as String),
      votingEndsAt: DateTime.parse(json['votingEndsAt'] as String),
      submissionCount: json['submissionCount'] as int? ?? 0,
      totalVotes: json['totalVotes'] as int? ?? 0,
      isPremiumEarlyAccess: json['isPremiumEarlyAccess'] as bool? ?? false,
      createdAt: DateTime.parse(json['createdAt'] as String),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      'titleJa': titleJa,
      'description': description,
      'descriptionJa': descriptionJa,
      'category': category,
      'difficulty': difficulty,
      'thumbnailUrl': thumbnailUrl,
      'sponsorName': sponsorName,
      'sponsorLogoUrl': sponsorLogoUrl,
      'status': status,
      'startsAt': startsAt.toIso8601String(),
      'endsAt': endsAt.toIso8601String(),
      'votingEndsAt': votingEndsAt.toIso8601String(),
      'submissionCount': submissionCount,
      'totalVotes': totalVotes,
      'isPremiumEarlyAccess': isPremiumEarlyAccess,
      'createdAt': createdAt.toIso8601String(),
    };
  }

  Challenge copyWith({
    String? id,
    String? title,
    String? titleJa,
    String? description,
    String? descriptionJa,
    String? category,
    String? difficulty,
    String? thumbnailUrl,
    String? sponsorName,
    String? sponsorLogoUrl,
    String? status,
    DateTime? startsAt,
    DateTime? endsAt,
    DateTime? votingEndsAt,
    int? submissionCount,
    int? totalVotes,
    bool? isPremiumEarlyAccess,
    DateTime? createdAt,
  }) {
    return Challenge(
      id: id ?? this.id,
      title: title ?? this.title,
      titleJa: titleJa ?? this.titleJa,
      description: description ?? this.description,
      descriptionJa: descriptionJa ?? this.descriptionJa,
      category: category ?? this.category,
      difficulty: difficulty ?? this.difficulty,
      thumbnailUrl: thumbnailUrl ?? this.thumbnailUrl,
      sponsorName: sponsorName ?? this.sponsorName,
      sponsorLogoUrl: sponsorLogoUrl ?? this.sponsorLogoUrl,
      status: status ?? this.status,
      startsAt: startsAt ?? this.startsAt,
      endsAt: endsAt ?? this.endsAt,
      votingEndsAt: votingEndsAt ?? this.votingEndsAt,
      submissionCount: submissionCount ?? this.submissionCount,
      totalVotes: totalVotes ?? this.totalVotes,
      isPremiumEarlyAccess: isPremiumEarlyAccess ?? this.isPremiumEarlyAccess,
      createdAt: createdAt ?? this.createdAt,
    );
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is Challenge &&
          runtimeType == other.runtimeType &&
          id == other.id;

  @override
  int get hashCode => id.hashCode;

  @override
  String toString() => 'Challenge(id: $id, title: $title, status: $status)';
}
