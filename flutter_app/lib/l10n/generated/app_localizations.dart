import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:intl/intl.dart' as intl;

import 'app_localizations_en.dart';
import 'app_localizations_ja.dart';

// ignore_for_file: type=lint

/// Callers can lookup localized strings with an instance of AppLocalizations
/// returned by `AppLocalizations.of(context)`.
///
/// Applications need to include `AppLocalizations.delegate()` in their app's
/// `localizationDelegates` list, and the locales they support in the app's
/// `supportedLocales` list. For example:
///
/// ```dart
/// import 'generated/app_localizations.dart';
///
/// return MaterialApp(
///   localizationsDelegates: AppLocalizations.localizationsDelegates,
///   supportedLocales: AppLocalizations.supportedLocales,
///   home: MyApplicationHome(),
/// );
/// ```
///
/// ## Update pubspec.yaml
///
/// Please make sure to update your pubspec.yaml to include the following
/// packages:
///
/// ```yaml
/// dependencies:
///   # Internationalization support.
///   flutter_localizations:
///     sdk: flutter
///   intl: any # Use the pinned version from flutter_localizations
///
///   # Rest of dependencies
/// ```
///
/// ## iOS Applications
///
/// iOS applications define key application metadata, including supported
/// locales, in an Info.plist file that is built into the application bundle.
/// To configure the locales supported by your app, you’ll need to edit this
/// file.
///
/// First, open your project’s ios/Runner.xcworkspace Xcode workspace file.
/// Then, in the Project Navigator, open the Info.plist file under the Runner
/// project’s Runner folder.
///
/// Next, select the Information Property List item, select Add Item from the
/// Editor menu, then select Localizations from the pop-up menu.
///
/// Select and expand the newly-created Localizations item then, for each
/// locale your application supports, add a new item and select the locale
/// you wish to add from the pop-up menu in the Value field. This list should
/// be consistent with the languages listed in the AppLocalizations.supportedLocales
/// property.
abstract class AppLocalizations {
  AppLocalizations(String locale)
      : localeName = intl.Intl.canonicalizedLocale(locale.toString());

  final String localeName;

  static AppLocalizations? of(BuildContext context) {
    return Localizations.of<AppLocalizations>(context, AppLocalizations);
  }

  static const LocalizationsDelegate<AppLocalizations> delegate =
      _AppLocalizationsDelegate();

  /// A list of this localizations delegate along with the default localizations
  /// delegates.
  ///
  /// Returns a list of localizations delegates containing this delegate along with
  /// GlobalMaterialLocalizations.delegate, GlobalCupertinoLocalizations.delegate,
  /// and GlobalWidgetsLocalizations.delegate.
  ///
  /// Additional delegates can be added by appending to this list in
  /// MaterialApp. This list does not have to be used at all if a custom list
  /// of delegates is preferred or required.
  static const List<LocalizationsDelegate<dynamic>> localizationsDelegates =
      <LocalizationsDelegate<dynamic>>[
    delegate,
    GlobalMaterialLocalizations.delegate,
    GlobalCupertinoLocalizations.delegate,
    GlobalWidgetsLocalizations.delegate,
  ];

  /// A list of this localizations delegate's supported locales.
  static const List<Locale> supportedLocales = <Locale>[
    Locale('en'),
    Locale('ja')
  ];

  /// No description provided for @appTitle.
  ///
  /// In en, this message translates to:
  /// **'30sec Challenge'**
  String get appTitle;

  /// No description provided for @login.
  ///
  /// In en, this message translates to:
  /// **'Log In'**
  String get login;

  /// No description provided for @register.
  ///
  /// In en, this message translates to:
  /// **'Sign Up'**
  String get register;

  /// No description provided for @username.
  ///
  /// In en, this message translates to:
  /// **'Username'**
  String get username;

  /// No description provided for @displayName.
  ///
  /// In en, this message translates to:
  /// **'Display Name'**
  String get displayName;

  /// No description provided for @signInToContinue.
  ///
  /// In en, this message translates to:
  /// **'Sign in to continue'**
  String get signInToContinue;

  /// No description provided for @continueWithGoogle.
  ///
  /// In en, this message translates to:
  /// **'Continue with Google'**
  String get continueWithGoogle;

  /// No description provided for @continueWithApple.
  ///
  /// In en, this message translates to:
  /// **'Continue with Apple'**
  String get continueWithApple;

  /// No description provided for @displayNameRequired.
  ///
  /// In en, this message translates to:
  /// **'Display name is required'**
  String get displayNameRequired;

  /// No description provided for @displayNameMaxLength.
  ///
  /// In en, this message translates to:
  /// **'Max {length} characters'**
  String displayNameMaxLength(int length);

