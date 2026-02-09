/// Named route constants used by [GoRouter] for type-safe navigation.
class RouteNames {
  RouteNames._();

  // ---------------------------------------------------------------------------
  // Auth
  // ---------------------------------------------------------------------------
  static const String login = 'login';
  static const String register = 'register';
  static const String forgotPassword = 'forgotPassword';
  static const String onboarding = 'onboarding';

  // ---------------------------------------------------------------------------
  // Main tabs (StatefulShellRoute branches)
  // ---------------------------------------------------------------------------
  static const String home = 'home';
  static const String discover = 'discover';
  static const String record = 'record';
  static const String leaderboard = 'leaderboard';
  static const String profile = 'profile';

  // ---------------------------------------------------------------------------
  // Challenge
  // ---------------------------------------------------------------------------
  static const String challengeDetail = 'challengeDetail';
  static const String preview = 'preview';
  static const String voting = 'voting';

  // ---------------------------------------------------------------------------
  // Feed
  // ---------------------------------------------------------------------------
  static const String feed = 'feed';

  // ---------------------------------------------------------------------------
  // Profile
  // ---------------------------------------------------------------------------
  static const String userProfile = 'userProfile';
  static const String editProfile = 'editProfile';
  static const String followers = 'followers';
  static const String following = 'following';

  // ---------------------------------------------------------------------------
  // Notifications
  // ---------------------------------------------------------------------------
  static const String notifications = 'notifications';

  // ---------------------------------------------------------------------------
  // Settings
  // ---------------------------------------------------------------------------
  static const String settings = 'settings';

  // ---------------------------------------------------------------------------
  // Shop
  // ---------------------------------------------------------------------------
  static const String shop = 'shop';
  static const String shopCoins = 'shopCoins';
  static const String shopSubscription = 'shopSubscription';
}
