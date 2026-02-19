import 'dart:io';
import '../config/env.dart';

/// Centralized ad unit ID configuration.
///
/// Replace the production IDs below with your actual AdMob unit IDs
/// from https://admob.google.com/
class AdConstants {
  AdConstants._();

  // ── Test IDs (Google's official test IDs) ──────────────────────
  static const _testBanner = 'ca-app-pub-3940256099942544/6300978111';
  static const _testInterstitial = 'ca-app-pub-3940256099942544/1033173712';
  static const _testRewarded = 'ca-app-pub-3940256099942544/5224354917';
  static const _testNative = 'ca-app-pub-3940256099942544/2247696110';

  // ── Production IDs ─────────────────────────────────────────
  // Android (App ID: ca-app-pub-3076631895164482~3138704463)
  static const _prodBannerAndroid = 'ca-app-pub-3076631895164482/6659147078';
  static const _prodInterstitialAndroid = 'ca-app-pub-3076631895164482/4775219768';
  static const _prodRewardedAndroid = 'ca-app-pub-3076631895164482/2719902068';
  static const _prodNativeAndroid = 'ca-app-pub-3076631895164482/4672004336';

  // iOS (App ID: ca-app-pub-3076631895164482~5533767669)
  static const _prodBannerIos = 'ca-app-pub-3076631895164482/8435263179';
  static const _prodInterstitialIos = 'ca-app-pub-3076631895164482/7014370298';
  static const _prodRewardedIos = 'ca-app-pub-3076631895164482/5809099831';
  static const _prodNativeIos = 'ca-app-pub-3076631895164482/7345542785';

  /// Whether to use test ads.
  static bool get _useTestAds => EnvironmentConfig.isDev;

  // ── Public getters ─────────────────────────────────────────────

  static String get bannerId {
    if (_useTestAds) return _testBanner;
    return Platform.isIOS ? _prodBannerIos : _prodBannerAndroid;
  }

  static String get interstitialId {
    if (_useTestAds) return _testInterstitial;
    return Platform.isIOS ? _prodInterstitialIos : _prodInterstitialAndroid;
  }

  static String get rewardedId {
    if (_useTestAds) return _testRewarded;
    return Platform.isIOS ? _prodRewardedIos : _prodRewardedAndroid;
  }

  static String get nativeId {
    if (_useTestAds) return _testNative;
    return Platform.isIOS ? _prodNativeIos : _prodNativeAndroid;
  }
}
