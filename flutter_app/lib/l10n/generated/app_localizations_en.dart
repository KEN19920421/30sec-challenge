// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for English (`en`).
class AppLocalizationsEn extends AppLocalizations {
  AppLocalizationsEn([String locale = 'en']) : super(locale);

  @override
  String get appTitle => '30sec Challenge';

  @override
  String get login => 'Log In';

  @override
  String get register => 'Sign Up';

  @override
  String get email => 'Email';

  @override
  String get password => 'Password';

  @override
  String get username => 'Username';

  @override
  String get displayName => 'Display Name';

  @override
  String get forgotPassword => 'Forgot Password?';

  @override
  String get orContinueWith => 'or continue with';

  @override
  String get dontHaveAccount => 'Don\'t have an account? ';

  @override
  String get alreadyHaveAccount => 'Already have an account? ';

  @override
  String get welcomeBack => 'Welcome Back';

  @override
  String get signInToContinue => 'Sign in to continue';

  @override
  String get emailPlaceholder => 'you@example.com';

  @override
  String get emailRequired => 'Email is required';

  @override
  String get enterValidEmail => 'Enter a valid email';

  @override
  String get passwordRequired => 'Password is required';

  @override
  String passwordMinLength(int length) {
    return 'Password must be at least $length characters';
  }

  @override
  String get continueWithGoogle => 'Continue with Google';

  @override
  String get continueWithApple => 'Continue with Apple';

  @override
  String get createAccount => 'Create Account';

  @override
  String get joinApp => 'Join the community';

  @override
  String get displayNamePlaceholder => 'John Doe';

  @override
  String get usernamePlaceholder => 'johndoe';

  @override
  String get usernameHelperText => 'Letters, numbers and underscores only';

  @override
  String get confirmPassword => 'Confirm Password';

  @override
  String get displayNameRequired => 'Display name is required';

  @override
  String displayNameMaxLength(int length) {
    return 'Max $length characters';
  }

  @override
  String get usernameRequired => 'Username is required';

  @override
  String usernameMinLength(int length) {
    return 'At least $length characters';
  }

  @override
  String usernameMaxLength(int length) {
    return 'Max $length characters';
  }

  @override
  String get usernameInvalidChars => 'Only letters, numbers, and underscores';

  @override
  String get confirmPasswordRequired => 'Please confirm your password';

  @override
  String get passwordsDoNotMatch => 'Passwords do not match';

  @override
  String minCharacters(int count) {
    return 'Must be at least $count characters';
  }

  @override
  String get usernameNotAvailable => 'Username is not available';

  @override
  String get resetPassword => 'Reset Password';

  @override
  String get forgotPasswordHeading => 'Forgot your password?';

  @override
  String get forgotPasswordDescription =>
      'Enter the email address associated with your account and we\'ll send you a link to reset your password.';

  @override
  String get sendResetLink => 'Send Reset Link';

  @override
  String get checkYourEmail => 'Check your email';

  @override
  String resetEmailSentMessage(String email) {
    return 'We\'ve sent a password reset link to\n$email';
  }

  @override
  String get backToLogin => 'Back to Log In';

  @override
  String get resetEmailError => 'Failed to send reset email. Please try again.';

  @override
  String get onboardingTitle1 => 'Daily Challenges';

  @override
  String get onboardingDesc1 =>
      'Every day brings a new creative challenge. Show the world your unique take in just 30 seconds.';

  @override
  String get onboardingTitle2 => '30-Second Videos';

  @override
  String get onboardingDesc2 =>
      'Record short, impactful videos and share your talent with a global community of creators.';

  @override
  String get onboardingTitle3 => 'Compete & Win';

  @override
  String get onboardingDesc3 =>
      'Climb the leaderboard, earn coins, and win prizes by getting votes from the community.';

  @override
  String get skip => 'Skip';

  @override
  String get getStarted => 'Get Started';

  @override
  String get next => 'Next';

  @override
  String get todaysChallenge => 'Today\'s Challenge';

  @override
  String get recordNow => 'Record Now';

  @override
  String get timeRemaining => 'Time Remaining';

  @override
  String get challengeHistory => 'Challenge History';

  @override
  String get upcomingChallenges => 'Coming Up';

  @override
  String get seeAll => 'See All';

  @override
  String get live => 'LIVE';

  @override
  String entriesCount(int count) {
    return '$count entries';
  }

  @override
  String get recordYourEntry => 'Record Your Entry';

  @override
  String get viewResults => 'View Results';

  @override
  String get results => 'Results';

  @override
  String get fullRankings => 'Full Rankings';

  @override
  String get noResultsYet => 'No results yet';

  @override
  String get failedToLoadResults => 'Failed to load results';

  @override
  String get noPastChallenges => 'No past challenges';

  @override
  String get somethingWentWrong => 'Something went wrong';

  @override
  String get submissions => 'Submissions';

