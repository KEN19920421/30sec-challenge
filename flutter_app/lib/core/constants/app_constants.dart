/// App-wide constants that do not change between environments.
class AppConstants {
  AppConstants._();

  // ---------------------------------------------------------------------------
  // App Info
  // ---------------------------------------------------------------------------
  static const String appName = '30 Sec Challenge';
  static const String appTagline = 'Create. Compete. Win.';

  // ---------------------------------------------------------------------------
  // Video
  // ---------------------------------------------------------------------------
  /// Maximum video recording duration in seconds.
  static const int maxVideoDurationSeconds = 30;

  /// Minimum video recording duration in seconds.
  static const int minVideoDurationSeconds = 5;

  /// Maximum video file size in bytes (50 MB).
  static const int maxVideoFileSizeBytes = 50 * 1024 * 1024;

  /// Supported video aspect ratio (9:16 vertical).
  static const double videoAspectRatio = 9 / 16;

  /// Video recording resolution width.
  static const int videoWidth = 1080;

  /// Video recording resolution height.
  static const int videoHeight = 1920;

  // ---------------------------------------------------------------------------
  // Content
  // ---------------------------------------------------------------------------
  /// Maximum characters in a video caption.
  static const int maxCaptionLength = 200;

  /// Maximum characters in a comment.
  static const int maxCommentLength = 500;

  /// Maximum characters in a bio.
  static const int maxBioLength = 150;

  /// Maximum characters in a display name.
  static const int maxDisplayNameLength = 30;

  /// Minimum characters in a username.
  static const int minUsernameLength = 3;

  /// Maximum characters in a username.
  static const int maxUsernameLength = 20;

  /// Minimum password length.
  static const int minPasswordLength = 8;

  // ---------------------------------------------------------------------------
  // Pagination
  // ---------------------------------------------------------------------------
  /// Default number of items per page.
  static const int defaultPageSize = 20;

  /// Number of items per page for feeds.
  static const int feedPageSize = 10;

  /// Number of items per page for comments.
  static const int commentsPageSize = 30;

  /// Number of items per page for leaderboards.
  static const int leaderboardPageSize = 50;

  // ---------------------------------------------------------------------------
  // Voting
  // ---------------------------------------------------------------------------
  /// Number of free daily votes.
  static const int freeDailyVotes = 10;

  /// Cost in coins for an extra vote.
  static const int extraVoteCoinCost = 5;

  // ---------------------------------------------------------------------------
  // Coins / Economy
  // ---------------------------------------------------------------------------
  /// Coins earned per vote cast.
  static const int coinsPerVote = 1;

  /// Coins earned per video uploaded.
  static const int coinsPerUpload = 5;

  /// Coins earned for daily login.
  static const int dailyLoginCoins = 3;

  /// Coins earned for watching a rewarded ad.
  static const int rewardedAdCoins = 10;

  // ---------------------------------------------------------------------------
  // Cache & Timing
  // ---------------------------------------------------------------------------
  /// Duration before cached data is considered stale.
  static const Duration cacheStaleThreshold = Duration(minutes: 5);

  /// Animation duration for page transitions.
  static const Duration pageTransitionDuration = Duration(milliseconds: 300);

  /// Debounce duration for search input.
  static const Duration searchDebounce = Duration(milliseconds: 400);

  /// Countdown timer interval.
  static const Duration countdownInterval = Duration(seconds: 1);

  // ---------------------------------------------------------------------------
  // Storage Keys
  // ---------------------------------------------------------------------------
  static const String keyOnboardingCompleted = 'onboarding_completed';
  static const String keyThemeMode = 'theme_mode';
  static const String keyLocale = 'locale';
  static const String keyUserId = 'user_id';
  static const String keyFcmToken = 'fcm_token';
  static const String keyLastSyncTime = 'last_sync_time';

  // ---------------------------------------------------------------------------
  // Secure Storage Keys
  // ---------------------------------------------------------------------------
  static const String keyAccessToken = 'access_token';
  static const String keyRefreshToken = 'refresh_token';

  // ---------------------------------------------------------------------------
  // Deep Link
  // ---------------------------------------------------------------------------
  static const String deepLinkScheme = 'thirtySecChallenge';
  static const String universalLinkHost = '30secchallenge.com';
}