  /// No description provided for @usernameRequired.
  ///
  /// In en, this message translates to:
  /// **'Username is required'**
  String get usernameRequired;

  /// No description provided for @usernameMinLength.
  ///
  /// In en, this message translates to:
  /// **'At least {length} characters'**
  String usernameMinLength(int length);

  /// No description provided for @usernameMaxLength.
  ///
  /// In en, this message translates to:
  /// **'Max {length} characters'**
  String usernameMaxLength(int length);

  /// No description provided for @usernameInvalidChars.
  ///
  /// In en, this message translates to:
  /// **'Only letters, numbers, and underscores'**
  String get usernameInvalidChars;

  /// No description provided for @minCharacters.
  ///
  /// In en, this message translates to:
  /// **'Must be at least {count} characters'**
  String minCharacters(int count);

  /// No description provided for @usernameNotAvailable.
  ///
  /// In en, this message translates to:
  /// **'Username is not available'**
  String get usernameNotAvailable;

  /// No description provided for @onboardingTitle1.
  ///
  /// In en, this message translates to:
  /// **'Daily Challenges'**
  String get onboardingTitle1;

  /// No description provided for @onboardingDesc1.
  ///
  /// In en, this message translates to:
  /// **'Every day brings a new creative challenge. Show the world your unique take in just 30 seconds.'**
  String get onboardingDesc1;

  /// No description provided for @onboardingTitle2.
  ///
  /// In en, this message translates to:
  /// **'30-Second Videos'**
  String get onboardingTitle2;

  /// No description provided for @onboardingDesc2.
  ///
  /// In en, this message translates to:
  /// **'Record short, impactful videos and share your talent with a global community of creators.'**
  String get onboardingDesc2;

  /// No description provided for @onboardingTitle3.
  ///
  /// In en, this message translates to:
  /// **'Compete & Win'**
  String get onboardingTitle3;

  /// No description provided for @onboardingDesc3.
  ///
  /// In en, this message translates to:
  /// **'Climb the leaderboard, earn coins, and win prizes by getting votes from the community.'**
  String get onboardingDesc3;

  /// No description provided for @skip.
  ///
  /// In en, this message translates to:
  /// **'Skip'**
  String get skip;

  /// No description provided for @getStarted.
  ///
  /// In en, this message translates to:
  /// **'Get Started'**
  String get getStarted;

  /// No description provided for @next.
  ///
  /// In en, this message translates to:
  /// **'Next'**
  String get next;

  /// No description provided for @todaysChallenge.
  ///
  /// In en, this message translates to:
  /// **'Today\'s Challenge'**
  String get todaysChallenge;

  /// No description provided for @recordNow.
  ///
  /// In en, this message translates to:
  /// **'Record Now'**
  String get recordNow;

  /// No description provided for @timeRemaining.
  ///
  /// In en, this message translates to:
  /// **'Time Remaining'**
  String get timeRemaining;

  /// No description provided for @challengeHistory.
  ///
  /// In en, this message translates to:
  /// **'Challenge History'**
  String get challengeHistory;

  /// No description provided for @upcomingChallenges.
  ///
  /// In en, this message translates to:
  /// **'Coming Up'**
  String get upcomingChallenges;

  /// No description provided for @seeAll.
  ///
  /// In en, this message translates to:
  /// **'See All'**
  String get seeAll;

  /// No description provided for @live.
  ///
  /// In en, this message translates to:
  /// **'LIVE'**
  String get live;

  /// No description provided for @entriesCount.
  ///
  /// In en, this message translates to:
  /// **'{count} entries'**
  String entriesCount(int count);

  /// No description provided for @recordYourEntry.
  ///
  /// In en, this message translates to:
  /// **'Record Your Entry'**
  String get recordYourEntry;

  /// No description provided for @viewResults.
  ///
  /// In en, this message translates to:
  /// **'View Results'**
  String get viewResults;

  /// No description provided for @results.
  ///
  /// In en, this message translates to:
  /// **'Results'**
  String get results;

  /// No description provided for @fullRankings.
  ///
  /// In en, this message translates to:
  /// **'Full Rankings'**
  String get fullRankings;

  /// No description provided for @noResultsYet.
  ///
  /// In en, this message translates to:
  /// **'No results yet'**
  String get noResultsYet;

  /// No description provided for @failedToLoadResults.
  ///
  /// In en, this message translates to:
  /// **'Failed to load results'**
  String get failedToLoadResults;

  /// No description provided for @noPastChallenges.
  ///
  /// In en, this message translates to:
  /// **'No past challenges'**
  String get noPastChallenges;

  /// No description provided for @somethingWentWrong.
  ///
  /// In en, this message translates to:
  /// **'Something went wrong'**
  String get somethingWentWrong;

