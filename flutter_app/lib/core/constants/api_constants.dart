/// All API endpoint paths used throughout the app.
///
/// Organized by feature domain. All paths are relative to the API base URL
/// defined in [AppConfig].
class ApiConstants {
  ApiConstants._();

  static const String _prefix = '/api/v1';

  // ---------------------------------------------------------------------------
  // Auth
  // ---------------------------------------------------------------------------
  static const String login = '$_prefix/auth/login';
  static const String register = '$_prefix/auth/register';
  static const String logout = '$_prefix/auth/logout';
  static const String refreshToken = '$_prefix/auth/refresh';
  static const String forgotPassword = '$_prefix/auth/forgot-password';
  static const String resetPassword = '$_prefix/auth/reset-password';
  static const String verifyEmail = '$_prefix/auth/verify-email';
  static const String socialLogin = '$_prefix/auth/social';
  static const String devLogin = '$_prefix/auth/dev-login';
  static const String me = '$_prefix/auth/me';

  // ---------------------------------------------------------------------------
  // Users / Profile
  // ---------------------------------------------------------------------------
  static const String currentUser = '$_prefix/users/me';
  static const String updateProfile = '$_prefix/users/me';
  static const String uploadAvatar = '$_prefix/users/me/avatar';
  static const String changePassword = '$_prefix/users/change-password';
  static const String deleteAccount = '$_prefix/users/account';
  static String userProfile(String userId) => '$_prefix/users/$userId';
  static String userVideos(String userId) => '$_prefix/users/$userId/videos';
  static String userStats(String userId) => '$_prefix/users/$userId/stats';

  // ---------------------------------------------------------------------------
  // Follow
  // ---------------------------------------------------------------------------
  static String followUser(String userId) => '$_prefix/users/$userId/follow';
  static String unfollowUser(String userId) => '$_prefix/users/$userId/unfollow';
  static String followers(String userId) => '$_prefix/users/$userId/followers';
  static String following(String userId) => '$_prefix/users/$userId/following';

  // ---------------------------------------------------------------------------
  // Challenges
  // ---------------------------------------------------------------------------
  static const String challenges = '$_prefix/challenges';
  static const String activeChallenge = '$_prefix/challenges/active';
  static String challengeById(String id) => '$_prefix/challenges/$id';
  static String challengeLeaderboard(String id) => '$_prefix/challenges/$id/leaderboard';
  static String challengeEntries(String id) => '$_prefix/challenges/$id/entries';

  // ---------------------------------------------------------------------------
  // Videos / Entries
  // ---------------------------------------------------------------------------
  static const String videos = '$_prefix/videos';
  static String videoById(String id) => '$_prefix/videos/$id';
  static String likeVideo(String id) => '$_prefix/videos/$id/like';
  static String unlikeVideo(String id) => '$_prefix/videos/$id/unlike';
  static String reportVideo(String id) => '$_prefix/videos/$id/report';
  static String videoComments(String id) => '$_prefix/videos/$id/comments';
  static const String uploadVideo = '$_prefix/videos/upload';
  static const String uploadUrl = '$_prefix/videos/upload-url';

  // ---------------------------------------------------------------------------
  // Voting
  // ---------------------------------------------------------------------------
  static const String votingPair = '$_prefix/voting/pair';
  static const String castVote = '$_prefix/voting/vote';
  static String votingResults(String challengeId) =>
      '$_prefix/voting/$challengeId/results';

  // ---------------------------------------------------------------------------
  // Feed
  // ---------------------------------------------------------------------------
  static const String feedForYou = '$_prefix/feed/for-you';
  static const String feedFollowing = '$_prefix/feed/following';
  static const String feedTrending = '$_prefix/feed/trending';

  // ---------------------------------------------------------------------------
  // Notifications
  // ---------------------------------------------------------------------------
  static const String notifications = '$_prefix/notifications';
  static const String notificationsRead = '$_prefix/notifications/read';
  static const String notificationsSettings = '$_prefix/notifications/settings';
  static String notificationById(String id) => '$_prefix/notifications/$id';
  static const String registerDevice = '$_prefix/notifications/device';

  // ---------------------------------------------------------------------------
  // Leaderboard
  // ---------------------------------------------------------------------------
  static const String globalLeaderboard = '$_prefix/leaderboard';
  static const String weeklyLeaderboard = '$_prefix/leaderboard/weekly';
  static const String monthlyLeaderboard = '$_prefix/leaderboard/monthly';

  // ---------------------------------------------------------------------------
  // Shop / In-App Purchases
  // ---------------------------------------------------------------------------
  static const String shopItems = '$_prefix/shop/items';
  static const String purchaseCoins = '$_prefix/shop/coins';
  static const String purchaseSubscription = '$_prefix/shop/subscription';
  static const String verifyReceipt = '$_prefix/shop/verify-receipt';
  static const String coinBalance = '$_prefix/shop/balance';

  // ---------------------------------------------------------------------------
  // Search
  // ---------------------------------------------------------------------------
  static const String searchUsers = '$_prefix/search/users';
  static const String searchChallenges = '$_prefix/search/challenges';
  static const String searchVideos = '$_prefix/search/videos';

  // ---------------------------------------------------------------------------
  // Reports / Moderation
  // ---------------------------------------------------------------------------
  static const String reportUser = '$_prefix/reports/user';
  static const String blockUser = '$_prefix/reports/block';
  static const String unblockUser = '$_prefix/reports/unblock';

  // ---------------------------------------------------------------------------
  // Comments
  // ---------------------------------------------------------------------------
  static const String comments = '$_prefix/comments';
  static String commentById(String id) => '$_prefix/comments/$id';
  static String likeComment(String id) => '$_prefix/comments/$id/like';
}
