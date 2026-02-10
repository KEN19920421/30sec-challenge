import 'env.dart';
import '../constants/ad_constants.dart';

/// Central configuration for environment-specific values.
///
/// Provides API URLs, CDN paths, ad unit IDs, and other settings
/// that change between dev, staging, and production.
class AppConfig {
  final String apiBaseUrl;
  final String s3BaseUrl;
  final String cdnUrl;
  final String webSocketUrl;
  final Duration tokenRefreshThreshold;
  final Duration apiTimeout;

  const AppConfig({
    required this.apiBaseUrl,
    required this.s3BaseUrl,
    required this.cdnUrl,
    required this.webSocketUrl,
    this.tokenRefreshThreshold = const Duration(minutes: 5),
    this.apiTimeout = const Duration(seconds: 30),
  });

  /// Ad unit IDs are now provided by [AdConstants], which automatically
  /// selects test vs production IDs based on [EnvironmentConfig].
  String get bannerAdUnitId => AdConstants.bannerId;
  String get interstitialAdUnitId => AdConstants.interstitialId;
  String get rewardedAdUnitId => AdConstants.rewardedId;

  /// Development configuration pointing to local/dev servers.
  factory AppConfig.dev() {
    return const AppConfig(
      apiBaseUrl: 'http://localhost:3000',
      s3BaseUrl: 'https://dev-30sec-challenge.s3.amazonaws.com',
      cdnUrl: 'https://dev-cdn.30secchallenge.com',
      webSocketUrl: 'ws://localhost:3000/ws',
      apiTimeout: Duration(seconds: 60),
    );
  }

  /// Staging configuration for QA and pre-release testing.
  factory AppConfig.staging() {
    return const AppConfig(
      apiBaseUrl: 'https://staging-api.30secchallenge.com/api/v1',
      s3BaseUrl: 'https://staging-30sec-challenge.s3.amazonaws.com',
      cdnUrl: 'https://staging-cdn.30secchallenge.com',
      webSocketUrl: 'wss://staging-api.30secchallenge.com/ws',
    );
  }

  /// Production configuration for live users.
  factory AppConfig.prod() {
    return const AppConfig(
      apiBaseUrl: 'https://api.30secchallenge.com/api/v1',
      s3BaseUrl: 'https://30sec-challenge.s3.amazonaws.com',
      cdnUrl: 'https://cdn.30secchallenge.com',
      webSocketUrl: 'wss://api.30secchallenge.com/ws',
    );
  }

  /// Returns the config matching the current [EnvironmentConfig].
  factory AppConfig.fromEnvironment() {
    switch (EnvironmentConfig.current) {
      case Environment.dev:
        return AppConfig.dev();
      case Environment.staging:
        return AppConfig.staging();
      case Environment.prod:
        return AppConfig.prod();
    }
  }

  /// Singleton instance, initialized from current environment.
  static late final AppConfig instance;

  /// Call once at app startup after [EnvironmentConfig.initialize].
  static void initialize() {
    instance = AppConfig.fromEnvironment();
  }
}
