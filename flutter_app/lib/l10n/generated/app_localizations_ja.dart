// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for Japanese (`ja`).
class AppLocalizationsJa extends AppLocalizations {
  AppLocalizationsJa([String locale = 'ja']) : super(locale);

  @override
  String get appTitle => '30秒チャレンジ';

  @override
  String get login => 'ログイン';

  @override
  String get register => '新規登録';

  @override
  String get username => 'ユーザー名';

  @override
  String get displayName => '表示名';

  @override
  String get signInToContinue => 'ログインして続ける';

  @override
  String get continueWithGoogle => 'Googleで続ける';

  @override
  String get continueWithApple => 'Appleで続ける';

  @override
  String get displayNameRequired => '表示名を入力してください';

  @override
  String displayNameMaxLength(int length) {
    return '最大$length文字';
  }

  @override
  String get usernameRequired => 'ユーザー名を入力してください';

  @override
  String usernameMinLength(int length) {
    return '$length文字以上';
  }

  @override
  String usernameMaxLength(int length) {
    return '最大$length文字';
  }

  @override
  String get usernameInvalidChars => '英数字とアンダースコアのみ使用可能';

  @override
  String minCharacters(int count) {
    return '$count文字以上必要です';
  }

  @override
  String get usernameNotAvailable => 'このユーザー名は使用できません';

  @override
  String get onboardingTitle1 => '毎日のチャレンジ';

  @override
  String get onboardingDesc1 => '毎日新しいクリエイティブなお題が登場。30秒であなただけの作品を世界に見せよう。';

  @override
  String get onboardingTitle2 => '30秒動画';

  @override
  String get onboardingDesc2 =>
      '短くてインパクトのある動画を撮影して、世界中のクリエイターコミュニティで才能をシェアしよう。';

  @override
  String get onboardingTitle3 => '競争して勝とう';

  @override
  String get onboardingDesc3 => 'ランキングを上げて、コインを稼いで、コミュニティからの投票で賞品をゲットしよう。';

  @override
  String get skip => 'スキップ';

  @override
  String get getStarted => '始める';

  @override
  String get next => '次へ';

  @override
  String get todaysChallenge => '今日のチャレンジ';

  @override
  String get recordNow => '今すぐ撮影';

  @override
  String get timeRemaining => '残り時間';

  @override
  String get challengeHistory => 'チャレンジ履歴';

  @override
  String get upcomingChallenges => 'もうすぐ開始';

  @override
  String get seeAll => 'すべて見る';

  @override
  String get live => 'LIVE';

  @override
  String entriesCount(int count) {
    return '$count件のエントリー';
  }

  @override
  String get recordYourEntry => 'エントリーを撮影';

  @override
  String get viewResults => '結果を見る';

  @override
  String get results => '結果';

  @override
  String get fullRankings => '全ランキング';

  @override
  String get noResultsYet => 'まだ結果がありません';

  @override
  String get failedToLoadResults => '結果の読み込みに失敗しました';

  @override
  String get noPastChallenges => '過去のチャレンジはありません';

  @override
  String get somethingWentWrong => 'エラーが発生しました';

  @override
  String get submissions => '投稿';

  @override
  String get votes => '投票';

  @override
  String get voting => '投票';

  @override
  String get leaderboard => 'ランキング';

  @override
  String get profile => 'プロフィール';

  @override
  String get discover => '発見';

  @override
  String get settings => '設定';

  @override
  String get notifications => '通知';

  @override
  String get followers => 'フォロワー';

  @override
  String get following => 'フォロー中';

  @override
  String get follow => 'フォロー';

  @override
  String get unfollow => 'フォロー解除';

  @override
  String get editProfile => 'プロフィール編集';

  @override
  String get save => '保存';

  @override
  String get bio => '自己紹介';

  @override
  String get camera => 'カメラ';

  @override
  String get gallery => 'ギャラリー';

  @override
  String get connections => 'つながり';

  @override
  String get searchUsers => 'ユーザーを検索...';

  @override
  String get followersTab => 'フォロワー';

  @override
  String get followingTab => 'フォロー中';

  @override
  String get noFollowersYet => 'まだフォロワーがいません';

  @override
  String get notFollowingYet => 'まだ誰もフォローしていません';

  @override
  String get getMore => 'もっと見る';

  @override
  String get superVote => 'スーパー投票';

  @override
  String get watchAd => '広告を見る';

  @override
  String get noThanks => 'いいえ';

  @override
  String get loadingSubmissions => '投稿を読み込み中...';

  @override
  String get tryAgain => 'もう一度';

  @override
  String get allEntriesVoted => 'すべてのエントリーに投票しました！';

  @override
  String get comeBackLaterForVotes => '後でまた来てください。新しい投稿が追加されます。';

  @override
  String get goBack => '戻る';

  @override
  String get continueVoting => '投票を続ける';

  @override
  String get daily => 'デイリー';