  /// No description provided for @submissions.
  ///
  /// In en, this message translates to:
  /// **'Submissions'**
  String get submissions;

  /// No description provided for @votes.
  ///
  /// In en, this message translates to:
  /// **'Votes'**
  String get votes;

  /// No description provided for @voting.
  ///
  /// In en, this message translates to:
  /// **'Voting'**
  String get voting;

  /// No description provided for @leaderboard.
  ///
  /// In en, this message translates to:
  /// **'Leaderboard'**
  String get leaderboard;

  /// No description provided for @profile.
  ///
  /// In en, this message translates to:
  /// **'Profile'**
  String get profile;

  /// No description provided for @discover.
  ///
  /// In en, this message translates to:
  /// **'Discover'**
  String get discover;

  /// No description provided for @settings.
  ///
  /// In en, this message translates to:
  /// **'Settings'**
  String get settings;

  /// No description provided for @notifications.
  ///
  /// In en, this message translates to:
  /// **'Notifications'**
  String get notifications;

  /// No description provided for @followers.
  ///
  /// In en, this message translates to:
  /// **'Followers'**
  String get followers;

  /// No description provided for @following.
  ///
  /// In en, this message translates to:
  /// **'Following'**
  String get following;

  /// No description provided for @follow.
  ///
  /// In en, this message translates to:
  /// **'Follow'**
  String get follow;

  /// No description provided for @unfollow.
  ///
  /// In en, this message translates to:
  /// **'Unfollow'**
  String get unfollow;

  /// No description provided for @editProfile.
  ///
  /// In en, this message translates to:
  /// **'Edit Profile'**
  String get editProfile;

  /// No description provided for @save.
  ///
  /// In en, this message translates to:
  /// **'Save'**
  String get save;

  /// No description provided for @bio.
  ///
  /// In en, this message translates to:
  /// **'Bio'**
  String get bio;

  /// No description provided for @camera.
  ///
  /// In en, this message translates to:
  /// **'Camera'**
  String get camera;

  /// No description provided for @gallery.
  ///
  /// In en, this message translates to:
  /// **'Gallery'**
  String get gallery;

  /// No description provided for @connections.
  ///
  /// In en, this message translates to:
  /// **'Connections'**
  String get connections;

  /// No description provided for @searchUsers.
  ///
  /// In en, this message translates to:
  /// **'Search users...'**
  String get searchUsers;

  /// No description provided for @followersTab.
  ///
  /// In en, this message translates to:
  /// **'Followers'**
  String get followersTab;

  /// No description provided for @followingTab.
  ///
  /// In en, this message translates to:
  /// **'Following'**
  String get followingTab;

  /// No description provided for @noFollowersYet.
  ///
  /// In en, this message translates to:
  /// **'No followers yet'**
  String get noFollowersYet;

  /// No description provided for @notFollowingYet.
  ///
  /// In en, this message translates to:
  /// **'Not following anyone yet'**
  String get notFollowingYet;

  /// No description provided for @getMore.
  ///
  /// In en, this message translates to:
  /// **'Get More'**
  String get getMore;

  /// No description provided for @superVote.
  ///
  /// In en, this message translates to:
  /// **'Super Vote'**
  String get superVote;

  /// No description provided for @watchAd.
  ///
  /// In en, this message translates to:
  /// **'Watch Ad'**
  String get watchAd;

  /// No description provided for @noThanks.
  ///
  /// In en, this message translates to:
  /// **'No Thanks'**
  String get noThanks;

  /// No description provided for @loadingSubmissions.
  ///
  /// In en, this message translates to:
  /// **'Loading submissions...'**
  String get loadingSubmissions;

  /// No description provided for @tryAgain.
  ///
  /// In en, this message translates to:
  /// **'Try Again'**
  String get tryAgain;

  /// No description provided for @allEntriesVoted.
  ///
  /// In en, this message translates to:
  /// **'You\'ve voted on all entries!'**
  String get allEntriesVoted;

  /// No description provided for @comeBackLaterForVotes.
  ///
  /// In en, this message translates to:
  /// **'Come back later for more submissions to vote on.'**
  String get comeBackLaterForVotes;

  /// No description provided for @goBack.
  ///
  /// In en, this message translates to:
  /// **'Go Back'**
  String get goBack;

  /// No description provided for @continueVoting.
  ///
  /// In en, this message translates to:
  /// **'Continue Voting'**
  String get continueVoting;

  /// No description provided for @daily.
  ///
  /// In en, this message translates to:
  /// **'Daily'**
  String get daily;

  /// No description provided for @weekly.
  ///
  /// In en, this message translates to:
  /// **'Weekly'**
  String get weekly;

  /// No description provided for @allTime.
  ///
  /// In en, this message translates to:
  /// **'All Time'**
  String get allTime;