  @override
  String get votes => 'Votes';

  @override
  String get voting => 'Voting';

  @override
  String get leaderboard => 'Leaderboard';

  @override
  String get profile => 'Profile';

  @override
  String get discover => 'Discover';

  @override
  String get settings => 'Settings';

  @override
  String get notifications => 'Notifications';

  @override
  String get followers => 'Followers';

  @override
  String get following => 'Following';

  @override
  String get follow => 'Follow';

  @override
  String get unfollow => 'Unfollow';

  @override
  String get editProfile => 'Edit Profile';

  @override
  String get save => 'Save';

  @override
  String get bio => 'Bio';

  @override
  String get camera => 'Camera';

  @override
  String get gallery => 'Gallery';

  @override
  String get connections => 'Connections';

  @override
  String get searchUsers => 'Search users...';

  @override
  String get followersTab => 'Followers';

  @override
  String get followingTab => 'Following';

  @override
  String get noFollowersYet => 'No followers yet';

  @override
  String get notFollowingYet => 'Not following anyone yet';

  @override
  String get getMore => 'Get More';

  @override
  String get superVote => 'Super Vote';

  @override
  String get watchAd => 'Watch Ad';

  @override
  String get noThanks => 'No Thanks';

  @override
  String get loadingSubmissions => 'Loading submissions...';

  @override
  String get tryAgain => 'Try Again';

  @override
  String get allEntriesVoted => 'You\'ve voted on all entries!';

  @override
  String get comeBackLaterForVotes =>
      'Come back later for more submissions to vote on.';

  @override
  String get goBack => 'Go Back';

  @override
  String get continueVoting => 'Continue Voting';

  @override
  String get daily => 'Daily';

  @override
  String get weekly => 'Weekly';

  @override
  String get allTime => 'All Time';

  @override
  String get friends => 'Friends';

  @override
  String get myRank => 'My Rank';

  @override
  String get rank => 'Rank';

  @override
  String get score => 'Score';

  @override
  String get failedToLoadLeaderboard => 'Failed to load leaderboard';

  @override
  String get howScoringWorks => 'How Scoring Works';

  @override
  String get gotIt => 'Got it';

  @override
  String get recording => 'Recording...';

  @override
  String minimumRecordingDuration(int seconds) {
    return 'Record at least $seconds seconds';
  }

  @override
  String get close => 'Close';

  @override
  String get preview => 'Preview';

  @override
  String get captionPlaceholder => 'Add a caption...';

  @override
  String get retake => 'Retake';

  @override
  String get failedToLoadPreview => 'Failed to load video preview';

  @override
  String get submit => 'Submit';

  @override
  String get uploading => 'Uploading...';

  @override
  String get uploadComplete => 'Upload Complete!';

  @override
  String get caption => 'Caption';

  @override
  String get captionHint => 'Add a caption (optional)';

  @override
  String get viewInFeed => 'View in Feed';

  @override
  String get retryUpload => 'Retry Upload';

  @override
  String get goPro => 'Go Pro';

  @override
  String get unlockPotential => 'Unlock your full potential';

  @override
  String get proMember => 'You are a Pro member!';

  @override
  String renewsOn(String date) {
    return 'Renews on $date';
  }

  @override
  String get proBenefits => 'Pro Benefits';

  @override
  String get choosePlan => 'Choose Your Plan';

  @override
  String get restorePurchases => 'Restore Purchases';

  @override
  String get purchasesRestored => 'Purchases restored.';

  @override
  String get monthly => 'Monthly';

  @override
  String get annual => 'Annual';

  @override
  String get noAds => 'No Ads';

  @override
  String get earlyAccess => 'Early Challenge Access';

  @override
  String get premiumEffects => 'Premium Effects';

  @override
  String get proBadge => 'Pro Badge';

  @override
  String get freeSuperVotes => '3 Free Super Votes/Day';

  @override
  String get coinMultiplier => '1.5x Coin Multiplier';

  @override
  String get detailedAnalytics => 'Detailed Analytics';

  @override
  String get premiumGifts => 'Premium Gifts';

  @override
  String get subscribe => 'Subscribe';

  @override
  String get restore => 'Restore Purchases';

  @override
  String get perMonth => '/month';

  @override
  String get perYear => '/year';

  @override
  String get save33 => 'Save 33%';

  @override
  String get bestValue => 'Best Value';

  @override
  String get sparks => 'Sparks';

  @override
  String get sparksStore => 'Sparks Store';

  @override
  String get getSparks => 'Get Sparks';

  @override
  String get buyCoins => 'Buy Sparks';

  @override
  String get sendGift => 'Send Gift';

  @override
  String get sendAGift => 'Send a Gift';

  @override
  String get quickTab => 'Quick';

  @override
  String get standardTab => 'Standard';

  @override
  String get premiumTab => 'Premium';

