/// A subscription plan available for purchase (e.g. Pro Monthly, Pro Annual).
class SubscriptionPlan {
  final String id;
  final String name;
  final String appleProductId;
  final String googleProductId;
  final double priceUsd;
  final int durationMonths;
  final Map<String, dynamic> features;

  const SubscriptionPlan({
    required this.id,
    required this.name,
    required this.appleProductId,
    required this.googleProductId,
    required this.priceUsd,
    required this.durationMonths,
    this.features = const {},
  });

  /// Whether this is a monthly plan.
  bool get isMonthly => durationMonths == 1;

  /// Whether this is an annual plan.
  bool get isAnnual => durationMonths == 12;

  /// Effective monthly price for comparison.
  double get monthlyPrice => priceUsd / durationMonths;

  factory SubscriptionPlan.fromJson(Map<String, dynamic> json) {
    return SubscriptionPlan(
      id: json['id'] as String,
      name: json['name'] as String,
      appleProductId: json['appleProductId'] as String? ?? '',
      googleProductId: json['googleProductId'] as String? ?? '',
      priceUsd: (json['priceUsd'] as num?)?.toDouble() ?? 0.0,
      durationMonths: json['durationMonths'] as int? ?? 1,
      features: (json['features'] as Map<String, dynamic>?) ?? const {},
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'appleProductId': appleProductId,
      'googleProductId': googleProductId,
      'priceUsd': priceUsd,
      'durationMonths': durationMonths,
      'features': features,
    };
  }
}

/// A purchasable coin (Sparks) package.
class CoinPackage {
  final String id;
  final String name;
  final int coinAmount;
  final int bonusAmount;
  final double priceUsd;
  final bool isBestValue;

  const CoinPackage({
    required this.id,
    required this.name,
    required this.coinAmount,
    this.bonusAmount = 0,
    required this.priceUsd,
    this.isBestValue = false,
  });

  /// Total coins including bonus.
  int get totalCoins => coinAmount + bonusAmount;

  factory CoinPackage.fromJson(Map<String, dynamic> json) {
    return CoinPackage(
      id: json['id'] as String,
      name: json['name'] as String,
      coinAmount: json['coinAmount'] as int? ?? 0,
      bonusAmount: json['bonusAmount'] as int? ?? 0,
      priceUsd: (json['priceUsd'] as num?)?.toDouble() ?? 0.0,
      isBestValue: json['isBestValue'] as bool? ?? false,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'coinAmount': coinAmount,
      'bonusAmount': bonusAmount,
      'priceUsd': priceUsd,
      'isBestValue': isBestValue,
    };
  }
}

/// A gift item that can be sent to another user's submission.
class GiftItem {
  final String id;
  final String name;
  final String? nameJa;
  final String iconUrl;
  final String? animationUrl;
  final String category;
  final int coinCost;

  const GiftItem({
    required this.id,
    required this.name,
    this.nameJa,
    required this.iconUrl,
    this.animationUrl,
    required this.category,
    required this.coinCost,
  });

  /// Returns the localized name based on the given [locale].
  String localizedName(String locale) {
    if (locale == 'ja' && nameJa != null && nameJa!.isNotEmpty) {
      return nameJa!;
    }
    return name;
  }

  factory GiftItem.fromJson(Map<String, dynamic> json) {
    return GiftItem(
      id: json['id'] as String,
      name: json['name'] as String,
      nameJa: json['nameJa'] as String?,
      iconUrl: json['iconUrl'] as String? ?? '',
      animationUrl: json['animationUrl'] as String?,
      category: json['category'] as String? ?? 'standard',
      coinCost: json['coinCost'] as int? ?? 0,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'nameJa': nameJa,
      'iconUrl': iconUrl,
      'animationUrl': animationUrl,
      'category': category,
      'coinCost': coinCost,
    };
  }
}