  /// No description provided for @friends.
  ///
  /// In en, this message translates to:
  /// **'Friends'**
  String get friends;

  /// No description provided for @myRank.
  ///
  /// In en, this message translates to:
  /// **'My Rank'**
  String get myRank;

  /// No description provided for @rank.
  ///
  /// In en, this message translates to:
  /// **'Rank'**
  String get rank;

  /// No description provided for @score.
  ///
  /// In en, this message translates to:
  /// **'Score'**
  String get score;

  /// No description provided for @failedToLoadLeaderboard.
  ///
  /// In en, this message translates to:
  /// **'Failed to load leaderboard'**
  String get failedToLoadLeaderboard;

  /// No description provided for @howScoringWorks.
  ///
  /// In en, this message translates to:
  /// **'How Scoring Works'**
  String get howScoringWorks;

  /// No description provided for @gotIt.
  ///
  /// In en, this message translates to:
  /// **'Got it'**
  String get gotIt;

  /// No description provided for @recording.
  ///
  /// In en, this message translates to:
  /// **'Recording...'**
  String get recording;

  /// No description provided for @minimumRecordingDuration.
  ///
  /// In en, this message translates to:
  /// **'Record at least {seconds} seconds'**
  String minimumRecordingDuration(int seconds);

  /// No description provided for @close.
  ///
  /// In en, this message translates to:
  /// **'Close'**
  String get close;

  /// No description provided for @preview.
  ///
  /// In en, this message translates to:
  /// **'Preview'**
  String get preview;

  /// No description provided for @captionPlaceholder.
  ///
  /// In en, this message translates to:
  /// **'Add a caption...'**
  String get captionPlaceholder;

  /// No description provided for @retake.
  ///
  /// In en, this message translates to:
  /// **'Retake'**
  String get retake;

  /// No description provided for @failedToLoadPreview.
  ///
  /// In en, this message translates to:
  /// **'Failed to load video preview'**
  String get failedToLoadPreview;

  /// No description provided for @submit.
  ///
  /// In en, this message translates to:
  /// **'Submit'**
  String get submit;

  /// No description provided for @uploading.
  ///
  /// In en, this message translates to:
  /// **'Uploading...'**
  String get uploading;

  /// No description provided for @uploadComplete.
  ///
  /// In en, this message translates to:
  /// **'Upload Complete!'**
  String get uploadComplete;

  /// No description provided for @caption.
  ///
  /// In en, this message translates to:
  /// **'Caption'**
  String get caption;

  /// No description provided for @captionHint.
  ///
  /// In en, this message translates to:
  /// **'Add a caption (optional)'**
  String get captionHint;

  /// No description provided for @viewInFeed.
  ///
  /// In en, this message translates to:
  /// **'View in Feed'**
  String get viewInFeed;

  /// No description provided for @retryUpload.
  ///
  /// In en, this message translates to:
  /// **'Retry Upload'**
  String get retryUpload;

  /// No description provided for @goPro.
  ///
  /// In en, this message translates to:
  /// **'Go Pro'**
  String get goPro;

  /// No description provided for @unlockPotential.
  ///
  /// In en, this message translates to:
  /// **'Unlock your full potential'**
  String get unlockPotential;

  /// No description provided for @proMember.
  ///
  /// In en, this message translates to:
  /// **'You are a Pro member!'**
  String get proMember;

  /// No description provided for @renewsOn.
  ///
  /// In en, this message translates to:
  /// **'Renews on {date}'**
  String renewsOn(String date);

  /// No description provided for @proBenefits.
  ///
  /// In en, this message translates to:
  /// **'Pro Benefits'**
  String get proBenefits;

  /// No description provided for @choosePlan.
  ///
  /// In en, this message translates to:
  /// **'Choose Your Plan'**
  String get choosePlan;

  /// No description provided for @restorePurchases.
  ///
  /// In en, this message translates to:
  /// **'Restore Purchases'**
  String get restorePurchases;

  /// No description provided for @purchasesRestored.
  ///
  /// In en, this message translates to:
  /// **'Purchases restored.'**
  String get purchasesRestored;

  /// No description provided for @monthly.
  ///
  /// In en, this message translates to:
  /// **'Monthly'**
  String get monthly;

  /// No description provided for @annual.
  ///
  /// In en, this message translates to:
  /// **'Annual'**
  String get annual;

  /// No description provided for @noAds.
  ///
  /// In en, this message translates to:
  /// **'No Ads'**
  String get noAds;

  /// No description provided for @earlyAccess.
  ///
  /// In en, this message translates to:
  /// **'Early Challenge Access'**
  String get earlyAccess;

  /// No description provided for @premiumEffects.
  ///
  /// In en, this message translates to:
  /// **'Premium Effects'**
  String get premiumEffects;