  @override
  String get giftMessageHint => 'Add a message (optional)';

  @override
  String sendGiftButton(String name, int cost) {
    return 'Send $name ($cost Sparks)';
  }

  @override
  String get getMoreSparks => 'Get More Sparks';

  @override
  String get gifts => 'Gifts';

  @override
  String get shop => 'Shop';

  @override
  String get noNotifications => 'No notifications yet';

  @override
  String get markAllRead => 'Mark All Read';

  @override
  String get notificationSettings => 'Notification Settings';

  @override
  String get notifNewFollower => 'New Follower';

  @override
  String get notifNewFollowerDesc => 'When someone follows you';

  @override
  String get notifVoteReceived => 'Vote Received';

  @override
  String get notifVoteReceivedDesc => 'When someone votes on your submission';

  @override
  String get notifGiftReceived => 'Gift Received';

  @override
  String get notifGiftReceivedDesc => 'When someone sends you a gift';

  @override
  String get notifChallengeStart => 'Challenge Start';

  @override
  String get notifChallengeStartDesc => 'When a new challenge begins';

  @override
  String get notifRankAchieved => 'Rank Achieved';

  @override
  String get notifRankAchievedDesc => 'When you place in a challenge';

  @override
  String get notifAchievementEarned => 'Achievement Earned';

  @override
  String get notifAchievementEarnedDesc => 'When you earn a new badge';

  @override
  String get notifSubmissionStatus => 'Submission Status';

  @override
  String get notifSubmissionStatusDesc => 'Updates about your video processing';

  @override
  String get notifMarketing => 'Marketing';

  @override
  String get notifMarketingDesc => 'Promotions, new features, and tips';

  @override
  String get searchSubmissions => 'Search submissions...';

  @override
  String get trendingNow => 'Trending Now';

  @override
  String get failedToLoadFeed => 'Failed to load feed';

  @override
  String get reportUser => 'Report User';

  @override
  String get blockUser => 'Block User';

  @override
  String get reportUserConfirm =>
      'Are you sure you want to report this user for inappropriate behavior?';

  @override
  String get userReported => 'User reported. We will review this shortly.';

  @override
  String get blockUserConfirm =>
      'Blocked users cannot see your profile or interact with your content.';

  @override
  String get userBlocked => 'User blocked.';

  @override
  String get accountSection => 'Account';

  @override
  String get changePassword => 'Change Password';

  @override
  String get subscriptionSection => 'Subscription';

  @override
  String get currentPlan => 'Current Plan';

  @override
  String get pro => 'PRO';

  @override
  String get free => 'Free';

  @override
  String get manageSubscription => 'Manage Subscription';

  @override
  String get privacySection => 'Privacy';

  @override
  String get blockedUsers => 'Blocked Users';

  @override
  String get appSection => 'App';

  @override
  String get english => 'English';

  @override
  String get japanese => 'Japanese';

  @override
  String get theme => 'Theme';

  @override
  String get themeSystem => 'System';

  @override
  String get themeLight => 'Light';

  @override
  String get themeDark => 'Dark';

  @override
  String get termsOfService => 'Terms of Service';

  @override
  String get privacyPolicy => 'Privacy Policy';

  @override
  String appVersion(String version) {
    return 'Version $version';
  }

  @override
  String get currentPassword => 'Current Password';

  @override
  String get newPassword => 'New Password';

  @override
  String get confirmNewPassword => 'Confirm New Password';

  @override
  String get update => 'Update';

  @override
  String get passwordUpdated => 'Password updated!';

  @override
  String get deleteAccountWarning =>
      'This action is permanent and cannot be undone. All your data, submissions, and coin balance will be lost.';

  @override
  String get selectLanguage => 'Select Language';

  @override
  String get selectTheme => 'Select Theme';

  @override
  String get logoutConfirm => 'Are you sure you want to log out?';

  @override
  String get comingSoon => 'Coming soon';

  @override
  String get logout => 'Log Out';

  @override
  String get deleteAccount => 'Delete Account';

  @override
  String get language => 'Language';

  @override
  String get darkMode => 'Dark Mode';

  @override
  String get about => 'About';

  @override
  String get share => 'Share';

  @override
  String get cancel => 'Cancel';

  @override
  String get confirm => 'Confirm';

  @override
  String get error => 'Error';

  @override
  String get retry => 'Retry';

  @override
  String get loading => 'Loading...';

  @override
  String get success => 'Success';

  @override
  String get proFeature => 'Pro Feature';

  @override
  String get upgradeToUnlock => 'Upgrade to Pro to unlock this feature';

  @override
  String challengeEndsIn(String time) {
    return 'Challenge ends in $time';
  }

  @override
  String votesRemaining(int count) {
    return '$count votes remaining';
  }

  @override
  String get noMoreEntries => 'You\'ve voted on all entries!';

  @override
  String get comeBackLater => 'Come back later for more.';
}
