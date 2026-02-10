/// A purchasable boost tier that increases a submission's visibility.
class BoostTier {
  final String tier;
  final int cost;
  final double boostValue;
  final int durationHours;

  const BoostTier({
    required this.tier,
    required this.cost,
    required this.boostValue,
    required this.durationHours,
  });

  /// Display name for the tier.
  String get displayName {
    switch (tier) {
      case 'small':
        return 'Small Boost';
      case 'medium':
        return 'Medium Boost';
      case 'large':
        return 'Large Boost';
      default:
        return tier;
    }
  }

  /// Japanese display name.
  String get displayNameJa {
    switch (tier) {
      case 'small':
        return 'スモールブースト';
      case 'medium':
        return 'ミディアムブースト';
      case 'large':
        return 'ラージブースト';
      default:
        return tier;
    }
  }

  factory BoostTier.fromJson(Map<String, dynamic> json) {
    return BoostTier(
      tier: json['tier'] as String,
      cost: json['cost'] as int,
      boostValue: (json['boostValue'] as num).toDouble(),
      durationHours: json['durationHours'] as int,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'tier': tier,
      'cost': cost,
      'boostValue': boostValue,
      'durationHours': durationHours,
    };
  }
}
