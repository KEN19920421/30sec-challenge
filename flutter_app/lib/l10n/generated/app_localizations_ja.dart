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
  String get discover => 'さがす';

  @override
  String get navHome => 'ホーム';

  @override
  String get navRecord => '撮影';

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
  String get searchUsers => 'ユーザー';

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
  String get searchSubmissions => '投稿';

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
  String get deleteAccountTitle => 'アカウントを削除する';

  @override
  String get deleteAccountConfirm => 'はい、削除する';

  @override
  String get deleteSubmission => '投稿を削除';

  @override
  String get deleteSubmissionWarning => 'この投稿を削除してもよろしいですか？この操作は取り消せません。';

  @override
  String get deleteSubmissionConfirm => 'はい、削除';

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
  String get cameraUnavailable => 'カメラを利用できません';

  @override
  String get cameraUnavailableDescription =>
      'カメラを起動できませんでした。代わりにギャラリーから動画を選択できます。';

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

  @override
  String get comments => 'コメント';

  @override
  String get addComment => 'コメントを追加...';

  @override
  String get noCommentsYet => 'まだコメントがありません';

  @override
  String get beFirstToComment => '最初のコメントを投稿しよう！';

  @override
  String replyingTo(String username) {
    return '@$usernameに返信中';
  }

  @override
  String repliesCount(int count) {
    return '$count件の返信';
  }

  @override
  String get reply => '返信';

  @override
  String get deleteComment => '削除';

  @override
  String get commentDeleted => 'コメントを削除しました';

  @override
  String get deletedComment => '[削除済み]';

  @override
  String replyTo(String username) {
    return '@$username に返信';
  }

  @override
  String get deleteCommentConfirm => 'このコメントを削除しますか？';

  @override
  String get commentAdded => 'コメントを追加しました';

  @override
  String get viewReplies => '返信を表示';

  @override
  String get mute => 'ミュート';

  @override
  String get unmute => 'ミュート解除';

  @override
  String get devLogin => '開発者ログイン';

  @override
  String get email => 'メールアドレス';

  @override
  String get password => 'パスワード';

  @override
  String get browseAsGuest => 'ゲストで閲覧';

  @override
  String get tapToStop => 'タップして停止';

  @override
  String get trimRange => '5〜30秒の範囲';

  @override
  String get dragTextToReposition => 'テキストをドラッグして位置を変更';

  @override
  String get passwordWeak => '弱い';

  @override
  String get passwordMedium => '普通';

  @override
  String get passwordStrong => '強い';

  @override
  String get shareSubmission => 'この投稿をシェア';

  @override
  String get shareSubmissionLink => '30秒チャレンジのエントリーをチェックしよう！';

  @override
  String votesCastThisSession(int count) {
    return 'このセッションで$count票投じました';
  }

  @override
  String remainingLeft(int count) {
    return '残り$count件';
  }

  @override
  String submissionsCount(int count) {
    return '$count件の投稿';
  }

  @override
  String get rankings => 'ランキング';

  @override
  String get noRankingsYet => 'まだランキングがありません';

  @override
  String get submitToAppear => 'チャレンジに投稿してランキングに表示されよう！';

  @override
  String get failedToLoadRankings => 'ランキングの読み込みに失敗しました';

  @override
  String get uploadingEntry => 'エントリーをアップロード中...';

  @override
  String percentComplete(int percent) {
    return '$percent%完了';
  }

  @override
  String get submissionComplete => '投稿完了！';

  @override
  String get videoBeingProcessed => '動画を処理中です';

  @override
  String get uploadFailed => 'アップロード失敗';

  @override
  String get preparingUpload => 'アップロードを準備中...';

  @override
  String get pleaseWait => 'しばらくお待ちください';

  @override
  String get autoRedirectingSoon => 'まもなく自動的に移動します...';

  @override
  String get goBackLabel => '戻る';

  @override
  String get cancelUpload => 'キャンセル';

  @override
  String get pageNotFound => 'ページが見つかりません';

  @override
  String get goHome => 'ホームへ';

  @override
  String get filterNone => 'なし';

  @override
  String get filterVivid => 'ビビッド';

  @override
  String get filterMono => 'モノクロ';

  @override
  String get filterSepia => 'セピア';

  @override
  String get filterWarm => 'ウォーム';

  @override
  String get filterCool => 'クール';

  @override
  String get filterFade => 'フェード';

  @override
  String get filterVintage => 'ビンテージ';

  @override
  String get submissionNotFound => '投稿が見つかりません';

  @override
  String get submissionDetail => '投稿';

  @override
  String exportFailedWithError(String error) {
    return 'エクスポートに失敗しました: $error';
  }

  @override
  String get noFriendsOnLeaderboard => 'フレンドがいません';

  @override
  String get noLeaderboardEntries => 'まだエントリーがありません';

  @override
  String get noFriendsOnLeaderboardSubtitle => 'フレンドをフォローしてランキングで競いましょう';

  @override
  String get noLeaderboardEntriesSubtitle => '最初にランキングを駆け上がりましょう';

  @override
  String get noNotificationsYet => '通知はまだありません';

  @override
  String get noNotificationsSubtitle => 'すべて確認済みです！後でまた確認してください。';

  @override
  String get endsIn => '残り時間';

  @override
  String get noActiveChallenge => 'アクティブなチャレンジなし';

  @override
  String get nextChallengeComingSoon => '次のチャレンジがもうすぐ始まります！';

  @override
  String get checkBackSoon => '次のチャレンジをお楽しみに。';

  @override
  String get topSubmissions => 'トップ投稿';

  @override
  String get viewAll => 'すべて見る';

  @override
  String get entries => '参加数';

  @override
  String get remaining => '残り';

  @override
  String get winner => '優勝';

  @override
  String get subscriptionAutoRenews =>
      '現在の期間終了の24時間前までにキャンセルしない限り、サブスクリプションは自動更新されます。';

  @override
  String get paymentCharged => '購入確認時にアカウントに請求されます。';

  @override
  String get terms => '利用規約';

  @override
  String get privacy => 'プライバシー';

  @override
  String get selectPlanFirst => 'プランを選択してください。';

  @override
  String get purchaseFailed => '購入に失敗しました。もう一度お試しください。';

  @override
  String get yourSparks => 'あなたのスパーク';

  @override
  String get failedToLoadProfile => 'プロフィールの読み込みに失敗しました';

  @override
  String get scoringInfo => 'スコアリング情報';

  @override
  String get notificationToday => '今日';

  @override
  String get notificationYesterday => '昨日';

  @override
  String get notificationThisWeek => '今週';

  @override
  String get notificationEarlier => '以前';

  @override
  String get failedToDeleteAccount => 'アカウントの削除に失敗しました。もう一度お試しください。';

  @override
  String get failedToLoadChallenge => 'チャレンジの読み込みに失敗しました';

  @override
  String get deleteNotification => '通知を削除';

  @override
  String get deleteNotificationConfirm => 'この通知を削除してもよろしいですか？';

  @override
  String get unblock => 'ブロック解除';

  @override
  String get noBlockedUsers => 'ブロックしたユーザーはいません';

  @override
  String get unblockConfirm => 'このユーザーのブロックを解除しますか？';

  @override
  String get votingHistory => '投票履歴';

  @override
  String get noVotingHistory => '投票履歴はまだありません';

  @override
  String get votedOn => '投票済み';

  @override
  String get editCaption => 'キャプションを編集';

  @override
  String get captionUpdated => 'キャプションを更新しました';

  @override
  String get editComment => 'コメントを編集';

  @override
  String get saveComment => '保存';

  @override
  String get commentUpdated => 'コメントを更新しました';

  @override
  String get creatorAnalytics => '分析';

  @override
  String get totalSubmissions => '総投稿数';

  @override
  String get totalVotes => '総投票数';

  @override
  String get avgVotes => '平均投票数';

  @override
  String get challengesWon => 'チャレンジ優勝数';

  @override
  String get totalCoinsEarned => '獲得コイン';

  @override
  String get submissionAnalytics => '投稿分析';

  @override
  String get upvotes => '賛成票';

  @override
  String get downvotes => '反対票';

  @override
  String get superVotes => 'スーパー投票';

  @override
  String get giftsReceived => '受け取ったギフト';

  @override
  String get coverPhoto => 'カバー写真';

  @override
  String get changeCoverPhoto => 'カバー写真を変更';

  @override
  String get coverPhotoUpdated => 'カバー写真を更新しました！';

  @override
  String get failedToUpdateCoverPhoto => 'カバー写真の更新に失敗しました。';

  @override
  String get search => '検索';

  @override
  String get searchChallenges => 'チャレンジ';

  @override
  String get searchHint => 'ユーザー、チャレンジ、投稿を検索...';

  @override
  String get noSearchResults => '結果が見つかりません';

  @override
  String get searchPlaceholder => '検索キーワードを入力してください';

  @override
  String followerCount(int count) {
    return '$count人のフォロワー';
  }

  @override
  String get validationEmailRequired => 'メールアドレスを入力してください。';

  @override
  String get validationEmailInvalid => '有効なメールアドレスを入力してください。';

  @override
  String get validationPasswordRequired => 'パスワードを入力してください。';

  @override
  String get validationPasswordTooShort => 'パスワードは8文字以上にしてください。';

  @override
  String get validationUsernameTooShort => 'ユーザー名は3文字以上にしてください。';

  @override
  String get validationUsernameInvalid => 'ユーザー名は英数字とアンダースコアのみ使用できます。';

  @override
  String get weeklyLeague => '週次リーグ';

  @override
  String get leagueRankings => 'ランキング';

  @override
  String leaguePoints(int points) {
    return '${points}pts';
  }

  @override
  String get promoted => '昇格';

  @override
  String get relegated => '降格';

  @override
  String weekOf(String date) {
    return '$dateの週';
  }

  @override
  String get promotionLine => '上位20%が来週昇格';

  @override
  String get watchMode => '視聴';

  @override
  String get exploreMode => '探索';

  @override
  String get sponsoredChallenge => 'スポンサー';

  @override
  String prizeCoins(int coins) {
    return '賞金: $coinsコイン';
  }

  @override
  String sponsoredBy(String name) {
    return '$name提供';
  }

  @override
  String get premiumChallenge => 'プレミアムチャレンジ';

  @override
  String get premiumBenefitMonthly => '月次プレミアムチャレンジ参加権';

  @override
  String get premiumBenefitSuperVotes => 'スーパー投票無制限';

  @override
  String get premiumBenefitNoAds => '広告なし';

  @override
  String get premiumBenefitGiftRevenue => 'ギフト収益率+10%';

  @override
  String get premiumBenefitEarlyAccess => '24時間早期アクセス';

  @override
  String get premiumBenefitBadge => 'プレミアムバッジ';

  @override
  String get creatorTier => 'クリエイタートライアングル';

  @override
  String get tierRookie => 'ルーキー';

  @override
  String get tierRising => 'ライジング';

  @override
  String get tierPartner => 'パートナー';

  @override
  String get tierFeatured => 'フィーチャード';

  @override
  String get noCreatorTier => '投稿を続けてティアを獲得しよう！';

  @override
  String giftRevenueShare(int percent) {
    return 'ギフト収益シェア率: $percent%';
  }

  @override
  String duetWith(String username) {
    return '↩ @$usernameとデュエット';
  }

  @override
  String get recordDuet => 'デュエット';

  @override
  String duetChallenge(String username) {
    return '@$usernameとデュエット中';
  }
}
