/// All API endpoint paths used throughout the app.
///
/// Organized by feature domain. All paths are relative to the API base URL
/// defined in [AppConfig].
class ApiConstants {
  ApiConstants._();

  // ---------------------------------------------------------------------------
  // Auth
  // ---------------------------------------------------------------------------
  static const String login = '/auth/login';
  static const String register = '/auth/register';
  static const String logout = '/auth/logout';
  static const String refreshToken = '/auth/refresh-token';
  static const String forgotPassword = '/auth/forgot-password';
  static const String resetPassword = '/auth/reset-password';
  static const String verifyEmail = '/auth/verify-email';
  static const String socialLogin = '/auth/social';
  static const String me = '/auth/me';

  // ---------------------------------------------------------------------------
  // Users / Profile
  // ---------------------------------------------------------------------------
  static const String currentUser = '/users/me';
  static const String updateProfile = '/users/me';
  static const String uploadAvatar = '/users/me/avatar';
  static const String changePassword = '/users/change-password';
  static const String deleteAccount = '/users/account';
  static String userProfile(String userId) => '/users/$userId';
  static String userVideos(String userId) => '/users/$userId/videos';
  static String userStats(String userId) => '/users/$userId/stats';

  // ---------------------------------------------------------------------------
  // Follow
  // ---------------------------------------------------------------------------
  static String followUser(String userId) => '/users/$userId/follow';
  static String unfollowUser(String userId) => '/users/$userId/unfollow';
  static String followers(String userId) => '/users/$userId/followers';
  static String following(String userId) => '/users/$userId/following';

  // ---------------------------------------------------------------------------
  // Challenges
  // ---------------------------------------------------------------------------
  static const String challenges = '/challenges';
  static const String activeChallenge = '/challenges/active';
  static String challengeById(String id) => '/challenges/$id';
  static String challengeLeaderboard(String id) => '/challenges/$id/leaderboard';
  static String challengeEntries(String id) => '/challenges/$id/entries';

  // ---------------------------------------------------------------------------
  // Videos / Entries
  // ---------------------------------------------------------------------------
  static const String videos = '/videos';
  static String videoById(String id) => '/videos/$id';
  static String likeVideo(String id) => '/videos/$id/like';
  static String unlikeVideo(String id) => '/videos/$id/unlike';
  static String reportVideo(String id) => '/videos/$id/report';
  static String videoComments(String id) => '/videos/$id/comments';
  static const String uploadVideo = '/videos/upload';
  static const String uploadUrl = '/videos/upload-url';

  // ---------------------------------------------------------------------------
  // Voting
  // ---------------------------------------------------------------------------
  static const String votingPair = '/voting/pair';
  static const String castVote = '/voting/vote';
  static String votingResults(String challengeId) =>
      '/voting/$challengeId/results';

  // ---------------------------------------------------------------------------
  // Feed
  // ---------------------------------------------------------------------------
  static const String feedForYou = '/feed/for-you';
  static const String feedFollowing = '/feed/following';
  static const String feedTrending = '/feed/trending';

  // ---------------------------------------------------------------------------
  // Notifications
  // ---------------------------------------------------------------------------
  static const String notifications = '/notifications';
  static const String notificationsRead = '/notifications/read';
  static const String notificationsSettings = '/notifications/settings';
  static String notificationById(String id) => '/notifications/$id';
  static const String registerDevice = '/notifications/device';

  // ---------------------------------------------------------------------------
  // Leaderboard
  // ---------------------------------------------------------------------------
  static const String globalLeaderboard = '/leaderboard';
  static const String weeklyLeaderboard = '/leaderboard/weekly';
  static const String monthlyLeaderboard = '/leaderboard/monthly';

  // ---------------------------------------------------------------------------
  // Shop / In-App Purchases
  // ---------------------------------------------------------------------------
  static const String shopItems = '/shop/items';
  static const String purchaseCoins = '/shop/coins';
  static const String purchaseSubscription = '/shop/subscription';
  static const String verifyReceipt = '/shop/verify-receipt';
  static const String coinBalance = '/shop/balance';

  // ---------------------------------------------------------------------------
  // Search
  // ---------------------------------------------------------------------------
  static const String searchUsers = '/search/users';
  static const String searchChallenges = '/search/challenges';
  static const String searchVideos = '/search/videos';

  // ---------------------------------------------------------------------------
  // Reports / Moderation
  // ---------------------------------------------------------------------------
  static const String reportUser = '/reports/user';
  static const String blockUser = '/reports/block';
  static const String unblockUser = '/reports/unblock';

  // ---------------------------------------------------------------------------
  // Comments
  // ---------------------------------------------------------------------------
  static const String comments = '/comments';
  static String commentById(String id) => '/comments/$id';
  static String likeComment(String id) => '/comments/$id/like';
}
