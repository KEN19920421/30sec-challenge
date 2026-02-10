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

  // ── Production IDs (TODO: Replace with your actual AdMob IDs) ──
  // Android
  static const _prodBannerAndroid = 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX';
  static const _prodInterstitialAndroid = 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX';
  static const _prodRewardedAndroid = 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX';
  static const _prodNativeAndroid = 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX';

  // iOS
  static const _prodBannerIos = 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX';
  static const _prodInterstitialIos = 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX';
  static const _prodRewardedIos = 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX';
  static const _prodNativeIos = 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX';

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