  /// No description provided for @proBadge.
  ///
  /// In en, this message translates to:
  /// **'Pro Badge'**
  String get proBadge;

  /// No description provided for @freeSuperVotes.
  ///
  /// In en, this message translates to:
  /// **'3 Free Super Votes/Day'**
  String get freeSuperVotes;

  /// No description provided for @coinMultiplier.
  ///
  /// In en, this message translates to:
  /// **'1.5x Coin Multiplier'**
  String get coinMultiplier;

  /// No description provided for @detailedAnalytics.
  ///
  /// In en, this message translates to:
  /// **'Detailed Analytics'**
  String get detailedAnalytics;

  /// No description provided for @premiumGifts.
  ///
  /// In en, this message translates to:
  /// **'Premium Gifts'**
  String get premiumGifts;

  /// No description provided for @subscribe.
  ///
  /// In en, this message translates to:
  /// **'Subscribe'**
  String get subscribe;

  /// No description provided for @restore.
  ///
  /// In en, this message translates to:
  /// **'Restore Purchases'**
  String get restore;

  /// No description provided for @perMonth.
  ///
  /// In en, this message translates to:
  /// **'/month'**
  String get perMonth;

  /// No description provided for @perYear.
  ///
  /// In en, this message translates to:
  /// **'/year'**
  String get perYear;

  /// No description provided for @save33.
  ///
  /// In en, this message translates to:
  /// **'Save 33%'**
  String get save33;

  /// No description provided for @bestValue.
  ///
  /// In en, this message translates to:
  /// **'Best Value'**
  String get bestValue;

  /// No description provided for @sparks.
  ///
  /// In en, this message translates to:
  /// **'Sparks'**
  String get sparks;

  /// No description provided for @sparksStore.
  ///
  /// In en, this message translates to:
  /// **'Sparks Store'**
  String get sparksStore;

  /// No description provided for @getSparks.
  ///
  /// In en, this message translates to:
  /// **'Get Sparks'**
  String get getSparks;

  /// No description provided for @buyCoins.
  ///
  /// In en, this message translates to:
  /// **'Buy Sparks'**
  String get buyCoins;

  /// No description provided for @sendGift.
  ///
  /// In en, this message translates to:
  /// **'Send Gift'**
  String get sendGift;

  /// No description provided for @sendAGift.
  ///
  /// In en, this message translates to:
  /// **'Send a Gift'**
  String get sendAGift;

  /// No description provided for @quickTab.
  ///
  /// In en, this message translates to:
  /// **'Quick'**
  String get quickTab;

  /// No description provided for @standardTab.
  ///
  /// In en, this message translates to:
  /// **'Standard'**
  String get standardTab;

  /// No description provided for @premiumTab.
  ///
  /// In en, this message translates to:
  /// **'Premium'**
  String get premiumTab;

  /// No description provided for @giftMessageHint.
  ///
  /// In en, this message translates to:
  /// **'Add a message (optional)'**
  String get giftMessageHint;

  /// No description provided for @sendGiftButton.
  ///
  /// In en, this message translates to:
  /// **'Send {name} ({cost} Sparks)'**
  String sendGiftButton(String name, int cost);

  /// No description provided for @getMoreSparks.
  ///
  /// In en, this message translates to:
  /// **'Get More Sparks'**
  String get getMoreSparks;

  /// No description provided for @gifts.
  ///
  /// In en, this message translates to:
  /// **'Gifts'**
  String get gifts;

  /// No description provided for @shop.
  ///
  /// In en, this message translates to:
  /// **'Shop'**
  String get shop;

  /// No description provided for @noNotifications.
  ///
  /// In en, this message translates to:
  /// **'No notifications yet'**
  String get noNotifications;

  /// No description provided for @markAllRead.
  ///
  /// In en, this message translates to:
  /// **'Mark All Read'**
  String get markAllRead;

  /// No description provided for @notificationSettings.
  ///
  /// In en, this message translates to:
  /// **'Notification Settings'**
  String get notificationSettings;

  /// No description provided for @notifNewFollower.
  ///
  /// In en, this message translates to:
  /// **'New Follower'**
  String get notifNewFollower;

  /// No description provided for @notifNewFollowerDesc.
  ///
  /// In en, this message translates to:
  /// **'When someone follows you'**
  String get notifNewFollowerDesc;

  /// No description provided for @notifVoteReceived.
  ///
  /// In en, this message translates to:
  /// **'Vote Received'**
  String get notifVoteReceived;

  /// No description provided for @notifVoteReceivedDesc.
  ///
  /// In en, this message translates to:
  /// **'When someone votes on your submission'**
  String get notifVoteReceivedDesc;

