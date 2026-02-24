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

  /// No description provided for @navHome.
  ///
  /// In en, this message translates to:
  /// **'Home'**
  String get navHome;

  /// No description provided for @navRecord.
  ///
  /// In en, this message translates to:
  /// **'Record'**
  String get navRecord;

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
  /// **'Users'**
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
  /// **'Submissions'**
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

  /// No description provided for @deleteAccountTitle.
  ///
  /// In en, this message translates to:
  /// **'Delete Your Account'**
  String get deleteAccountTitle;

  /// No description provided for @deleteAccountConfirm.
  ///
  /// In en, this message translates to:
  /// **'Yes, Delete Account'**
  String get deleteAccountConfirm;

  /// No description provided for @deleteSubmission.
  ///
  /// In en, this message translates to:
  /// **'Delete Submission'**
  String get deleteSubmission;

  /// No description provided for @deleteSubmissionWarning.
  ///
  /// In en, this message translates to:
  /// **'Are you sure you want to delete this submission? This action cannot be undone.'**
  String get deleteSubmissionWarning;

  /// No description provided for @deleteSubmissionConfirm.
  ///
  /// In en, this message translates to:
  /// **'Yes, Delete'**
  String get deleteSubmissionConfirm;

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

  /// No description provided for @cameraUnavailable.
  ///
  /// In en, this message translates to:
  /// **'Camera Unavailable'**
  String get cameraUnavailable;

  /// No description provided for @cameraUnavailableDescription.
  ///
  /// In en, this message translates to:
  /// **'Camera could not be started. You can choose a video from your gallery instead.'**
  String get cameraUnavailableDescription;

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

  /// No description provided for @comments.
  ///
  /// In en, this message translates to:
  /// **'Comments'**
  String get comments;

  /// No description provided for @addComment.
  ///
  /// In en, this message translates to:
  /// **'Add a comment...'**
  String get addComment;

  /// No description provided for @noCommentsYet.
  ///
  /// In en, this message translates to:
  /// **'No comments yet'**
  String get noCommentsYet;

  /// No description provided for @beFirstToComment.
  ///
  /// In en, this message translates to:
  /// **'Be the first to comment!'**
  String get beFirstToComment;

  /// No description provided for @replyingTo.
  ///
  /// In en, this message translates to:
  /// **'Replying to @{username}'**
  String replyingTo(String username);

  /// No description provided for @repliesCount.
  ///
  /// In en, this message translates to:
  /// **'{count} replies'**
  String repliesCount(int count);

  /// No description provided for @reply.
  ///
  /// In en, this message translates to:
  /// **'Reply'**
  String get reply;

  /// No description provided for @deleteComment.
  ///
  /// In en, this message translates to:
  /// **'Delete'**
  String get deleteComment;

  /// No description provided for @commentDeleted.
  ///
  /// In en, this message translates to:
  /// **'Comment deleted'**
  String get commentDeleted;

  /// No description provided for @deletedComment.
  ///
  /// In en, this message translates to:
  /// **'[Deleted]'**
  String get deletedComment;

  /// No description provided for @replyTo.
  ///
  /// In en, this message translates to:
  /// **'Replying to @{username}'**
  String replyTo(String username);

  /// No description provided for @deleteCommentConfirm.
  ///
  /// In en, this message translates to:
  /// **'Are you sure you want to delete this comment?'**
  String get deleteCommentConfirm;

  /// No description provided for @commentAdded.
  ///
  /// In en, this message translates to:
  /// **'Comment added'**
  String get commentAdded;

  /// No description provided for @viewReplies.
  ///
  /// In en, this message translates to:
  /// **'View replies'**
  String get viewReplies;

  /// No description provided for @mute.
  ///
  /// In en, this message translates to:
  /// **'Mute'**
  String get mute;

  /// No description provided for @unmute.
  ///
  /// In en, this message translates to:
  /// **'Unmute'**
  String get unmute;

  /// No description provided for @devLogin.
  ///
  /// In en, this message translates to:
  /// **'Dev Login'**
  String get devLogin;

  /// No description provided for @email.
  ///
  /// In en, this message translates to:
  /// **'Email'**
  String get email;

  /// No description provided for @password.
  ///
  /// In en, this message translates to:
  /// **'Password'**
  String get password;

  /// No description provided for @browseAsGuest.
  ///
  /// In en, this message translates to:
  /// **'Browse as Guest'**
  String get browseAsGuest;

  /// No description provided for @tapToStop.
  ///
  /// In en, this message translates to:
  /// **'Tap to stop'**
  String get tapToStop;

  /// No description provided for @trimRange.
  ///
  /// In en, this message translates to:
  /// **'5-30s range'**
  String get trimRange;

  /// No description provided for @dragTextToReposition.
  ///
  /// In en, this message translates to:
  /// **'Drag text on preview to reposition'**
  String get dragTextToReposition;

  /// No description provided for @passwordWeak.
  ///
  /// In en, this message translates to:
  /// **'Weak'**
  String get passwordWeak;

  /// No description provided for @passwordMedium.
  ///
  /// In en, this message translates to:
  /// **'Medium'**
  String get passwordMedium;

  /// No description provided for @passwordStrong.
  ///
  /// In en, this message translates to:
  /// **'Strong'**
  String get passwordStrong;

  /// No description provided for @shareSubmission.
  ///
  /// In en, this message translates to:
  /// **'Share this submission'**
  String get shareSubmission;

  /// No description provided for @shareSubmissionLink.
  ///
  /// In en, this message translates to:
  /// **'Check out this 30-second challenge entry!'**
  String get shareSubmissionLink;

  /// No description provided for @votesCastThisSession.
  ///
  /// In en, this message translates to:
  /// **'{count} votes cast this session'**
  String votesCastThisSession(int count);

  /// No description provided for @remainingLeft.
  ///
  /// In en, this message translates to:
  /// **'{count} left'**
  String remainingLeft(int count);

  /// No description provided for @submissionsCount.
  ///
  /// In en, this message translates to:
  /// **'{count} submissions'**
  String submissionsCount(int count);

  /// No description provided for @rankings.
  ///
  /// In en, this message translates to:
  /// **'Rankings'**
  String get rankings;

  /// No description provided for @noRankingsYet.
  ///
  /// In en, this message translates to:
  /// **'No rankings yet'**
  String get noRankingsYet;

  /// No description provided for @submitToAppear.
  ///
  /// In en, this message translates to:
  /// **'Submit to a challenge to appear here!'**
  String get submitToAppear;

  /// No description provided for @failedToLoadRankings.
  ///
  /// In en, this message translates to:
  /// **'Failed to load rankings'**
  String get failedToLoadRankings;

  /// No description provided for @uploadingEntry.
  ///
  /// In en, this message translates to:
  /// **'Uploading your entry...'**
  String get uploadingEntry;

  /// No description provided for @percentComplete.
  ///
  /// In en, this message translates to:
  /// **'{percent}% complete'**
  String percentComplete(int percent);

  /// No description provided for @submissionComplete.
  ///
  /// In en, this message translates to:
  /// **'Submission complete!'**
  String get submissionComplete;

  /// No description provided for @videoBeingProcessed.
  ///
  /// In en, this message translates to:
  /// **'Your video is being processed'**
  String get videoBeingProcessed;

  /// No description provided for @uploadFailed.
  ///
  /// In en, this message translates to:
  /// **'Upload failed'**
  String get uploadFailed;

  /// No description provided for @preparingUpload.
  ///
  /// In en, this message translates to:
  /// **'Preparing upload...'**
  String get preparingUpload;

  /// No description provided for @pleaseWait.
  ///
  /// In en, this message translates to:
  /// **'Please wait'**
  String get pleaseWait;

  /// No description provided for @autoRedirectingSoon.
  ///
  /// In en, this message translates to:
  /// **'Auto-redirecting in a moment...'**
  String get autoRedirectingSoon;

  /// No description provided for @goBackLabel.
  ///
  /// In en, this message translates to:
  /// **'Go Back'**
  String get goBackLabel;

  /// No description provided for @cancelUpload.
  ///
  /// In en, this message translates to:
  /// **'Cancel'**
  String get cancelUpload;

  /// No description provided for @pageNotFound.
  ///
  /// In en, this message translates to:
  /// **'Page not found'**
  String get pageNotFound;

  /// No description provided for @goHome.
  ///
  /// In en, this message translates to:
  /// **'Go Home'**
  String get goHome;

  /// No description provided for @filterNone.
  ///
  /// In en, this message translates to:
  /// **'None'**
  String get filterNone;

  /// No description provided for @filterVivid.
  ///
  /// In en, this message translates to:
  /// **'Vivid'**
  String get filterVivid;

  /// No description provided for @filterMono.
  ///
  /// In en, this message translates to:
  /// **'Mono'**
  String get filterMono;

  /// No description provided for @filterSepia.
  ///
  /// In en, this message translates to:
  /// **'Sepia'**
  String get filterSepia;

  /// No description provided for @filterWarm.
  ///
  /// In en, this message translates to:
  /// **'Warm'**
  String get filterWarm;

  /// No description provided for @filterCool.
  ///
  /// In en, this message translates to:
  /// **'Cool'**
  String get filterCool;

  /// No description provided for @filterFade.
  ///
  /// In en, this message translates to:
  /// **'Fade'**
  String get filterFade;

  /// No description provided for @filterVintage.
  ///
  /// In en, this message translates to:
  /// **'Vintage'**
  String get filterVintage;

  /// No description provided for @submissionNotFound.
  ///
  /// In en, this message translates to:
  /// **'Submission not found'**
  String get submissionNotFound;

  /// No description provided for @submissionDetail.
  ///
  /// In en, this message translates to:
  /// **'Submission'**
  String get submissionDetail;

  /// No description provided for @exportFailedWithError.
  ///
  /// In en, this message translates to:
  /// **'Export failed: {error}'**
  String exportFailedWithError(String error);

  /// Title when no friends are on the leaderboard
  ///
  /// In en, this message translates to:
  /// **'No Friends Yet'**
  String get noFriendsOnLeaderboard;

  /// Title when no leaderboard entries exist
  ///
  /// In en, this message translates to:
  /// **'No Entries Yet'**
  String get noLeaderboardEntries;

  /// Subtitle when no friends are on the leaderboard
  ///
  /// In en, this message translates to:
  /// **'Follow friends to see them on the leaderboard'**
  String get noFriendsOnLeaderboardSubtitle;

  /// Subtitle when no leaderboard entries exist
  ///
  /// In en, this message translates to:
  /// **'Be the first to climb the rankings'**
  String get noLeaderboardEntriesSubtitle;

  /// Title when there are no notifications
  ///
  /// In en, this message translates to:
  /// **'No Notifications Yet'**
  String get noNotificationsYet;

  /// Subtitle when there are no notifications
  ///
  /// In en, this message translates to:
  /// **'You\'re all caught up! Check back later.'**
  String get noNotificationsSubtitle;

  /// No description provided for @endsIn.
  ///
  /// In en, this message translates to:
  /// **'Ends in'**
  String get endsIn;

  /// No description provided for @noActiveChallenge.
  ///
  /// In en, this message translates to:
  /// **'No Active Challenge'**
  String get noActiveChallenge;

  /// No description provided for @nextChallengeComingSoon.
  ///
  /// In en, this message translates to:
  /// **'The next challenge is almost here!'**
  String get nextChallengeComingSoon;

  /// No description provided for @checkBackSoon.
  ///
  /// In en, this message translates to:
  /// **'Check back soon for the next challenge.'**
  String get checkBackSoon;

  /// No description provided for @topSubmissions.
  ///
  /// In en, this message translates to:
  /// **'Top Submissions'**
  String get topSubmissions;

  /// No description provided for @viewAll.
  ///
  /// In en, this message translates to:
  /// **'View All'**
  String get viewAll;

  /// No description provided for @entries.
  ///
  /// In en, this message translates to:
  /// **'Entries'**
  String get entries;

  /// No description provided for @remaining.
  ///
  /// In en, this message translates to:
  /// **'Remaining'**
  String get remaining;

  /// No description provided for @winner.
  ///
  /// In en, this message translates to:
  /// **'WINNER'**
  String get winner;

  /// No description provided for @subscriptionAutoRenews.
  ///
  /// In en, this message translates to:
  /// **'Subscription auto-renews unless cancelled at least 24 hours before the end of the current period.'**
  String get subscriptionAutoRenews;

  /// No description provided for @paymentCharged.
  ///
  /// In en, this message translates to:
  /// **'Payment will be charged to your account at confirmation of purchase.'**
  String get paymentCharged;

  /// No description provided for @terms.
  ///
  /// In en, this message translates to:
  /// **'Terms'**
  String get terms;

  /// No description provided for @privacy.
  ///
  /// In en, this message translates to:
  /// **'Privacy'**
  String get privacy;

  /// No description provided for @selectPlanFirst.
  ///
  /// In en, this message translates to:
  /// **'Please select a plan.'**
  String get selectPlanFirst;

  /// No description provided for @purchaseFailed.
  ///
  /// In en, this message translates to:
  /// **'Purchase failed. Please try again.'**
  String get purchaseFailed;

  /// No description provided for @yourSparks.
  ///
  /// In en, this message translates to:
  /// **'Your Sparks'**
  String get yourSparks;

  /// No description provided for @failedToLoadProfile.
  ///
  /// In en, this message translates to:
  /// **'Failed to load profile'**
  String get failedToLoadProfile;

  /// No description provided for @scoringInfo.
  ///
  /// In en, this message translates to:
  /// **'Scoring Info'**
  String get scoringInfo;

  /// No description provided for @notificationToday.
  ///
  /// In en, this message translates to:
  /// **'Today'**
  String get notificationToday;

  /// No description provided for @notificationYesterday.
  ///
  /// In en, this message translates to:
  /// **'Yesterday'**
  String get notificationYesterday;

  /// No description provided for @notificationThisWeek.
  ///
  /// In en, this message translates to:
  /// **'This Week'**
  String get notificationThisWeek;

  /// No description provided for @notificationEarlier.
  ///
  /// In en, this message translates to:
  /// **'Earlier'**
  String get notificationEarlier;

  /// No description provided for @failedToDeleteAccount.
  ///
  /// In en, this message translates to:
  /// **'Failed to delete account. Please try again.'**
  String get failedToDeleteAccount;

  /// No description provided for @failedToLoadChallenge.
  ///
  /// In en, this message translates to:
  /// **'Failed to load challenge'**
  String get failedToLoadChallenge;

  /// No description provided for @deleteNotification.
  ///
  /// In en, this message translates to:
  /// **'Delete notification'**
  String get deleteNotification;

  /// No description provided for @deleteNotificationConfirm.
  ///
  /// In en, this message translates to:
  /// **'Are you sure you want to delete this notification?'**
  String get deleteNotificationConfirm;

  /// No description provided for @unblock.
  ///
  /// In en, this message translates to:
  /// **'Unblock'**
  String get unblock;

  /// No description provided for @noBlockedUsers.
  ///
  /// In en, this message translates to:
  /// **'No blocked users'**
  String get noBlockedUsers;

  /// No description provided for @unblockConfirm.
  ///
  /// In en, this message translates to:
  /// **'Unblock this user?'**
  String get unblockConfirm;

  /// No description provided for @votingHistory.
  ///
  /// In en, this message translates to:
  /// **'Voting History'**
  String get votingHistory;

  /// No description provided for @noVotingHistory.
  ///
  /// In en, this message translates to:
  /// **'No votes yet'**
  String get noVotingHistory;

  /// No description provided for @votedOn.
  ///
  /// In en, this message translates to:
  /// **'Voted'**
  String get votedOn;

  /// No description provided for @editCaption.
  ///
  /// In en, this message translates to:
  /// **'Edit Caption'**
  String get editCaption;

  /// No description provided for @captionUpdated.
  ///
  /// In en, this message translates to:
  /// **'Caption updated'**
  String get captionUpdated;

  /// No description provided for @editComment.
  ///
  /// In en, this message translates to:
  /// **'Edit Comment'**
  String get editComment;

  /// No description provided for @saveComment.
  ///
  /// In en, this message translates to:
  /// **'Save'**
  String get saveComment;

  /// No description provided for @commentUpdated.
  ///
  /// In en, this message translates to:
  /// **'Comment updated'**
  String get commentUpdated;

  /// No description provided for @creatorAnalytics.
  ///
  /// In en, this message translates to:
  /// **'Analytics'**
  String get creatorAnalytics;

  /// No description provided for @totalSubmissions.
  ///
  /// In en, this message translates to:
  /// **'Total Submissions'**
  String get totalSubmissions;

  /// No description provided for @totalVotes.
  ///
  /// In en, this message translates to:
  /// **'Total Votes'**
  String get totalVotes;

  /// No description provided for @avgVotes.
  ///
  /// In en, this message translates to:
  /// **'Avg Votes'**
  String get avgVotes;

  /// No description provided for @challengesWon.
  ///
  /// In en, this message translates to:
  /// **'Challenges Won'**
  String get challengesWon;

  /// No description provided for @totalCoinsEarned.
  ///
  /// In en, this message translates to:
  /// **'Coins Earned'**
  String get totalCoinsEarned;

  /// No description provided for @submissionAnalytics.
  ///
  /// In en, this message translates to:
  /// **'Submission Analytics'**
  String get submissionAnalytics;

  /// No description provided for @upvotes.
  ///
  /// In en, this message translates to:
  /// **'Upvotes'**
  String get upvotes;

  /// No description provided for @downvotes.
  ///
  /// In en, this message translates to:
  /// **'Downvotes'**
  String get downvotes;

  /// No description provided for @superVotes.
  ///
  /// In en, this message translates to:
  /// **'Super Votes'**
  String get superVotes;

  /// No description provided for @giftsReceived.
  ///
  /// In en, this message translates to:
  /// **'Gifts Received'**
  String get giftsReceived;

  /// No description provided for @coverPhoto.
  ///
  /// In en, this message translates to:
  /// **'Cover Photo'**
  String get coverPhoto;

  /// No description provided for @changeCoverPhoto.
  ///
  /// In en, this message translates to:
  /// **'Change Cover Photo'**
  String get changeCoverPhoto;

  /// No description provided for @coverPhotoUpdated.
  ///
  /// In en, this message translates to:
  /// **'Cover photo updated!'**
  String get coverPhotoUpdated;

  /// No description provided for @failedToUpdateCoverPhoto.
  ///
  /// In en, this message translates to:
  /// **'Failed to update cover photo.'**
  String get failedToUpdateCoverPhoto;

  /// No description provided for @search.
  ///
  /// In en, this message translates to:
  /// **'Search'**
  String get search;

  /// No description provided for @searchChallenges.
  ///
  /// In en, this message translates to:
  /// **'Challenges'**
  String get searchChallenges;

  /// No description provided for @searchHint.
  ///
  /// In en, this message translates to:
  /// **'Search users, challenges, submissions...'**
  String get searchHint;

  /// No description provided for @noSearchResults.
  ///
  /// In en, this message translates to:
  /// **'No results found'**
  String get noSearchResults;

  /// No description provided for @searchPlaceholder.
  ///
  /// In en, this message translates to:
  /// **'Start typing to search'**
  String get searchPlaceholder;

  /// No description provided for @followerCount.
  ///
  /// In en, this message translates to:
  /// **'{count} followers'**
  String followerCount(int count);

  /// No description provided for @validationEmailRequired.
  ///
  /// In en, this message translates to:
  /// **'Email is required.'**
  String get validationEmailRequired;

  /// No description provided for @validationEmailInvalid.
  ///
  /// In en, this message translates to:
  /// **'Enter a valid email address.'**
  String get validationEmailInvalid;

  /// No description provided for @validationPasswordRequired.
  ///
  /// In en, this message translates to:
  /// **'Password is required.'**
  String get validationPasswordRequired;

  /// No description provided for @validationPasswordTooShort.
  ///
  /// In en, this message translates to:
  /// **'Password must be at least 8 characters.'**
  String get validationPasswordTooShort;

  /// No description provided for @validationUsernameTooShort.
  ///
  /// In en, this message translates to:
  /// **'Username must be at least 3 characters.'**
  String get validationUsernameTooShort;

  /// No description provided for @validationUsernameInvalid.
  ///
  /// In en, this message translates to:
  /// **'Username can only contain letters, numbers, and underscores.'**
  String get validationUsernameInvalid;

  /// No description provided for @weeklyLeague.
  ///
  /// In en, this message translates to:
  /// **'Weekly League'**
  String get weeklyLeague;

  /// No description provided for @leagueRankings.
  ///
  /// In en, this message translates to:
  /// **'Rankings'**
  String get leagueRankings;

  /// No description provided for @leaguePoints.
  ///
  /// In en, this message translates to:
  /// **'{points} pts'**
  String leaguePoints(int points);

  /// No description provided for @promoted.
  ///
  /// In en, this message translates to:
  /// **'PROMOTED'**
  String get promoted;

  /// No description provided for @relegated.
  ///
  /// In en, this message translates to:
  /// **'RELEGATED'**
  String get relegated;

  /// No description provided for @weekOf.
  ///
  /// In en, this message translates to:
  /// **'Week of {date}'**
  String weekOf(String date);

  /// No description provided for @promotionLine.
  ///
  /// In en, this message translates to:
  /// **'Top 20% promote next week'**
  String get promotionLine;

  /// No description provided for @watchMode.
  ///
  /// In en, this message translates to:
  /// **'Watch'**
  String get watchMode;

  /// No description provided for @exploreMode.
  ///
  /// In en, this message translates to:
  /// **'Explore'**
  String get exploreMode;

  /// No description provided for @sponsoredChallenge.
  ///
  /// In en, this message translates to:
  /// **'SPONSORED'**
  String get sponsoredChallenge;

  /// No description provided for @prizeCoins.
  ///
  /// In en, this message translates to:
  /// **'Prize: {coins} coins'**
  String prizeCoins(int coins);

  /// No description provided for @sponsoredBy.
  ///
  /// In en, this message translates to:
  /// **'Sponsored by {name}'**
  String sponsoredBy(String name);

  /// No description provided for @premiumChallenge.
  ///
  /// In en, this message translates to:
  /// **'Premium Challenge'**
  String get premiumChallenge;

  /// No description provided for @premiumBenefitMonthly.
  ///
  /// In en, this message translates to:
  /// **'Monthly Premium Challenge Access'**
  String get premiumBenefitMonthly;

  /// No description provided for @premiumBenefitSuperVotes.
  ///
  /// In en, this message translates to:
  /// **'Unlimited Super Votes'**
  String get premiumBenefitSuperVotes;

  /// No description provided for @premiumBenefitNoAds.
  ///
  /// In en, this message translates to:
  /// **'Ad-free Experience'**
  String get premiumBenefitNoAds;

  /// No description provided for @premiumBenefitGiftRevenue.
  ///
  /// In en, this message translates to:
  /// **'Gift Revenue +10%'**
  String get premiumBenefitGiftRevenue;

  /// No description provided for @premiumBenefitEarlyAccess.
  ///
  /// In en, this message translates to:
  /// **'24hr Early Access'**
  String get premiumBenefitEarlyAccess;

  /// No description provided for @premiumBenefitBadge.
  ///
  /// In en, this message translates to:
  /// **'Premium Badge'**
  String get premiumBenefitBadge;

  /// No description provided for @creatorTier.
  ///
  /// In en, this message translates to:
  /// **'Creator Tier'**
  String get creatorTier;

  /// No description provided for @tierRookie.
  ///
  /// In en, this message translates to:
  /// **'Rookie'**
  String get tierRookie;

  /// No description provided for @tierRising.
  ///
  /// In en, this message translates to:
  /// **'Rising'**
  String get tierRising;

  /// No description provided for @tierPartner.
  ///
  /// In en, this message translates to:
  /// **'Partner'**
  String get tierPartner;

  /// No description provided for @tierFeatured.
  ///
  /// In en, this message translates to:
  /// **'Featured'**
  String get tierFeatured;

  /// No description provided for @noCreatorTier.
  ///
  /// In en, this message translates to:
  /// **'Keep creating to earn a tier!'**
  String get noCreatorTier;

  /// No description provided for @giftRevenueShare.
  ///
  /// In en, this message translates to:
  /// **'Gift revenue share: {percent}%'**
  String giftRevenueShare(int percent);

  /// No description provided for @duetWith.
  ///
  /// In en, this message translates to:
  /// **'↩ duet with @{username}'**
  String duetWith(String username);

  /// No description provided for @recordDuet.
  ///
  /// In en, this message translates to:
  /// **'Duet'**
  String get recordDuet;

  /// No description provided for @duetChallenge.
  ///
  /// In en, this message translates to:
  /// **'Dueting with @{username}'**
  String duetChallenge(String username);
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
