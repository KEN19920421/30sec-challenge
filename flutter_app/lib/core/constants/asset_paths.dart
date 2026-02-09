/// Centralized asset path constants.
///
/// All references to bundled images, animations, and icons go through here
/// so path changes only need to happen in one place.
class AssetPaths {
  AssetPaths._();

  // ---------------------------------------------------------------------------
  // Base directories
  // ---------------------------------------------------------------------------
  static const String _images = 'assets/images';
  static const String _animations = 'assets/animations';

  // ---------------------------------------------------------------------------
  // Images
  // ---------------------------------------------------------------------------
  static const String logo = '$_images/logo.png';
  static const String logoLight = '$_images/logo_light.png';
  static const String logoDark = '$_images/logo_dark.png';
  static const String onboarding1 = '$_images/onboarding_1.png';
  static const String onboarding2 = '$_images/onboarding_2.png';
  static const String onboarding3 = '$_images/onboarding_3.png';
  static const String placeholderAvatar = '$_images/placeholder_avatar.png';
  static const String placeholderVideo = '$_images/placeholder_video.png';
  static const String emptyState = '$_images/empty_state.png';
  static const String errorState = '$_images/error_state.png';
  static const String googleIcon = '$_images/google_icon.png';
  static const String appleIcon = '$_images/apple_icon.png';
  static const String coinIcon = '$_images/coin_icon.png';
  static const String crownIcon = '$_images/crown_icon.png';
  static const String trophyIcon = '$_images/trophy_icon.png';

  // ---------------------------------------------------------------------------
  // Lottie Animations
  // ---------------------------------------------------------------------------
  static const String loadingAnimation = '$_animations/loading.json';
  static const String successAnimation = '$_animations/success.json';
  static const String confettiAnimation = '$_animations/confetti.json';
  static const String heartAnimation = '$_animations/heart.json';
  static const String countdownAnimation = '$_animations/countdown.json';
  static const String emptyAnimation = '$_animations/empty.json';
  static const String recordingAnimation = '$_animations/recording.json';
  static const String uploadingAnimation = '$_animations/uploading.json';
  static const String votingAnimation = '$_animations/voting.json';
  static const String coinAnimation = '$_animations/coin.json';
}