  /// No description provided for @notifGiftReceived.
  ///
  /// In en, this message translates to:
  /// **'Gift Received'**
  String get notifGiftReceived;

  /// No description provided for @notifGiftReceivedDesc.
  ///
  /// In en, this message translates to:
  /// **'When someone sends you a gift'**
  String get notifGiftReceivedDesc;

  /// No description provided for @notifChallengeStart.
  ///
  /// In en, this message translates to:
  /// **'Challenge Start'**
  String get notifChallengeStart;

  /// No description provided for @notifChallengeStartDesc.
  ///
  /// In en, this message translates to:
  /// **'When a new challenge begins'**
  String get notifChallengeStartDesc;

  /// No description provided for @notifRankAchieved.
  ///
  /// In en, this message translates to:
  /// **'Rank Achieved'**
  String get notifRankAchieved;

  /// No description provided for @notifRankAchievedDesc.
  ///
  /// In en, this message translates to:
  /// **'When you place in a challenge'**
  String get notifRankAchievedDesc;

  /// No description provided for @notifAchievementEarned.
  ///
  /// In en, this message translates to:
  /// **'Achievement Earned'**
  String get notifAchievementEarned;

  /// No description provided for @notifAchievementEarnedDesc.
  ///
  /// In en, this message translates to:
  /// **'When you earn a new badge'**
  String get notifAchievementEarnedDesc;

  /// No description provided for @notifSubmissionStatus.
  ///
  /// In en, this message translates to:
  /// **'Submission Status'**
  String get notifSubmissionStatus;

  /// No description provided for @notifSubmissionStatusDesc.
  ///
  /// In en, this message translates to:
  /// **'Updates about your video processing'**
  String get notifSubmissionStatusDesc;

  /// No description provided for @notifMarketing.
  ///
  /// In en, this message translates to:
  /// **'Marketing'**
  String get notifMarketing;

  /// No description provided for @notifMarketingDesc.
  ///
  /// In en, this message translates to:
  /// **'Promotions, new features, and tips'**
  String get notifMarketingDesc;

  /// No description provided for @searchSubmissions.
  ///
  /// In en, this message translates to:
  /// **'Search submissions...'**
  String get searchSubmissions;

  /// No description provided for @trendingNow.
  ///
  /// In en, this message translates to:
  /// **'Trending Now'**
  String get trendingNow;

  /// No description provided for @failedToLoadFeed.
  ///
  /// In en, this message translates to:
  /// **'Failed to load feed'**
  String get failedToLoadFeed;

  /// No description provided for @reportUser.
  ///
  /// In en, this message translates to:
  /// **'Report User'**
  String get reportUser;

  /// No description provided for @blockUser.
  ///
  /// In en, this message translates to:
  /// **'Block User'**
  String get blockUser;

  /// No description provided for @reportUserConfirm.
  ///
  /// In en, this message translates to:
  /// **'Are you sure you want to report this user for inappropriate behavior?'**
  String get reportUserConfirm;

  /// No description provided for @userReported.
  ///
  /// In en, this message translates to:
  /// **'User reported. We will review this shortly.'**
  String get userReported;

  /// No description provided for @blockUserConfirm.
  ///
  /// In en, this message translates to:
  /// **'Blocked users cannot see your profile or interact with your content.'**
  String get blockUserConfirm;

  /// No description provided for @userBlocked.
  ///
  /// In en, this message translates to:
  /// **'User blocked.'**
  String get userBlocked;

  /// No description provided for @accountSection.
  ///
  /// In en, this message translates to:
  /// **'Account'**
  String get accountSection;

  /// No description provided for @subscriptionSection.
  ///
  /// In en, this message translates to:
  /// **'Subscription'**
  String get subscriptionSection;

  /// No description provided for @currentPlan.
  ///
  /// In en, this message translates to:
  /// **'Current Plan'**
  String get currentPlan;

  /// No description provided for @pro.
  ///
  /// In en, this message translates to:
  /// **'PRO'**
  String get pro;

  /// No description provided for @free.
  ///
  /// In en, this message translates to:
  /// **'Free'**
  String get free;

  /// No description provided for @manageSubscription.
  ///
  /// In en, this message translates to:
  /// **'Manage Subscription'**
  String get manageSubscription;

  /// No description provided for @privacySection.
  ///
  /// In en, this message translates to:
  /// **'Privacy'**
  String get privacySection;

  /// No description provided for @blockedUsers.
  ///
  /// In en, this message translates to:
  /// **'Blocked Users'**
  String get blockedUsers;

  /// No description provided for @appSection.
  ///
  /// In en, this message translates to:
  /// **'App'**
  String get appSection;

  /// No description provided for @english.
  ///
  /// In en, this message translates to:
  /// **'English'**
  String get english;

