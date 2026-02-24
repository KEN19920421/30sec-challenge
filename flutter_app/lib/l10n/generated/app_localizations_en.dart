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
  String get username => 'Username';

  @override
  String get displayName => 'Display Name';

  @override
  String get signInToContinue => 'Sign in to continue';

  @override
  String get continueWithGoogle => 'Continue with Google';

  @override
  String get continueWithApple => 'Continue with Apple';

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
  String minCharacters(int count) {
    return 'Must be at least $count characters';
  }

  @override
  String get usernameNotAvailable => 'Username is not available';

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
  String get navHome => 'Home';

  @override
  String get navRecord => 'Record';

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
  String get searchUsers => 'Users';

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
  String get searchSubmissions => 'Submissions';

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
  String get deleteAccountTitle => 'Delete Your Account';

  @override
  String get deleteAccountConfirm => 'Yes, Delete Account';

  @override
  String get deleteSubmission => 'Delete Submission';

  @override
  String get deleteSubmissionWarning =>
      'Are you sure you want to delete this submission? This action cannot be undone.';

  @override
  String get deleteSubmissionConfirm => 'Yes, Delete';

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

  @override
  String get firstBoostFree => 'First Boost Free!';

  @override
  String get firstBoostFreeDesc =>
      'Try your first Small boost for free — no Sparks needed!';

  @override
  String get freeTrialLabel => 'FREE';

  @override
  String get dailyRewardTitle => 'Daily Login Bonus';

  @override
  String get dailyRewardDesc => 'Welcome back! Here are your daily Sparks.';

  @override
  String get claimReward => 'Claim Reward';

  @override
  String get dailyBonusClaimed => 'Claimed today!';

  @override
  String get dailyBonusAvailable => '+3 Sparks available';

  @override
  String get earnFreeSparks => 'Earn Free Sparks';

  @override
  String get watchAdForSparks => 'Watch Ad for Sparks';

  @override
  String get watchAdForSparksDesc =>
      'Watch a short video to earn 10 free Sparks!';

  @override
  String get watchAdEarn10Sparks => 'Watch Ad & Earn 10 Sparks';

  @override
  String adsRemaining(int count) {
    return '$count ads remaining today';
  }

  @override
  String get dailyAdLimitReached => 'Daily ad limit reached';

  @override
  String get boostSubmission => 'Boost Submission';

  @override
  String get boostDescription =>
      'Boost this submission to increase its visibility in the feed';

  @override
  String get boost => 'Boost';

  @override
  String get boostPurchased => 'Boost purchased!';

  @override
  String get boosted => 'Boosted';

  @override
  String get pickFromGallery => 'Gallery';

  @override
  String get cameraUnavailable => 'Camera Unavailable';

  @override
  String get cameraUnavailableDescription =>
      'Camera could not be started. You can choose a video from your gallery instead.';

  @override
  String get editVideo => 'Edit Video';

  @override
  String get trimVideo => 'Trim';

  @override
  String get filters => 'Filters';

  @override
  String get addText => 'Text';

  @override
  String get exporting => 'Exporting...';

  @override
  String get exportFailed => 'Export failed';

  @override
  String get comments => 'Comments';

  @override
  String get addComment => 'Add a comment...';

  @override
  String get noCommentsYet => 'No comments yet';

  @override
  String get beFirstToComment => 'Be the first to comment!';

  @override
  String replyingTo(String username) {
    return 'Replying to @$username';
  }

  @override
  String repliesCount(int count) {
    return '$count replies';
  }

  @override
  String get reply => 'Reply';

  @override
  String get deleteComment => 'Delete';

  @override
  String get commentDeleted => 'Comment deleted';

  @override
  String get deletedComment => '[Deleted]';

  @override
  String replyTo(String username) {
    return 'Replying to @$username';
  }

  @override
  String get deleteCommentConfirm =>
      'Are you sure you want to delete this comment?';

  @override
  String get commentAdded => 'Comment added';

  @override
  String get viewReplies => 'View replies';

  @override
  String get mute => 'Mute';

  @override
  String get unmute => 'Unmute';

  @override
  String get devLogin => 'Dev Login';

  @override
  String get email => 'Email';

  @override
  String get password => 'Password';

  @override
  String get browseAsGuest => 'Browse as Guest';

  @override
  String get tapToStop => 'Tap to stop';

  @override
  String get trimRange => '5-30s range';

  @override
  String get dragTextToReposition => 'Drag text on preview to reposition';

  @override
  String get passwordWeak => 'Weak';

  @override
  String get passwordMedium => 'Medium';

  @override
  String get passwordStrong => 'Strong';

  @override
  String get shareSubmission => 'Share this submission';

  @override
  String get shareSubmissionLink => 'Check out this 30-second challenge entry!';

  @override
  String votesCastThisSession(int count) {
    return '$count votes cast this session';
  }

  @override
  String remainingLeft(int count) {
    return '$count left';
  }

  @override
  String submissionsCount(int count) {
    return '$count submissions';
  }

  @override
  String get rankings => 'Rankings';

  @override
  String get noRankingsYet => 'No rankings yet';

  @override
  String get submitToAppear => 'Submit to a challenge to appear here!';

  @override
  String get failedToLoadRankings => 'Failed to load rankings';

  @override
  String get uploadingEntry => 'Uploading your entry...';

  @override
  String percentComplete(int percent) {
    return '$percent% complete';
  }

  @override
  String get submissionComplete => 'Submission complete!';

  @override
  String get videoBeingProcessed => 'Your video is being processed';

  @override
  String get uploadFailed => 'Upload failed';

  @override
  String get preparingUpload => 'Preparing upload...';

  @override
  String get pleaseWait => 'Please wait';

  @override
  String get autoRedirectingSoon => 'Auto-redirecting in a moment...';

  @override
  String get goBackLabel => 'Go Back';

  @override
  String get cancelUpload => 'Cancel';

  @override
  String get pageNotFound => 'Page not found';

  @override
  String get goHome => 'Go Home';

  @override
  String get filterNone => 'None';

  @override
  String get filterVivid => 'Vivid';

  @override
  String get filterMono => 'Mono';

  @override
  String get filterSepia => 'Sepia';

  @override
  String get filterWarm => 'Warm';

  @override
  String get filterCool => 'Cool';

  @override
  String get filterFade => 'Fade';

  @override
  String get filterVintage => 'Vintage';

  @override
  String get submissionNotFound => 'Submission not found';

  @override
  String get submissionDetail => 'Submission';

  @override
  String exportFailedWithError(String error) {
    return 'Export failed: $error';
  }

  @override
  String get noFriendsOnLeaderboard => 'No Friends Yet';

  @override
  String get noLeaderboardEntries => 'No Entries Yet';

  @override
  String get noFriendsOnLeaderboardSubtitle =>
      'Follow friends to see them on the leaderboard';

  @override
  String get noLeaderboardEntriesSubtitle =>
      'Be the first to climb the rankings';

  @override
  String get noNotificationsYet => 'No Notifications Yet';

  @override
  String get noNotificationsSubtitle =>
      'You\'re all caught up! Check back later.';

  @override
  String get endsIn => 'Ends in';

  @override
  String get noActiveChallenge => 'No Active Challenge';

  @override
  String get nextChallengeComingSoon => 'The next challenge is almost here!';

  @override
  String get checkBackSoon => 'Check back soon for the next challenge.';

  @override
  String get topSubmissions => 'Top Submissions';

  @override
  String get viewAll => 'View All';

  @override
  String get entries => 'Entries';

  @override
  String get remaining => 'Remaining';

  @override
  String get winner => 'WINNER';

  @override
  String get subscriptionAutoRenews =>
      'Subscription auto-renews unless cancelled at least 24 hours before the end of the current period.';

  @override
  String get paymentCharged =>
      'Payment will be charged to your account at confirmation of purchase.';

  @override
  String get terms => 'Terms';

  @override
  String get privacy => 'Privacy';

  @override
  String get selectPlanFirst => 'Please select a plan.';

  @override
  String get purchaseFailed => 'Purchase failed. Please try again.';

  @override
  String get yourSparks => 'Your Sparks';

  @override
  String get failedToLoadProfile => 'Failed to load profile';

  @override
  String get scoringInfo => 'Scoring Info';

  @override
  String get notificationToday => 'Today';

  @override
  String get notificationYesterday => 'Yesterday';

  @override
  String get notificationThisWeek => 'This Week';

  @override
  String get notificationEarlier => 'Earlier';

  @override
  String get failedToDeleteAccount =>
      'Failed to delete account. Please try again.';

  @override
  String get failedToLoadChallenge => 'Failed to load challenge';

  @override
  String get deleteNotification => 'Delete notification';

  @override
  String get deleteNotificationConfirm =>
      'Are you sure you want to delete this notification?';

  @override
  String get unblock => 'Unblock';

  @override
  String get noBlockedUsers => 'No blocked users';

  @override
  String get unblockConfirm => 'Unblock this user?';

  @override
  String get votingHistory => 'Voting History';

  @override
  String get noVotingHistory => 'No votes yet';

  @override
  String get votedOn => 'Voted';

  @override
  String get editCaption => 'Edit Caption';

  @override
  String get captionUpdated => 'Caption updated';

  @override
  String get editComment => 'Edit Comment';

  @override
  String get saveComment => 'Save';

  @override
  String get commentUpdated => 'Comment updated';

  @override
  String get creatorAnalytics => 'Analytics';

  @override
  String get totalSubmissions => 'Total Submissions';

  @override
  String get totalVotes => 'Total Votes';

  @override
  String get avgVotes => 'Avg Votes';

  @override
  String get challengesWon => 'Challenges Won';

  @override
  String get totalCoinsEarned => 'Coins Earned';

  @override
  String get submissionAnalytics => 'Submission Analytics';

  @override
  String get upvotes => 'Upvotes';

  @override
  String get downvotes => 'Downvotes';

  @override
  String get superVotes => 'Super Votes';

  @override
  String get giftsReceived => 'Gifts Received';

  @override
  String get coverPhoto => 'Cover Photo';

  @override
  String get changeCoverPhoto => 'Change Cover Photo';

  @override
  String get coverPhotoUpdated => 'Cover photo updated!';

  @override
  String get failedToUpdateCoverPhoto => 'Failed to update cover photo.';

  @override
  String get search => 'Search';

  @override
  String get searchChallenges => 'Challenges';

  @override
  String get searchHint => 'Search users, challenges, submissions...';

  @override
  String get noSearchResults => 'No results found';

  @override
  String get searchPlaceholder => 'Start typing to search';

  @override
  String followerCount(int count) {
    return '$count followers';
  }

  @override
  String get validationEmailRequired => 'Email is required.';

  @override
  String get validationEmailInvalid => 'Enter a valid email address.';

  @override
  String get validationPasswordRequired => 'Password is required.';

  @override
  String get validationPasswordTooShort =>
      'Password must be at least 8 characters.';

  @override
  String get validationUsernameTooShort =>
      'Username must be at least 3 characters.';

  @override
  String get validationUsernameInvalid =>
      'Username can only contain letters, numbers, and underscores.';

  @override
  String get weeklyLeague => 'Weekly League';

  @override
  String get leagueRankings => 'Rankings';

  @override
  String leaguePoints(int points) {
    return '$points pts';
  }

  @override
  String get promoted => 'PROMOTED';

  @override
  String get relegated => 'RELEGATED';

  @override
  String weekOf(String date) {
    return 'Week of $date';
  }

  @override
  String get promotionLine => 'Top 20% promote next week';

  @override
  String get watchMode => 'Watch';

  @override
  String get exploreMode => 'Explore';

  @override
  String get sponsoredChallenge => 'SPONSORED';

  @override
  String prizeCoins(int coins) {
    return 'Prize: $coins coins';
  }

  @override
  String sponsoredBy(String name) {
    return 'Sponsored by $name';
  }

  @override
  String get premiumChallenge => 'Premium Challenge';

  @override
  String get premiumBenefitMonthly => 'Monthly Premium Challenge Access';

  @override
  String get premiumBenefitSuperVotes => 'Unlimited Super Votes';

  @override
  String get premiumBenefitNoAds => 'Ad-free Experience';

  @override
  String get premiumBenefitGiftRevenue => 'Gift Revenue +10%';

  @override
  String get premiumBenefitEarlyAccess => '24hr Early Access';

  @override
  String get premiumBenefitBadge => 'Premium Badge';

  @override
  String get creatorTier => 'Creator Tier';

  @override
  String get tierRookie => 'Rookie';

  @override
  String get tierRising => 'Rising';

  @override
  String get tierPartner => 'Partner';

  @override
  String get tierFeatured => 'Featured';

  @override
  String get noCreatorTier => 'Keep creating to earn a tier!';

  @override
  String giftRevenueShare(int percent) {
    return 'Gift revenue share: $percent%';
  }

  @override
  String duetWith(String username) {
    return '↩ duet with @$username';
  }

  @override
  String get recordDuet => 'Duet';

  @override
  String duetChallenge(String username) {
    return 'Dueting with @$username';
  }
}