  @override
  String get weekly => 'ウィークリー';

  @override
  String get allTime => '全期間';

  @override
  String get friends => 'フレンド';

  @override
  String get myRank => '自分のランク';

  @override
  String get rank => '順位';

  @override
  String get score => 'スコア';

  @override
  String get failedToLoadLeaderboard => 'ランキングの読み込みに失敗しました';

  @override
  String get howScoringWorks => 'スコアの仕組み';

  @override
  String get gotIt => '了解';

  @override
  String get recording => '録画中...';

  @override
  String minimumRecordingDuration(int seconds) {
    return '$seconds秒以上録画してください';
  }

  @override
  String get close => '閉じる';

  @override
  String get preview => 'プレビュー';

  @override
  String get captionPlaceholder => 'キャプションを追加...';

  @override
  String get retake => '撮り直す';

  @override
  String get failedToLoadPreview => 'プレビューの読み込みに失敗しました';

  @override
  String get submit => '投稿する';

  @override
  String get uploading => 'アップロード中...';

  @override
  String get uploadComplete => 'アップロード完了！';

  @override
  String get caption => 'キャプション';

  @override
  String get captionHint => 'キャプションを追加（任意）';

  @override
  String get viewInFeed => 'フィードで見る';

  @override
  String get retryUpload => '再アップロード';

  @override
  String get goPro => 'Proにする';

  @override
  String get unlockPotential => 'あなたの可能性を最大限に';

  @override
  String get proMember => 'Proメンバーです！';

  @override
  String renewsOn(String date) {
    return '$dateに更新';
  }

  @override
  String get proBenefits => 'Proの特典';

  @override
  String get choosePlan => 'プランを選択';

  @override
  String get restorePurchases => '購入を復元';

  @override
  String get purchasesRestored => '購入が復元されました。';

  @override
  String get monthly => '月額';

  @override
  String get annual => '年額';

  @override
  String get noAds => '広告なし';

  @override
  String get earlyAccess => 'チャレンジ先行アクセス';

  @override
  String get premiumEffects => 'プレミアムエフェクト';

  @override
  String get proBadge => 'Proバッジ';

  @override
  String get freeSuperVotes => '毎日3回無料スーパー投票';

  @override
  String get coinMultiplier => 'コイン1.5倍';

  @override
  String get detailedAnalytics => '詳細分析';

  @override
  String get premiumGifts => 'プレミアムギフト';

  @override
  String get subscribe => '購読する';

  @override
  String get restore => '購入を復元';

  @override
  String get perMonth => '/月';

  @override
  String get perYear => '/年';

  @override
  String get save33 => '33%お得';

  @override
  String get bestValue => '一番お得';

  @override
  String get sparks => 'スパーク';

  @override
  String get sparksStore => 'スパークストア';

  @override
  String get getSparks => 'スパークを入手';

  @override
  String get buyCoins => 'スパークを購入';

  @override
  String get sendGift => 'ギフトを送る';

  @override
  String get sendAGift => 'ギフトを送る';

  @override
  String get quickTab => 'クイック';

  @override
  String get standardTab => 'スタンダード';

  @override
  String get premiumTab => 'プレミアム';

  @override
  String get giftMessageHint => 'メッセージを追加（任意）';

  @override
  String sendGiftButton(String name, int cost) {
    return '$nameを送る ($cost スパーク)';
  }

  @override
  String get getMoreSparks => 'スパークを追加購入';

  @override
  String get gifts => 'ギフト';

  @override
  String get shop => 'ショップ';

  @override
  String get noNotifications => '通知はまだありません';

  @override
  String get markAllRead => 'すべて既読にする';

  @override
  String get notificationSettings => '通知設定';

  @override
  String get notifNewFollower => '新しいフォロワー';

  @override
  String get notifNewFollowerDesc => '誰かにフォローされたとき';

  @override
  String get notifVoteReceived => '投票を受け取り';

  @override
  String get notifVoteReceivedDesc => 'あなたの投稿に投票があったとき';

  @override
  String get notifGiftReceived => 'ギフトを受け取り';

  @override
  String get notifGiftReceivedDesc => 'ギフトが届いたとき';

  @override
  String get notifChallengeStart => 'チャレンジ開始';

  @override
  String get notifChallengeStartDesc => '新しいチャレンジが始まったとき';

  @override
  String get notifRankAchieved => 'ランク達成';

  @override
  String get notifRankAchievedDesc => 'チャレンジで入賞したとき';

  @override
  String get notifAchievementEarned => '実績獲得';

  @override
  String get notifAchievementEarnedDesc => '新しいバッジを獲得したとき';

  @override
  String get notifSubmissionStatus => '投稿ステータス';

  @override
  String get notifSubmissionStatusDesc => '動画処理の進捗について';

  @override
  String get notifMarketing => 'マーケティング';

  @override
  String get notifMarketingDesc => 'プロモーション、新機能、ヒント';