  /// No description provided for @japanese.
  ///
  /// In en, this message translates to:
  /// **'Japanese'**
  String get japanese;

  /// No description provided for @theme.
  ///
  /// In en, this message translates to:
  /// **'Theme'**
  String get theme;

  /// No description provided for @themeSystem.
  ///
  /// In en, this message translates to:
  /// **'System'**
  String get themeSystem;

  /// No description provided for @themeLight.
  ///
  /// In en, this message translates to:
  /// **'Light'**
  String get themeLight;

  /// No description provided for @themeDark.
  ///
  /// In en, this message translates to:
  /// **'Dark'**
  String get themeDark;

  /// No description provided for @termsOfService.
  ///
  /// In en, this message translates to:
  /// **'Terms of Service'**
  String get termsOfService;

  /// No description provided for @privacyPolicy.
  ///
  /// In en, this message translates to:
  /// **'Privacy Policy'**
  String get privacyPolicy;

  /// No description provided for @appVersion.
  ///
  /// In en, this message translates to:
  /// **'Version {version}'**
  String appVersion(String version);

  /// No description provided for @deleteAccountWarning.
  ///
  /// In en, this message translates to:
  /// **'This action is permanent and cannot be undone. All your data, submissions, and coin balance will be lost.'**
  String get deleteAccountWarning;

  /// No description provided for @selectLanguage.
  ///
  /// In en, this message translates to:
  /// **'Select Language'**
  String get selectLanguage;

  /// No description provided for @selectTheme.
  ///
  /// In en, this message translates to:
  /// **'Select Theme'**
  String get selectTheme;

  /// No description provided for @logoutConfirm.
  ///
  /// In en, this message translates to:
  /// **'Are you sure you want to log out?'**
  String get logoutConfirm;

  /// No description provided for @comingSoon.
  ///
  /// In en, this message translates to:
  /// **'Coming soon'**
  String get comingSoon;

  /// No description provided for @logout.
  ///
  /// In en, this message translates to:
  /// **'Log Out'**
  String get logout;

  /// No description provided for @deleteAccount.
  ///
  /// In en, this message translates to:
  /// **'Delete Account'**
  String get deleteAccount;

  /// No description provided for @language.
  ///
  /// In en, this message translates to:
  /// **'Language'**
  String get language;

  /// No description provided for @darkMode.
  ///
  /// In en, this message translates to:
  /// **'Dark Mode'**
  String get darkMode;

  /// No description provided for @about.
  ///
  /// In en, this message translates to:
  /// **'About'**
  String get about;

  /// No description provided for @share.
  ///
  /// In en, this message translates to:
  /// **'Share'**
  String get share;

  /// No description provided for @cancel.
  ///
  /// In en, this message translates to:
  /// **'Cancel'**
  String get cancel;

  /// No description provided for @confirm.
  ///
  /// In en, this message translates to:
  /// **'Confirm'**
  String get confirm;

  /// No description provided for @error.
  ///
  /// In en, this message translates to:
  /// **'Error'**
  String get error;

  /// No description provided for @retry.
  ///
  /// In en, this message translates to:
  /// **'Retry'**
  String get retry;

  /// No description provided for @loading.
  ///
  /// In en, this message translates to:
  /// **'Loading...'**
  String get loading;

  /// No description provided for @success.
  ///
  /// In en, this message translates to:
  /// **'Success'**
  String get success;

  /// No description provided for @proFeature.
  ///
  /// In en, this message translates to:
  /// **'Pro Feature'**
  String get proFeature;

  /// No description provided for @upgradeToUnlock.
  ///
  /// In en, this message translates to:
  /// **'Upgrade to Pro to unlock this feature'**
  String get upgradeToUnlock;

  /// No description provided for @challengeEndsIn.
  ///
  /// In en, this message translates to:
  /// **'Challenge ends in {time}'**
  String challengeEndsIn(String time);

  /// No description provided for @votesRemaining.
  ///
  /// In en, this message translates to:
  /// **'{count} votes remaining'**
  String votesRemaining(int count);

  /// No description provided for @noMoreEntries.
  ///
  /// In en, this message translates to:
  /// **'You\'ve voted on all entries!'**
  String get noMoreEntries;

  /// No description provided for @comeBackLater.
  ///
  /// In en, this message translates to:
  /// **'Come back later for more.'**
  String get comeBackLater;

  /// No description provided for @firstBoostFree.
  ///
  /// In en, this message translates to:
  /// **'First Boost Free!'**
  String get firstBoostFree;

  /// No description provided for @firstBoostFreeDesc.
  ///
  /// In en, this message translates to:
  /// **'Try your first Small boost for free — no Sparks needed!'**
  String get firstBoostFreeDesc;

