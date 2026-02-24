/// Domain entity for a user's weekly league membership.
class LeagueMembership {
  final String id;
  final String userId;
  final String username;
  final String displayName;
  final String? avatarUrl;
  final LeagueTier tier;
  final String seasonWeek; // ISO date of Monday
  final int points;
  final int? rank;
  final bool promoted;
  final bool relegated;

  const LeagueMembership({
    required this.id,
    required this.userId,
    required this.username,
    required this.displayName,
    this.avatarUrl,
    required this.tier,
    required this.seasonWeek,
    required this.points,
    this.rank,
    this.promoted = false,
    this.relegated = false,
  });

  factory LeagueMembership.fromJson(Map<String, dynamic> json) {
    return LeagueMembership(
      id: json['id'] as String? ?? '',
      userId: json['user_id'] as String? ?? '',
      username: json['username'] as String? ?? '',
      displayName: json['display_name'] as String? ?? '',
      avatarUrl: json['avatar_url'] as String?,
      tier: LeagueTier.fromString(json['tier'] as String? ?? 'bronze'),
      seasonWeek: json['season_week'] as String? ?? '',
      points: (json['points'] as num?)?.toInt() ?? 0,
      rank: (json['rank'] as num?)?.toInt(),
      promoted: json['promoted'] as bool? ?? false,
      relegated: json['relegated'] as bool? ?? false,
    );
  }
}

enum LeagueTier {
  bronze,
  silver,
  gold,
  diamond,
  master;

  static LeagueTier fromString(String s) {
    switch (s.toLowerCase()) {
      case 'silver':
        return LeagueTier.silver;
      case 'gold':
        return LeagueTier.gold;
      case 'diamond':
        return LeagueTier.diamond;
      case 'master':
        return LeagueTier.master;
      default:
        return LeagueTier.bronze;
    }
  }

  String get displayName {
    switch (this) {
      case LeagueTier.bronze:
        return 'Bronze';
      case LeagueTier.silver:
        return 'Silver';
      case LeagueTier.gold:
        return 'Gold';
      case LeagueTier.diamond:
        return 'Diamond';
      case LeagueTier.master:
        return 'Master';
    }
  }

  String get emoji {
    switch (this) {
      case LeagueTier.bronze:
        return '🥉';
      case LeagueTier.silver:
        return '🥈';
      case LeagueTier.gold:
        return '🥇';
      case LeagueTier.diamond:
        return '💎';
      case LeagueTier.master:
        return '👑';
    }
  }

  // Primary color value for this tier
  int get colorValue {
    switch (this) {
      case LeagueTier.bronze:
        return 0xFFCD7F32;
      case LeagueTier.silver:
        return 0xFF9E9E9E;
      case LeagueTier.gold:
        return 0xFFFFD700;
      case LeagueTier.diamond:
        return 0xFF00BCD4;
      case LeagueTier.master:
        return 0xFF9C27B0;
    }
  }
}