  @override
  String get searchSubmissions => '投稿を検索...';

  @override
  String get trendingNow => 'トレンド';

  @override
  String get failedToLoadFeed => 'フィードの読み込みに失敗しました';

  @override
  String get reportUser => 'ユーザーを報告';

  @override
  String get blockUser => 'ユーザーをブロック';

  @override
  String get reportUserConfirm => 'このユーザーを不適切な行為として報告しますか？';

  @override
  String get userReported => 'ユーザーを報告しました。確認いたします。';

  @override
  String get blockUserConfirm =>
      'ブロックされたユーザーはあなたのプロフィールを閲覧したり、コンテンツにアクセスしたりできなくなります。';

  @override
  String get userBlocked => 'ユーザーをブロックしました。';

  @override
  String get accountSection => 'アカウント';

  @override
  String get subscriptionSection => 'サブスクリプション';

  @override
  String get currentPlan => '現在のプラン';

  @override
  String get pro => 'PRO';

  @override
  String get free => '無料';

  @override
  String get manageSubscription => 'サブスクリプション管理';

  @override
  String get privacySection => 'プライバシー';

  @override
  String get blockedUsers => 'ブロック中のユーザー';

  @override
  String get appSection => 'アプリ';

  @override
  String get english => 'English';

  @override
  String get japanese => '日本語';

  @override
  String get theme => 'テーマ';

  @override
  String get themeSystem => 'システム';

  @override
  String get themeLight => 'ライト';

  @override
  String get themeDark => 'ダーク';

  @override
  String get termsOfService => '利用規約';

  @override
  String get privacyPolicy => 'プライバシーポリシー';

  @override
  String appVersion(String version) {
    return 'バージョン $version';
  }

  @override
  String get deleteAccountWarning => 'この操作は元に戻せません。すべてのデータ、投稿、コイン残高が失われます。';

  @override
  String get selectLanguage => '言語を選択';

  @override
  String get selectTheme => 'テーマを選択';

  @override
  String get logoutConfirm => 'ログアウトしますか？';

  @override
  String get comingSoon => '近日公開';

  @override
  String get logout => 'ログアウト';

  @override
  String get deleteAccount => 'アカウント削除';

  @override
  String get language => '言語';

  @override
  String get darkMode => 'ダークモード';

  @override
  String get about => 'アプリについて';

  @override
  String get share => 'シェア';

  @override
  String get cancel => 'キャンセル';

  @override
  String get confirm => '確認';

  @override
  String get error => 'エラー';

  @override
  String get retry => '再試行';

  @override
  String get loading => '読み込み中...';

  @override
  String get success => '成功';

  @override
  String get proFeature => 'Pro機能';

  @override
  String get upgradeToUnlock => 'Proにアップグレードして解除';

  @override
  String challengeEndsIn(String time) {
    return 'チャレンジ終了まで $time';
  }

  @override
  String votesRemaining(int count) {
    return '残り $count 票';
  }

  @override
  String get noMoreEntries => 'すべてのエントリーに投票しました！';

  @override
  String get comeBackLater => '後でまた来てください。';

  @override
  String get firstBoostFree => '初回ブースト無料！';

  @override
  String get firstBoostFreeDesc => '初めてのSmallブーストを無料で体験 — スパーク不要！';

  @override
  String get freeTrialLabel => '無料';

  @override
  String get dailyRewardTitle => 'デイリーログインボーナス';

  @override
  String get dailyRewardDesc => 'おかえりなさい！毎日のスパークをどうぞ。';

  @override
  String get claimReward => '受け取る';

  @override
  String get dailyBonusClaimed => '本日受取済み';

  @override
  String get dailyBonusAvailable => '+3 スパークを受け取れます';

  @override
  String get earnFreeSparks => '無料でスパークを獲得';

  @override
  String get watchAdForSparks => '広告を見てスパークを獲得';

  @override
  String get watchAdForSparksDesc => '短い動画を見て10スパークを無料で獲得！';

  @override
  String get watchAdEarn10Sparks => '広告を見て10スパーク獲得';

  @override
  String adsRemaining(int count) {
    return '本日残り$count回';
  }

  @override
  String get dailyAdLimitReached => '本日の広告上限に達しました';

  @override
  String get boostSubmission => '投稿をブースト';

  @override
  String get boostDescription => 'この投稿をブーストしてフィードでの表示を増やしましょう';

  @override
  String get boost => 'ブースト';

  @override
  String get boostPurchased => 'ブーストを購入しました！';

  @override
  String get boosted => 'ブースト中';

  @override
  String get pickFromGallery => 'ギャラリー';

  @override
  String get editVideo => '動画を編集';

  @override
  String get trimVideo => 'トリミング';

  @override
  String get filters => 'フィルター';

  @override
  String get addText => 'テキスト';

  @override
  String get exporting => 'エクスポート中...';

  @override
  String get exportFailed => 'エクスポートに失敗しました';
}