  /// No description provided for @freeTrialLabel.
  ///
  /// In en, this message translates to:
  /// **'FREE'**
  String get freeTrialLabel;

  /// No description provided for @dailyRewardTitle.
  ///
  /// In en, this message translates to:
  /// **'Daily Login Bonus'**
  String get dailyRewardTitle;

  /// No description provided for @dailyRewardDesc.
  ///
  /// In en, this message translates to:
  /// **'Welcome back! Here are your daily Sparks.'**
  String get dailyRewardDesc;

  /// No description provided for @claimReward.
  ///
  /// In en, this message translates to:
  /// **'Claim Reward'**
  String get claimReward;

  /// No description provided for @dailyBonusClaimed.
  ///
  /// In en, this message translates to:
  /// **'Claimed today!'**
  String get dailyBonusClaimed;

  /// No description provided for @dailyBonusAvailable.
  ///
  /// In en, this message translates to:
  /// **'+3 Sparks available'**
  String get dailyBonusAvailable;

  /// No description provided for @earnFreeSparks.
  ///
  /// In en, this message translates to:
  /// **'Earn Free Sparks'**
  String get earnFreeSparks;

  /// No description provided for @watchAdForSparks.
  ///
  /// In en, this message translates to:
  /// **'Watch Ad for Sparks'**
  String get watchAdForSparks;

  /// No description provided for @watchAdForSparksDesc.
  ///
  /// In en, this message translates to:
  /// **'Watch a short video to earn 10 free Sparks!'**
  String get watchAdForSparksDesc;

  /// No description provided for @watchAdEarn10Sparks.
  ///
  /// In en, this message translates to:
  /// **'Watch Ad & Earn 10 Sparks'**
  String get watchAdEarn10Sparks;

  /// No description provided for @adsRemaining.
  ///
  /// In en, this message translates to:
  /// **'{count} ads remaining today'**
  String adsRemaining(int count);

  /// No description provided for @dailyAdLimitReached.
  ///
  /// In en, this message translates to:
  /// **'Daily ad limit reached'**
  String get dailyAdLimitReached;

  /// No description provided for @boostSubmission.
  ///
  /// In en, this message translates to:
  /// **'Boost Submission'**
  String get boostSubmission;

  /// No description provided for @boostDescription.
  ///
  /// In en, this message translates to:
  /// **'Boost this submission to increase its visibility in the feed'**
  String get boostDescription;

  /// No description provided for @boost.
  ///
  /// In en, this message translates to:
  /// **'Boost'**
  String get boost;

  /// No description provided for @boostPurchased.
  ///
  /// In en, this message translates to:
  /// **'Boost purchased!'**
  String get boostPurchased;

  /// No description provided for @boosted.
  ///
  /// In en, this message translates to:
  /// **'Boosted'**
  String get boosted;

  /// No description provided for @pickFromGallery.
  ///
  /// In en, this message translates to:
  /// **'Gallery'**
  String get pickFromGallery;

  /// No description provided for @editVideo.
  ///
  /// In en, this message translates to:
  /// **'Edit Video'**
  String get editVideo;

  /// No description provided for @trimVideo.
  ///
  /// In en, this message translates to:
  /// **'Trim'**
  String get trimVideo;

  /// No description provided for @filters.
  ///
  /// In en, this message translates to:
  /// **'Filters'**
  String get filters;

  /// No description provided for @addText.
  ///
  /// In en, this message translates to:
  /// **'Text'**
  String get addText;

  /// No description provided for @exporting.
  ///
  /// In en, this message translates to:
  /// **'Exporting...'**
  String get exporting;

  /// No description provided for @exportFailed.
  ///
  /// In en, this message translates to:
  /// **'Export failed'**
  String get exportFailed;
}

class _AppLocalizationsDelegate
    extends LocalizationsDelegate<AppLocalizations> {
  const _AppLocalizationsDelegate();

  @override
  Future<AppLocalizations> load(Locale locale) {
    return SynchronousFuture<AppLocalizations>(lookupAppLocalizations(locale));
  }

  @override
  bool isSupported(Locale locale) =>
      <String>['en', 'ja'].contains(locale.languageCode);

  @override
  bool shouldReload(_AppLocalizationsDelegate old) => false;
}

AppLocalizations lookupAppLocalizations(Locale locale) {
  // Lookup logic when only language code is specified.
  switch (locale.languageCode) {
    case 'en':
      return AppLocalizationsEn();
    case 'ja':
      return AppLocalizationsJa();
  }

  throw FlutterError(
      'AppLocalizations.delegate failed to load unsupported locale "$locale". This is likely '
      'an issue with the localizations generation tool. Please file an issue '
      'on GitHub with a reproducible sample app and the gen-l10n configuration '
      'that was used.');
}
