# 30sec Challenge - 完全セットアップガイド

> **対象読者**: 各種アカウント未作成の状態から、本番環境（Xserver VPS）へのデプロイ、ストア申請までを行う開発者
> **技術スタック**: Flutter + Node.js/TypeScript + PostgreSQL + Redis + S3互換ストレージ

---

## 目次

- [2-1. Google Cloud Console セットアップ](#2-1-google-cloud-console-セットアップ)
- [2-2. Apple Developer セットアップ](#2-2-apple-developer-セットアップ)
- [2-3. AdMob セットアップ](#2-3-admob-セットアップ)
- [2-4. Firebase セットアップ（FCM用）](#2-4-firebase-セットアップfcm用)
- [2-5. S3互換ストレージ設定](#2-5-s3互換ストレージ設定)
- [2-6. Xserver VPS デプロイ手順](#2-6-xserver-vps-デプロイ手順)
- [2-7. ストア申請手順](#2-7-ストア申請手順)

---

## 2-1. Google Cloud Console セットアップ

Google サインイン機能に必要な OAuth 2.0 クライアントIDを作成します。

### 2-1-1. Google Cloud プロジェクト作成

1. [Google Cloud Console](https://console.cloud.google.com/) にアクセスし、Google アカウントでログインする
2. 画面上部のプロジェクト選択ドロップダウンをクリックする
3. **「新しいプロジェクト」** をクリックする
4. 以下の情報を入力する:
   - **プロジェクト名**: `30sec-challenge`（任意の名前）
   - **組織**: 個人の場合は「組織なし」のまま
   - **場所**: デフォルトのまま
5. **「作成」** をクリックし、プロジェクトが作成されるまで待つ（数秒）
6. 作成完了後、画面上部のプロジェクト選択で `30sec-challenge` を選択する

### 2-1-2. OAuth 2.0 同意画面の設定

1. 左メニューから **「APIとサービス」→「OAuth 同意画面」** を選択する
2. **「外部」** を選択し、**「作成」** をクリックする
3. **「アプリ情報」** を入力する:
   - **アプリ名**: `30sec Challenge`
   - **ユーザーサポートメール**: 自分のメールアドレスを選択
   - **アプリロゴ**: （任意、後から設定可能）
4. **「アプリのドメイン」** を入力する:
   - **アプリケーションのホームページ**: `https://yourdomain.com`（本番ドメインに変更）
   - **アプリケーションのプライバシーポリシーリンク**: `https://yourdomain.com/privacy`
   - **アプリケーションの利用規約リンク**: `https://yourdomain.com/terms`
5. **「承認済みドメイン」** に本番ドメインを追加する（例: `yourdomain.com`）
6. **「デベロッパーの連絡先情報」** にメールアドレスを入力する
7. **「保存して次へ」** をクリックする
8. **「スコープ」** 画面ではデフォルトのまま **「保存して次へ」** をクリックする
9. **「テストユーザー」** 画面で、テスト中に使用するGoogleアカウントのメールアドレスを追加する
10. **「保存して次へ」** → **「ダッシュボードに戻る」** をクリックする

#### テスト → 本番公開の手順

> **重要**: テスト状態では、テストユーザーに追加したアカウントのみがGoogleサインインできます。ストア申請前に本番公開が必要です。

1. **「APIとサービス」→「OAuth 同意画面」** を開く
2. 上部の **「公開ステータス」** セクションで **「アプリを公開」** をクリックする
3. 確認ダイアログで **「確認」** をクリックする
4. Google による審査（通常1〜3営業日）が完了するまで待つ
5. 審査完了後、すべてのGoogleアカウントでサインインが可能になる

### 2-1-3. iOS用クライアントID作成

1. 左メニューから **「APIとサービス」→「認証情報」** を選択する
2. 上部の **「+ 認証情報を作成」** → **「OAuthクライアントID」** をクリックする
3. 以下の情報を入力する:
   - **アプリケーションの種類**: `iOS`
   - **名前**: `30sec Challenge iOS`
   - **バンドルID**: `com.thirtysecchallenge.thirtySecChallenge`
4. **「作成」** をクリックする
5. 表示されるダイアログで以下の情報をメモする:
   - **クライアントID**: `XXXX.apps.googleusercontent.com`
   - このクライアントIDはFlutterアプリの `GoogleService-Info.plist` に含まれる

### 2-1-4. Android用クライアントID作成

1. **「+ 認証情報を作成」** → **「OAuthクライアントID」** をクリックする
2. 以下の情報を入力する:
   - **アプリケーションの種類**: `Android`
   - **名前**: `30sec Challenge Android`
   - **パッケージ名**: `com.thirtysecchallenge.thirty_sec_challenge`
   - **SHA-1 証明書フィンガープリント**: 下記「SHA-1 フィンガープリントの取得方法」参照
3. **「作成」** をクリックする

> **注意**: debug用とrelease用で異なるSHA-1フィンガープリントが必要です。開発中はdebug用のみでOKですが、本番リリース時にはrelease用も追加登録してください。

### 2-1-5. Web用クライアントID作成（バックエンド検証用）

バックエンドでGoogleのIDトークンを検証するために、Web用クライアントIDが必要です。

1. **「+ 認証情報を作成」** → **「OAuthクライアントID」** をクリックする
2. 以下の情報を入力する:
   - **アプリケーションの種類**: `ウェブ アプリケーション`
   - **名前**: `30sec Challenge Backend`
   - **承認済みの JavaScript 生成元**: （空欄のままでOK）
   - **承認済みのリダイレクト URI**: （空欄のままでOK）
3. **「作成」** をクリックする
4. 表示される **クライアントID** をメモする → これがバックエンドの `.env` の `GOOGLE_CLIENT_ID` に設定する値

```
# .env に設定する値の例
GOOGLE_CLIENT_ID=123456789012-abcdefghijklmnopqrstuvwxyz.apps.googleusercontent.com
```

### 2-1-6. SHA-1 フィンガープリントの取得方法

#### debug用 SHA-1（開発時）

macOS / Linux の場合:

```bash
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
```

Windows の場合:

```cmd
keytool -list -v -keystore %USERPROFILE%\.android\debug.keystore -alias androiddebugkey -storepass android -keypass android
```

出力から `SHA1:` の行をコピーする（例: `DA:39:A3:EE:5E:6B:4B:0D:32:55:BF:EF:95:60:18:90:AF:D8:07:09`）。

#### release用 SHA-1（本番リリース時）

1. まずリリース用 keystore を作成する（まだ持っていない場合）:

```bash
keytool -genkey -v -keystore ~/30sec-challenge-release.jks \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -alias release-key \
  -storepass <パスワードを設定> \
  -keypass <パスワードを設定>
```

2. SHA-1 を取得する:

```bash
keytool -list -v -keystore ~/30sec-challenge-release.jks -alias release-key
```

3. パスワードを入力すると、SHA-1 が表示される

4. 取得したSHA-1を Google Cloud Console の Android用クライアントID設定に追加する:
   - **「APIとサービス」→「認証情報」** → Android用クライアントIDをクリック
   - **「SHA-1 証明書フィンガープリント」** フィールドにrelease用のSHA-1を追加
   - **「保存」** をクリック

> **注意**: Google Play App Signing を使う場合、Google Play Console の **「設定」→「アプリの署名」** からもSHA-1を取得し、Google Cloud Console に追加する必要があります。

### 2-1-7. GoogleService-Info.plist の取得・配置

> **注意**: この手順は [2-4. Firebase セットアップ](#2-4-firebase-セットアップfcm用) 完了後に実施してください。Firebase でiOSアプリを登録すると、Google Cloud Console の設定が統合された `GoogleService-Info.plist` が自動生成されます。

1. [Firebase Console](https://console.firebase.google.com/) で対象プロジェクトを開く
2. 左メニューの歯車アイコン → **「プロジェクトの設定」** をクリックする
3. **「全般」** タブを下にスクロールし、iOSアプリの **「GoogleService-Info.plist」** をダウンロードする
4. ダウンロードしたファイルを以下のパスに配置する:

```
flutter_app/ios/Runner/GoogleService-Info.plist
```

5. Xcode でプロジェクトを開き、**Runner** グループに `GoogleService-Info.plist` がリンクされていることを確認する:
   - Xcode で `flutter_app/ios/Runner.xcworkspace` を開く
   - 左パネルの **Runner** フォルダを右クリック → **「Add Files to "Runner"...」**
   - `GoogleService-Info.plist` を選択し、**「Copy items if needed」** にチェックを入れて **「Add」**

6. `Info.plist` 内の `CFBundleURLSchemes` を更新する:
   - `GoogleService-Info.plist` を開き、`REVERSED_CLIENT_ID` の値を確認する
   - `flutter_app/ios/Runner/Info.plist` の以下の行を更新する:

```xml
<!-- 変更前 -->
<string>com.googleusercontent.apps.YOUR_REVERSED_CLIENT_ID</string>

<!-- 変更後（GoogleService-Info.plist の REVERSED_CLIENT_ID の値に置き換え） -->
<string>com.googleusercontent.apps.123456789012-abcdefghijklmnop</string>
```

### 2-1-8. google-services.json の取得・配置

> **注意**: こちらも [2-4. Firebase セットアップ](#2-4-firebase-セットアップfcm用) 完了後に実施してください。

1. [Firebase Console](https://console.firebase.google.com/) で対象プロジェクトを開く
2. 左メニューの歯車アイコン → **「プロジェクトの設定」** をクリックする
3. **「全般」** タブを下にスクロールし、Androidアプリの **「google-services.json」** をダウンロードする
4. ダウンロードしたファイルを以下のパスに配置する:

```
flutter_app/android/app/google-services.json
```

5. `flutter_app/android/app/build.gradle.kts` にGoogle Servicesプラグインが適用されていることを確認する:

```kotlin
plugins {
    id("com.android.application")
    id("kotlin-android")
    id("dev.flutter.flutter-gradle-plugin")
    id("com.google.gms.google-services")  // この行が必要
}
```

6. `flutter_app/android/build.gradle.kts` のプロジェクトレベルにもプラグインが必要:

```kotlin
plugins {
    id("com.google.gms.google-services") version "4.4.2" apply false
}
```

---

## 2-2. Apple Developer セットアップ

Apple サインイン機能とApp Store への申請に必要なアカウント・設定を行います。

### 2-2-1. Apple Developer Program 登録

| 項目 | 内容 |
|------|------|
| 費用 | 年額 ¥15,800（$99 USD） |
| URL | https://developer.apple.com/programs/ |
| 必要なもの | Apple ID、クレジットカード、本人確認書類 |

1. [Apple Developer Program](https://developer.apple.com/programs/) にアクセスする
2. **「登録」** をクリックし、Apple ID でサインインする
3. Apple ID がない場合は **「Apple ID を作成」** から新規作成する
4. **「開始」** をクリックし、以下の情報を入力する:
   - 個人 / 組織の選択（個人開発者は **「個人/個人事業主」** を選択）
   - 氏名（ローマ字）
   - 住所
   - 電話番号
5. Apple Developer Program の利用規約に同意する
6. 年額 ¥15,800 の支払いを完了する
7. **Apple からの承認メール**（通常24〜48時間以内）を待つ

> **注意**: 個人開発者の場合、D-U-N-S番号は不要です。法人の場合はD-U-N-S番号が必要になります。

### 2-2-2. App ID 作成

1. [Apple Developer - Certificates, Identifiers & Profiles](https://developer.apple.com/account/resources/identifiers/list) にアクセスする
2. 左メニューの **「Identifiers」** をクリックする
3. **「+」** ボタンをクリックする
4. **「App IDs」** を選択し、**「Continue」** をクリックする
5. **「App」** を選択し、**「Continue」** をクリックする
6. 以下の情報を入力する:
   - **Description**: `30sec Challenge`
   - **Bundle ID**: **「Explicit」** を選択し、`com.thirtysecchallenge.thirtySecChallenge` を入力
7. **「Capabilities」** セクションを下にスクロールし、以下にチェックを入れる:
   - [x] **Sign In with Apple**
   - [x] **Push Notifications**
8. **「Continue」** → **「Register」** をクリックする

### 2-2-3. Service ID 作成（バックエンドコールバック用）

バックエンドで Apple Sign In のコールバックを処理するために Service ID が必要です。

1. [Identifiers](https://developer.apple.com/account/resources/identifiers/list) ページで **「+」** をクリックする
2. **「Services IDs」** を選択し、**「Continue」** をクリックする
3. 以下の情報を入力する:
   - **Description**: `30sec Challenge Service`
   - **Identifier**: `com.thirtysecchallenge.thirtySecChallenge.service`
4. **「Continue」** → **「Register」** をクリックする
5. 登録後、作成した Service ID をクリックして編集画面を開く
6. **「Sign In with Apple」** にチェックを入れ、**「Configure」** をクリックする
7. 以下を設定する:
   - **Primary App ID**: `30sec Challenge (com.thirtysecchallenge.thirtySecChallenge)` を選択
   - **Domains and Subdomains**: バックエンドのドメインを入力（例: `api.yourdomain.com`）
   - **Return URLs**: `https://api.yourdomain.com/api/v1/auth/apple/callback`
8. **「Next」** → **「Done」** → **「Continue」** → **「Save」** をクリックする

> **注意**: この Service ID の Identifier が `.env` の `APPLE_CLIENT_ID` に設定する値です。

```
APPLE_CLIENT_ID=com.thirtysecchallenge.thirtySecChallenge.service
```

### 2-2-4. Key 作成（Sign in with Apple 用 Private Key）

1. [Keys](https://developer.apple.com/account/resources/authkeys/list) ページにアクセスする
2. **「+」** ボタンをクリックする
3. 以下の情報を入力する:
   - **Key Name**: `30sec Challenge Sign In Key`
4. **「Sign In with Apple」** にチェックを入れ、右側の **「Configure」** をクリックする
5. **Primary App ID** で `30sec Challenge` を選択し、**「Save」** をクリックする
6. **「Continue」** → **「Register」** をクリックする
7. **重要**: 表示される画面で以下をメモ・ダウンロードする:
   - **Key ID**: 10文字の英数字（例: `ABC123DEF4`） → `.env` の `APPLE_KEY_ID`
   - **「Download」** をクリックして `.p8` ファイルをダウンロードする

> **警告**: `.p8` ファイルは **一度しかダウンロードできません**。紛失した場合はKeyを再作成する必要があります。安全な場所に保管してください。

8. ダウンロードした `.p8` ファイルをバックエンドのサーバーに配置する（例: `/opt/30sec-challenge/backend/keys/AuthKey_ABC123DEF4.p8`）

### 2-2-5. Team ID / Key ID / Bundle ID の確認場所

| 値 | 確認場所 | 例 | `.env`変数 |
|----|---------|-----|-----------|
| **Team ID** | [Membership Details](https://developer.apple.com/account#MembershipDetailsCard) の「Team ID」 | `ABCDE12345` | `APPLE_TEAM_ID` |
| **Key ID** | [Keys](https://developer.apple.com/account/resources/authkeys/list) で対象Keyをクリック | `ABC123DEF4` | `APPLE_KEY_ID` |
| **Bundle ID** | [Identifiers](https://developer.apple.com/account/resources/identifiers/list) で対象App IDをクリック | `com.thirtysecchallenge.thirtySecChallenge` | -- |
| **Service ID** | [Identifiers](https://developer.apple.com/account/resources/identifiers/list/serviceId) で対象Service IDをクリック | `com.thirtysecchallenge.thirtySecChallenge.service` | `APPLE_CLIENT_ID` |

### 2-2-6. Provisioning Profile 作成

#### Development Profile（開発用）

1. [Profiles](https://developer.apple.com/account/resources/profiles/list) ページで **「+」** をクリックする
2. **「iOS App Development」** を選択し、**「Continue」** をクリックする
3. **App ID**: `30sec Challenge (com.thirtysecchallenge.thirtySecChallenge)` を選択する
4. **「Continue」** をクリックする
5. 使用する**開発用証明書**を選択する（まだない場合は先に証明書を作成する）
6. **「Continue」** をクリックする
7. テストに使用する**デバイス**を選択する
8. **「Continue」** をクリックする
9. **Profile Name**: `30sec Challenge Development` と入力する
10. **「Generate」** → **「Download」** をクリックする

#### Distribution Profile（配布用 - App Store 申請時に必要）

1. [Profiles](https://developer.apple.com/account/resources/profiles/list) ページで **「+」** をクリックする
2. **「App Store Connect」** を選択し、**「Continue」** をクリックする
3. **App ID**: `30sec Challenge (com.thirtysecchallenge.thirtySecChallenge)` を選択する
4. **「Continue」** をクリックする
5. **配布用証明書**を選択する
6. **「Continue」** をクリックする
7. **Profile Name**: `30sec Challenge Distribution` と入力する
8. **「Generate」** → **「Download」** をクリックする

#### 開発用証明書の作成（まだない場合）

1. [Certificates](https://developer.apple.com/account/resources/certificates/list) ページで **「+」** をクリックする
2. **「Apple Development」**（開発用）または **「Apple Distribution」**（配布用）を選択する
3. **「Continue」** をクリックする
4. Mac の **キーチェーンアクセス** を開く:
   - メニューバー → **「キーチェーンアクセス」** → **「証明書アシスタント」** → **「認証局に証明書を要求...」**
   - **ユーザーのメールアドレス**: Apple ID のメールアドレス
   - **通称**: 任意（例: `30sec Challenge Dev`）
   - **要求の処理**: **「ディスクに保存」** を選択
   - **「続ける」** をクリックして `.certSigningRequest` ファイルを保存する
5. Apple Developer ポータルに戻り、生成した `.certSigningRequest` ファイルをアップロードする
6. **「Continue」** → **「Download」** で証明書をダウンロードする
7. ダウンロードした `.cer` ファイルをダブルクリックしてキーチェーンに登録する

---

## 2-3. AdMob セットアップ

アプリ内広告（バナー、インタースティシャル、リワード、ネイティブ）の設定を行います。

### 2-3-1. AdMob アカウント作成

1. [AdMob](https://admob.google.com/) にアクセスする
2. Google アカウントでログインする（Google Cloud Console と同じアカウント推奨）
3. **「AdMob アカウントに申し込む」** をクリックする
4. 以下の情報を入力する:
   - **国/地域**: 日本
   - **タイムゾーン**: (GMT+09:00) 東京
   - **支払い通貨**: JPY（日本円）
5. AdMob の利用規約に同意し、アカウントを作成する

### 2-3-2. iOS アプリ登録

1. AdMob ダッシュボードの左メニューから **「アプリ」** → **「アプリを追加」** をクリックする
2. **「いいえ」**（アプリはまだ公開されていません）を選択する
3. 以下の情報を入力する:
   - **アプリ名**: `30sec Challenge`
   - **プラットフォーム**: `iOS`
4. **「追加」** をクリックする
5. 表示される **アプリID** をメモする（例: `ca-app-pub-XXXXXXXXXXXXXXXX~XXXXXXXXXX`）

> **重要**: このアプリIDを `flutter_app/ios/Runner/Info.plist` の `GADApplicationIdentifier` に設定します。

### 2-3-3. Android アプリ登録

1. **「アプリ」** → **「アプリを追加」** をクリックする
2. **「いいえ」** を選択する
3. 以下の情報を入力する:
   - **アプリ名**: `30sec Challenge`
   - **プラットフォーム**: `Android`
4. **「追加」** をクリックする
5. 表示される **アプリID** をメモする

> **重要**: このアプリIDを `flutter_app/android/app/src/main/AndroidManifest.xml` に設定します。

### 2-3-4. 広告ユニット作成

各プラットフォームで4種類、合計 **8個** の広告ユニットを作成します。

#### iOS の広告ユニット作成

AdMob で iOS アプリを選択し、**「広告ユニット」** → **「広告ユニットを追加」** から以下の4つを作成:

| 広告タイプ | 広告ユニット名 | 設定 |
|-----------|--------------|------|
| **バナー** | `ios_banner` | デフォルト設定でOK |
| **インタースティシャル** | `ios_interstitial` | デフォルト設定でOK |
| **リワード** | `ios_rewarded` | リワードアイテム名: `coins`、リワード数量: `10` |
| **ネイティブ** | `ios_native` | デフォルト設定でOK |

各広告ユニット作成後に表示される **広告ユニットID** をメモする。

#### Android の広告ユニット作成

AdMob で Android アプリを選択し、同様に4つの広告ユニットを作成:

| 広告タイプ | 広告ユニット名 | 設定 |
|-----------|--------------|------|
| **バナー** | `android_banner` | デフォルト設定でOK |
| **インタースティシャル** | `android_interstitial` | デフォルト設定でOK |
| **リワード** | `android_rewarded` | リワードアイテム名: `coins`、リワード数量: `10` |
| **ネイティブ** | `android_native` | デフォルト設定でOK |

### 2-3-5. iOS App ID の設定

`flutter_app/ios/Runner/Info.plist` の `GADApplicationIdentifier` を本番のアプリIDに更新する:

```xml
<!-- 変更前（テスト用ID） -->
<key>GADApplicationIdentifier</key>
<string>ca-app-pub-3940256099942544~1458002511</string>

<!-- 変更後（AdMobで取得した本番アプリID） -->
<key>GADApplicationIdentifier</key>
<string>ca-app-pub-XXXXXXXXXXXXXXXX~XXXXXXXXXX</string>
```

### 2-3-6. Android App ID の設定

`flutter_app/android/app/src/main/AndroidManifest.xml` の `<application>` タグ内に以下の `<meta-data>` を追加する:

```xml
<application
    android:label="thirty_sec_challenge"
    android:name="${applicationName}"
    android:icon="@mipmap/ic_launcher">

    <!-- AdMob App ID -->
    <meta-data
        android:name="com.google.android.gms.ads.APPLICATION_ID"
        android:value="ca-app-pub-XXXXXXXXXXXXXXXX~XXXXXXXXXX"/>

    <!-- 既存の Activity 定義はそのまま -->
    <activity ... >
```

> `ca-app-pub-XXXXXXXXXXXXXXXX~XXXXXXXXXX` を AdMob で取得した Android アプリIDに置き換えてください。

### 2-3-7. 広告ユニットIDの設定

`flutter_app/lib/core/constants/ad_constants.dart` の `_prod` 定数を更新する:

```dart
// ── Production IDs (AdMob で取得した広告ユニットID に置き換え) ──
// Android
static const _prodBannerAndroid = 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX';       // android_banner のID
static const _prodInterstitialAndroid = 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX'; // android_interstitial のID
static const _prodRewardedAndroid = 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX';     // android_rewarded のID
static const _prodNativeAndroid = 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX';       // android_native のID

// iOS
static const _prodBannerIos = 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX';           // ios_banner のID
static const _prodInterstitialIos = 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX';     // ios_interstitial のID
static const _prodRewardedIos = 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX';         // ios_rewarded のID
static const _prodNativeIos = 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX';           // ios_native のID
```

> **注意**: テスト広告IDは既にコードに設定済みです（`_testBanner` 等）。これらは変更せず、開発中は自動的にテストIDが使用されます。本番ビルドでのみ上記の本番IDが使用されます。

### 2-3-8. 広告ユニットID 一覧表（メモ用）

設定完了後、以下の表を埋めて管理してください:

| プラットフォーム | 広告タイプ | 広告ユニットID | 対応する定数名 |
|----------------|-----------|---------------|--------------|
| iOS | App ID | `ca-app-pub-____~____` | Info.plist `GADApplicationIdentifier` |
| iOS | Banner | `ca-app-pub-____/____` | `_prodBannerIos` |
| iOS | Interstitial | `ca-app-pub-____/____` | `_prodInterstitialIos` |
| iOS | Rewarded | `ca-app-pub-____/____` | `_prodRewardedIos` |
| iOS | Native | `ca-app-pub-____/____` | `_prodNativeIos` |
| Android | App ID | `ca-app-pub-____~____` | AndroidManifest.xml `APPLICATION_ID` |
| Android | Banner | `ca-app-pub-____/____` | `_prodBannerAndroid` |
| Android | Interstitial | `ca-app-pub-____/____` | `_prodInterstitialAndroid` |
| Android | Rewarded | `ca-app-pub-____/____` | `_prodRewardedAndroid` |
| Android | Native | `ca-app-pub-____/____` | `_prodNativeAndroid` |

---

## 2-4. Firebase セットアップ（FCM用）

Firebase Cloud Messaging（FCM）によるプッシュ通知の設定を行います。

### 2-4-1. Firebase プロジェクト作成

1. [Firebase Console](https://console.firebase.google.com/) にアクセスし、Googleアカウントでログインする
2. **「プロジェクトを追加」** をクリックする
3. **プロジェクト名**: `30sec-challenge` を入力する

> **重要**: 「Google Cloud の既存のプロジェクトをリンク」オプションが表示された場合は、[2-1](#2-1-google-cloud-console-セットアップ) で作成した `30sec-challenge` プロジェクトを選択してください。これにより、Google Cloud Console と Firebase の設定が統合されます。

4. **「続行」** をクリックする
5. Google アナリティクスの有効化:
   - 有効にする場合は **「Google アナリティクスを有効にする」** をオンにする
   - アナリティクスアカウントを選択（または新規作成）
6. **「プロジェクトを作成」** をクリックし、完了を待つ

### 2-4-2. iOS アプリ追加

1. Firebase プロジェクトのダッシュボードで **iOS アイコン（+）** をクリックする
2. 以下の情報を入力する:
   - **Apple バンドルID**: `com.thirtysecchallenge.thirtySecChallenge`
   - **アプリのニックネーム**: `30sec Challenge iOS`（任意）
   - **App Store ID**: （後から設定可能、空欄でOK）
3. **「アプリを登録」** をクリックする
4. **「GoogleService-Info.plist をダウンロード」** をクリックしてファイルを保存する
5. ダウンロードしたファイルを以下に配置する:

```
flutter_app/ios/Runner/GoogleService-Info.plist
```

6. 残りの手順（SDK追加など）は Flutter プラグインが自動処理するため、**「次へ」** → **「次へ」** → **「コンソールに進む」** をクリックする

### 2-4-3. Android アプリ追加

1. Firebase プロジェクトのダッシュボードで **Android アイコン（+）** をクリックする
2. 以下の情報を入力する:
   - **Android パッケージ名**: `com.thirtysecchallenge.thirty_sec_challenge`
   - **アプリのニックネーム**: `30sec Challenge Android`（任意）
   - **デバッグ用の署名証明書 SHA-1**: [2-1-6](#2-1-6-sha-1-フィンガープリントの取得方法) で取得した debug 用 SHA-1 を入力
3. **「アプリを登録」** をクリックする
4. **「google-services.json をダウンロード」** をクリックしてファイルを保存する
5. ダウンロードしたファイルを以下に配置する:

```
flutter_app/android/app/google-services.json
```

6. **「次へ」** → **「次へ」** → **「コンソールに進む」** をクリックする

### 2-4-4. Google Cloud Console と Firebase の設定ファイルについて

> **重要な補足**: Firebase Console からダウンロードした `GoogleService-Info.plist` と `google-services.json` には、Google Cloud Console で作成した OAuth クライアントIDの情報も含まれています。そのため、Firebase セットアップ後にダウンロードしたファイルを使用すれば、Google サインインと FCM の両方が正しく動作します。
>
> もし先に Google Cloud Console だけで設定ファイルをダウンロードしていた場合は、Firebase で再ダウンロードしたファイルで上書きしてください。

### 2-4-5. FCM の有効化

1. Firebase Console の左メニューから **「Cloud Messaging」** を選択する
2. FCM は Firebase プロジェクト作成時に自動的に有効化されている
3. iOS の場合、APNs（Apple Push Notification service）の設定が追加で必要:
   - Firebase Console → **「プロジェクトの設定」** → **「Cloud Messaging」** タブ
   - **「iOS アプリの設定」** セクションで **「APNs 認証キー」** の **「アップロード」** をクリック
   - [2-2-4](#2-2-4-key-作成sign-in-with-apple-用-private-key) で作成した `.p8` キーとは別に、APNs 用のキーを作成する必要がある場合があります

#### APNs 認証キーの作成（FCM の iOS プッシュ通知用）

1. [Apple Developer - Keys](https://developer.apple.com/account/resources/authkeys/list) にアクセスする
2. **「+」** ボタンをクリックする
3. **Key Name**: `30sec Challenge Push Key`
4. **「Apple Push Notifications service (APNs)」** にチェックを入れる
5. **「Continue」** → **「Register」** をクリックする
6. `.p8` ファイルをダウンロードし、**Key ID** をメモする
7. Firebase Console に戻り、以下をアップロードする:
   - **APNs 認証キー**: ダウンロードした `.p8` ファイル
   - **キーID**: メモした Key ID
   - **チームID**: Apple Developer の Team ID

> **ヒント**: Sign in with Apple 用の Key に APNs も同時にチェックを入れることで、1つの Key で両方をカバーできます。その場合は [2-2-4](#2-2-4-key-作成sign-in-with-apple-用-private-key) の手順で APNs にもチェックを入れてください。

### 2-4-6. サーバーサイド: Service Account Key JSON

バックエンドから FCM API を呼び出すために、Service Account Key が必要です。

1. Firebase Console → **「プロジェクトの設定」** → **「サービス アカウント」** タブを開く
2. **「Node.js」** が選択されていることを確認する
3. **「新しい秘密鍵の生成」** をクリックする
4. 確認ダイアログで **「キーを生成」** をクリックする
5. JSON ファイルが自動的にダウンロードされる（例: `30sec-challenge-firebase-adminsdk-xxxxx-xxxxxxxxxx.json`）
6. ダウンロードしたファイルをサーバーに配置する:

```bash
# サーバー上での配置例
mkdir -p /opt/30sec-challenge/backend/keys
cp 30sec-challenge-firebase-adminsdk-xxxxx-xxxxxxxxxx.json \
   /opt/30sec-challenge/backend/keys/serviceAccountKey.json
```

7. 環境変数で JSON ファイルのパスを設定する:

```bash
# .env に追加
GOOGLE_APPLICATION_CREDENTIALS=/app/keys/serviceAccountKey.json
FCM_PROJECT_ID=30sec-challenge   # Firebase プロジェクトID
```

> **警告**: `serviceAccountKey.json` は絶対に Git リポジトリにコミットしないでください。`.gitignore` に `**/keys/` や `**/serviceAccountKey.json` が含まれていることを確認してください。

---

## 2-5. Cloudflare R2 ストレージ設定

動画・画像のアップロード先となるオブジェクトストレージを設定します。

Cloudflare R2 は S3 互換の API を提供し、データ転送料（エグレス料金）が無料のため、動画配信に非常に向いています。

#### 2-5-1. Cloudflare アカウント作成

1. [Cloudflare](https://dash.cloudflare.com/sign-up) にアクセスする
2. メールアドレスとパスワードを入力し、アカウントを作成する
3. メール認証を完了する

#### 2-5-2. R2 ストレージ有効化

1. Cloudflare ダッシュボードの左メニューから **「R2 オブジェクトストレージ」** をクリックする
2. 初回は支払い情報（クレジットカード）の登録が求められる
3. 支払い情報を登録する（R2 は従量課金制、無料枠あり）

| R2 無料枠（月間） | 内容 |
|------------------|------|
| ストレージ | 10 GB |
| クラスA操作（書き込み） | 1,000,000 回 |
| クラスB操作（読み取り） | 10,000,000 回 |
| データ転送（エグレス） | **無料**（無制限） |

#### 2-5-3. バケット作成

1. **「R2 オブジェクトストレージ」** → **「バケットを作成」** をクリックする
2. 以下を設定する:
   - **バケット名**: `video-challenge`（または任意の名前）
   - **ロケーション**: `Asia Pacific (APAC)` を選択（日本向けに最適）
3. **「バケットを作成」** をクリックする

#### 2-5-4. API トークン（R2用）作成

1. **「R2 オブジェクトストレージ」** → **「R2 API トークンの管理」** をクリックする
2. **「API トークンを作成する」** をクリックする
3. 以下を設定する:
   - **トークン名**: `30sec-challenge-backend`
   - **権限**: **「オブジェクトの読み取りと書き込み」** を選択
   - **バケットの指定**: **「特定のバケットのみに適用」** → `video-challenge` を選択
   - **TTL**: （任意、デフォルトで無期限）
4. **「API トークンを作成する」** をクリックする
5. 表示される以下の情報を必ずメモする（一度しか表示されない）:

| 項目 | `.env` 変数 | 例 |
|------|------------|-----|
| **アクセスキーID** | `S3_ACCESS_KEY` | `a1b2c3d4e5f6g7h8i9j0...` |
| **シークレットアクセスキー** | `S3_SECRET_KEY` | `x1y2z3a4b5c6d7e8f9g0...` |
| **S3 互換エンドポイント** | `S3_ENDPOINT` | -- （下記参照） |

#### 2-5-5. S3 互換エンドポイントの確認

R2 の S3 互換エンドポイントは以下の形式です:

```
https://<ACCOUNT_ID>.r2.cloudflarestorage.com
```

**Account ID の確認方法**:
1. Cloudflare ダッシュボードの左メニュー **「R2 オブジェクトストレージ」** をクリックする
2. 右側の **「アカウントの詳細」** セクションに表示される

`.env` への設定:

```bash
S3_ENDPOINT=https://a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6.r2.cloudflarestorage.com
S3_REGION=auto
S3_BUCKET=video-challenge
S3_ACCESS_KEY=<取得したアクセスキーID>
S3_SECRET_KEY=<取得したシークレットアクセスキー>
CDN_BASE_URL=https://pub-xxxxxxxxxxxxxxxxxxxxxxxxxxxx.r2.dev
```

> **CDN_BASE_URL について**: R2 バケットの **「設定」** → **「パブリックアクセス」** で `r2.dev` サブドメインを有効化すると、パブリック URL が生成されます。カスタムドメインも設定可能です。

#### 2-5-6. CORS 設定

1. R2 バケットの **「設定」** タブを開く
2. **「CORS ポリシー」** セクションで **「CORS ポリシーを追加」** をクリックする
3. 以下の JSON を入力する:

```json
[
  {
    "AllowedOrigins": ["https://yourdomain.com", "http://localhost:3000"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag", "Content-Length"],
    "MaxAgeSeconds": 3600
  }
]
```

4. **「保存」** をクリックする

---

## 2-6. Xserver VPS デプロイ手順

### 2-6-1. Xserver VPS のプラン選択

| プラン | メモリ | CPU | ディスク | 月額（税込） | 推奨度 |
|-------|-------|-----|---------|-------------|--------|
| 2GB | 2 GB | 3 vCPU | 50 GB NVMe | 約 ¥830〜 | 最低限（開発/テスト用） |
| **4GB** | **4 GB** | **4 vCPU** | **100 GB NVMe** | **約 ¥1,700〜** | **推奨（小〜中規模）** |
| 8GB | 8 GB | 6 vCPU | 100 GB NVMe | 約 ¥3,201〜 | 余裕のある運用 |

> **推奨**: 4GB プラン以上。docker-compose.prod.yml のコンテナメモリ合計が約2.15GBのため、OS・Nginx分を含めて4GB以上が必要です。

### 2-6-2. 契約・初期設定

1. [Xserver VPS](https://vps.xserver.ne.jp/) にアクセスする
2. **「お申し込み」** をクリックする
3. Xserver アカウントを作成する（既にあればログイン）
4. プランを選択する（推奨: 4GB以上）
5. **サーバーOS**: **「Ubuntu 22.04」** または **「Ubuntu 24.04」** を選択する
6. **rootパスワード** を設定する（強力なパスワードを使用）
7. **SSH Key** の設定:
   - **「SSH Key を設定する」** にチェックを入れる
   - **「SSH Key を自動で生成する」** を選択する
   - **「キーペアを生成」** をクリックし、秘密鍵 (`.pem`) をダウンロードする
8. 支払い情報を入力し、契約を完了する
9. VPS のセットアップ完了メールを待つ（通常数分〜数十分）

### 2-6-3. SSH 接続設定

#### ローカル PC での設定

1. ダウンロードした秘密鍵ファイルの権限を変更する:

```bash
chmod 600 ~/Downloads/xserver-vps-key.pem
```

2. SSH config を設定する（`~/.ssh/config` に追加）:

```
Host 30sec-vps
    HostName <VPSのIPアドレス>
    User root
    IdentityFile ~/Downloads/xserver-vps-key.pem
    Port 22
```

3. SSH 接続テスト:

```bash
ssh 30sec-vps
```

#### セキュリティ強化（推奨）

接続後、以下の初期設定を行う:

```bash
# 1. システムアップデート
apt update && apt upgrade -y

# 2. デプロイ用ユーザーの作成
adduser deploy
usermod -aG sudo deploy

# 3. デプロイユーザーにSSHキーを設定
mkdir -p /home/deploy/.ssh
cp ~/.ssh/authorized_keys /home/deploy/.ssh/
chown -R deploy:deploy /home/deploy/.ssh
chmod 700 /home/deploy/.ssh
chmod 600 /home/deploy/.ssh/authorized_keys

# 4. SSH設定の強化（/etc/ssh/sshd_config を編集）
sed -i 's/#PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config
sed -i 's/#PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
systemctl restart sshd
```

以降はデプロイユーザーで接続する:

```bash
# ~/.ssh/config の User を deploy に変更
ssh 30sec-vps
```

### 2-6-4. Docker / Docker Compose インストール

```bash
# Docker Engine のインストール
curl -fsSL https://get.docker.com | sh

# deploy ユーザーを docker グループに追加（sudoなしでdockerコマンドを実行可能にする）
sudo usermod -aG docker deploy

# 一度ログアウトして再接続（グループ変更を反映）
exit
ssh 30sec-vps

# Docker の動作確認
docker --version
docker compose version
```

期待される出力:
```
Docker version 27.x.x, build xxxxxxx
Docker Compose version v2.x.x
```

### 2-6-5. リポジトリのクローン

```bash
# Git のインストール（まだない場合）
sudo apt install -y git

# デプロイディレクトリにクローン
sudo mkdir -p /opt/30sec-challenge
sudo chown deploy:deploy /opt/30sec-challenge
git clone <あなたのリポジトリURL> /opt/30sec-challenge

# ディレクトリ確認
ls /opt/30sec-challenge/
# 出力: backend/  flutter_app/  DEPLOYMENT.md  ...
```

### 2-6-6. ドメイン設定

#### 方法A: Xserver VPS の DNS 設定を使う場合

1. Xserver VPS 管理パネルにログインする
2. **「DNS設定」** メニューを開く
3. ドメインを追加し、以下のレコードを設定する:

| タイプ | ホスト名 | 値 | TTL |
|--------|---------|-----|-----|
| A | `api.yourdomain.com` | `<VPSのIPアドレス>` | 3600 |
| A | `yourdomain.com` | `<VPSのIPアドレス>` | 3600 |

#### 方法B: 外部のドメインレジストラを使う場合

ドメインレジストラ（お名前.com、ムームードメインなど）の DNS 管理画面で、A レコードを VPS の IP アドレスに向ける:

```
api.yourdomain.com  →  A  →  <VPSのIPアドレス>
```

> **確認**: DNS が反映されたか確認する（反映まで数分〜数時間かかる場合がある）:
> ```bash
> dig api.yourdomain.com +short
> # VPS の IP アドレスが返ることを確認
> ```

### 2-6-7. SSL 証明書取得（Let's Encrypt + certbot）

```bash
# Nginx と certbot のインストール
sudo apt update && sudo apt install -y nginx certbot python3-certbot-nginx

# Nginx の起動・自動起動設定
sudo systemctl enable nginx
sudo systemctl start nginx

# SSL 証明書の取得
sudo certbot --nginx -d api.yourdomain.com

# 対話式プロンプトの回答:
# 1. メールアドレスを入力（証明書の期限切れ通知用）
# 2. 利用規約に同意: Y
# 3. メール共有: 任意（N でOK）
# 4. HTTP → HTTPS リダイレクト: 2（Redirect）を選択
```

#### 自動更新の確認

```bash
# テスト更新の実行
sudo certbot renew --dry-run

# タイマーの確認
sudo systemctl status certbot.timer
```

certbot は systemd タイマーで自動的に証明書を更新します（期限の30日前に実行）。

### 2-6-8. Nginx 設定

プロジェクトに含まれる `deploy/nginx.conf` を利用します。

```bash
# Nginx 設定ファイルのコピー
sudo cp /opt/30sec-challenge/deploy/nginx.conf /etc/nginx/sites-available/30sec-challenge

# ドメイン名を実際のものに置換
sudo sed -i 's/api.yourdomain.com/api.実際のドメイン.com/g' /etc/nginx/sites-available/30sec-challenge

# シンボリックリンクを作成し、デフォルト設定を削除
sudo ln -sf /etc/nginx/sites-available/30sec-challenge /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# 設定のテスト
sudo nginx -t

# Nginx を再読み込み
sudo systemctl reload nginx
```

> **補足**: `deploy/nginx.conf` には以下の機能が含まれています:
> - HTTP → HTTPS リダイレクト
> - セキュリティヘッダー（HSTS、X-Frame-Options 等）
> - Gzip 圧縮
> - レート制限（API: 30req/s、Auth: 5req/s、Upload: 2req/s）
> - WebSocket サポート

### 2-6-9. docker-compose.prod.yml でのデプロイ

> 詳細な手順は `DEPLOYMENT.md` も参照してください。

#### Step 1: 環境変数ファイルの作成

```bash
cd /opt/30sec-challenge/backend
cp .env.example .env
```

#### Step 2: シークレットの生成

```bash
# JWT シークレット（アクセストークン用）
openssl rand -base64 64
# → .env の JWT_SECRET に設定

# JWT リフレッシュシークレット（リフレッシュトークン用）
openssl rand -base64 64
# → .env の JWT_REFRESH_SECRET に設定

# PostgreSQL パスワード
openssl rand -base64 32
# → .env の POSTGRES_PASSWORD に設定

# Redis パスワード
openssl rand -base64 32
# → .env の REDIS_PASSWORD に設定
```

#### Step 3: .env ファイルの編集

```bash
nano .env
```

以下は `.env` の全項目の説明と設定値です:

##### アプリケーション基本設定

| 変数名 | 設定値 | 説明 |
|--------|-------|------|
| `NODE_ENV` | `production` | 本番環境。`production` に設定すること |
| `PORT` | `3000` | Express サーバーのリッスンポート。通常は変更不要 |

##### データベース（PostgreSQL）

| 変数名 | 設定値 | 説明 |
|--------|-------|------|
| `DATABASE_URL` | （docker-compose.prod.yml が自動設定） | アプリコンテナ内で自動的に構築される。直接設定は不要 |
| `POSTGRES_USER` | `app_user` | PostgreSQL のユーザー名 |
| `POSTGRES_PASSWORD` | `<生成したパスワード>` | **必須**。上記 Step 2 で生成した値 |
| `POSTGRES_DB` | `video_challenge` | データベース名。変更する場合は全体の整合性に注意 |

##### Redis

| 変数名 | 設定値 | 説明 |
|--------|-------|------|
| `REDIS_URL` | （docker-compose.prod.yml が自動設定） | アプリコンテナ内で自動的に構築される。直接設定は不要 |
| `REDIS_PASSWORD` | `<生成したパスワード>` | **必須**。上記 Step 2 で生成した値 |

##### JWT 認証

| 変数名 | 設定値 | 説明 |
|--------|-------|------|
| `JWT_SECRET` | `<生成した64バイト以上の文字列>` | **必須**。アクセストークンの署名に使用 |
| `JWT_REFRESH_SECRET` | `<生成した別の64バイト以上の文字列>` | **必須**。リフレッシュトークンの署名に使用。JWT_SECRET とは異なる値にすること |
| `JWT_EXPIRES_IN` | `15m` | アクセストークンの有効期限。`15m`（15分）推奨 |
| `JWT_REFRESH_EXPIRES_IN` | `7d` | リフレッシュトークンの有効期限。`7d`（7日）推奨 |

##### S3 / オブジェクトストレージ

| 変数名 | 設定値の例 | 説明 |
|--------|----------|------|
| `S3_ENDPOINT` | `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`（R2の場合） | S3 互換エンドポイント URL |
| `S3_REGION` | `auto`（R2）/ `ap-northeast-1`（AWS） | リージョン。R2 の場合は `auto` |
| `S3_BUCKET` | `video-challenge` | バケット名 |
| `S3_ACCESS_KEY` | `<取得したアクセスキーID>` | S3 アクセスキー |
| `S3_SECRET_KEY` | `<取得したシークレットキー>` | S3 シークレットキー |

##### CDN

| 変数名 | 設定値の例 | 説明 |
|--------|----------|------|
| `CDN_BASE_URL` | `https://pub-xxxx.r2.dev`（R2）/ `https://d1234.cloudfront.net`（CloudFront） | アップロードされたメディアの公開URL のベース |

##### Google OAuth

| 変数名 | 設定値の例 | 説明 |
|--------|----------|------|
| `GOOGLE_CLIENT_ID` | `123456789012-xxxxx.apps.googleusercontent.com` | [2-1-5](#2-1-5-web用クライアントid作成バックエンド検証用) で作成した Web 用クライアントID |

##### Apple Sign-In

| 変数名 | 設定値の例 | 説明 |
|--------|----------|------|
| `APPLE_CLIENT_ID` | `com.thirtysecchallenge.thirtySecChallenge.service` | [2-2-3](#2-2-3-service-id-作成バックエンドコールバック用) で作成した Service ID |
| `APPLE_TEAM_ID` | `ABCDE12345` | [2-2-5](#2-2-5-team-id--key-id--bundle-id-の確認場所) で確認した Team ID |
| `APPLE_KEY_ID` | `ABC123DEF4` | [2-2-4](#2-2-4-key-作成sign-in-with-apple-用-private-key) で取得した Key ID |

##### Firebase Cloud Messaging

| 変数名 | 設定値の例 | 説明 |
|--------|----------|------|
| `FCM_PROJECT_ID` | `30sec-challenge` | [2-4-1](#2-4-1-firebase-プロジェクト作成) で作成した Firebase プロジェクトID |

##### CORS

| 変数名 | 設定値の例 | 説明 |
|--------|----------|------|
| `CORS_ORIGIN` | `https://yourdomain.com` | 許可するオリジン。モバイルアプリのみの場合は `*` でもOK だが、セキュリティ上は具体的なドメインを設定 |

##### ログ

| 変数名 | 設定値 | 説明 |
|--------|-------|------|
| `LOG_LEVEL` | `info` | ログレベル。`error`, `warn`, `info`, `debug` のいずれか。本番は `info` 推奨 |

##### レート制限

| 変数名 | 設定値 | 説明 |
|--------|-------|------|
| `RATE_LIMIT_DISABLED` | `false` | レート制限の無効化。本番では **絶対に `false`** にすること |

##### docker-compose.prod.yml 専用の追加変数

以下の変数は `docker-compose.prod.yml` 内でコンテナ間通信の URL を自動構築するために使われます:

| 変数名 | 設定値の例 | 説明 |
|--------|----------|------|
| `POSTGRES_USER` | `app_user` | PostgreSQL のユーザー名。DATABASE_URL の構築に使用 |
| `POSTGRES_PASSWORD` | `<生成したパスワード>` | PostgreSQL のパスワード。DATABASE_URL の構築に使用 |
| `POSTGRES_DB` | `video_challenge` | データベース名。DATABASE_URL の構築に使用 |
| `REDIS_PASSWORD` | `<生成したパスワード>` | Redis のパスワード。REDIS_URL の構築に使用 |

#### Step 4: Firebase Service Account Key の配置

```bash
mkdir -p /opt/30sec-challenge/backend/keys
# ローカルPCからSCPでアップロード
# （ローカルPC側で実行）
scp serviceAccountKey.json deploy@<VPSのIP>:/opt/30sec-challenge/backend/keys/
```

#### Step 5: ビルドと起動

```bash
cd /opt/30sec-challenge/backend
docker compose -f docker-compose.prod.yml up -d --build
```

起動するコンテナ:

| コンテナ名 | サービス | ポート |
|-----------|---------|-------|
| `vc_app` | Node.js バックエンド | 3000 |
| `vc_postgres` | PostgreSQL 16 | 5432 |
| `vc_redis` | Redis 7 | 6379 |

#### Step 6: 起動確認

```bash
# コンテナの状態確認
docker compose -f docker-compose.prod.yml ps

# ヘルスチェック
curl http://localhost:3000/api/health

# 期待されるレスポンス:
# {"success":true,"data":{"status":"ok","timestamp":"..."},"message":"Service is healthy"}
```

### 2-6-10. データベースマイグレーション＆シード実行

```bash
# マイグレーション実行
docker exec vc_app node -e "
  const knex = require('knex');
  const config = { client: 'pg', connection: process.env.DATABASE_URL };
  const db = knex(config);
  db.migrate.latest({ directory: '/app/migrations' })
    .then(([batch, log]) => { console.log('Batch', batch, ':', log); return db.destroy(); })
    .catch(err => { console.error(err); process.exit(1); });
"

# シード実行（初回デプロイ時のみ）
# サブスクリプションプラン、コインパッケージ、ギフトカタログ、実績、サンプルチャレンジの初期データ
docker exec vc_app node -e "
  const knex = require('knex');
  const config = { client: 'pg', connection: process.env.DATABASE_URL };
  const db = knex(config);
  db.seed.run({ directory: '/app/seeds' })
    .then((result) => { console.log('Seeds:', result); return db.destroy(); })
    .catch(err => { console.error(err); process.exit(1); });
"
```

### 2-6-11. ファイアウォール設定

```bash
# UFW（Uncomplicated Firewall）の設定
sudo ufw allow 22/tcp     # SSH
sudo ufw allow 80/tcp     # HTTP（Let's Encrypt & リダイレクト用）
sudo ufw allow 443/tcp    # HTTPS

# バックエンド・DB・Redisへの外部直接アクセスをブロック
sudo ufw deny 3000/tcp    # Node.js（Nginx経由のみ）
sudo ufw deny 5432/tcp    # PostgreSQL
sudo ufw deny 6379/tcp    # Redis

# ファイアウォール有効化
sudo ufw --force enable

# 確認
sudo ufw status verbose
```

期待される出力:
```
Status: active

To                         Action      From
--                         ------      ----
22/tcp                     ALLOW       Anywhere
80/tcp                     ALLOW       Anywhere
443/tcp                    ALLOW       Anywhere
3000/tcp                   DENY        Anywhere
5432/tcp                   DENY        Anywhere
6379/tcp                   DENY        Anywhere
```

### 2-6-12. データベースバックアップの cron 設定

```bash
# バックアップディレクトリの作成
sudo mkdir -p /opt/backups/postgres
sudo chown deploy:deploy /opt/backups/postgres

# バックアップスクリプトの作成
cat > /opt/backups/backup-postgres.sh << 'SCRIPT'
#!/bin/bash
set -euo pipefail

BACKUP_DIR="/opt/backups/postgres"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
FILENAME="video_challenge_${TIMESTAMP}.sql.gz"
RETENTION_DAYS=14

# Docker コンテナからダンプを取得
docker exec vc_postgres pg_dump \
  -U "${POSTGRES_USER:-app_user}" \
  -d "${POSTGRES_DB:-video_challenge}" \
  --no-owner --no-acl \
  | gzip > "${BACKUP_DIR}/${FILENAME}"

# 保持期間を過ぎたバックアップを削除
find "${BACKUP_DIR}" -name "*.sql.gz" -mtime +${RETENTION_DAYS} -delete

echo "[$(date)] Backup complete: ${FILENAME} ($(du -h "${BACKUP_DIR}/${FILENAME}" | cut -f1))"
SCRIPT

# 実行権限を付与
chmod +x /opt/backups/backup-postgres.sh

# cron ジョブの登録（毎日 AM 3:00 に実行）
(crontab -l 2>/dev/null; echo "0 3 * * * /opt/backups/backup-postgres.sh >> /opt/backups/backup.log 2>&1") | crontab -

# cron ジョブの確認
crontab -l
```

#### バックアップからの復元方法

```bash
# 特定のバックアップから復元
gunzip -c /opt/backups/postgres/video_challenge_20260209_030000.sql.gz \
  | docker exec -i vc_postgres psql -U app_user -d video_challenge
```

---

## 2-7. ストア申請手順

### App Store Connect（iOS）

#### 2-7-1. App Store Connect へのアクセス

1. [App Store Connect](https://appstoreconnect.apple.com/) にアクセスする
2. Apple Developer Program に登録済みの Apple ID でサインインする

#### 2-7-2. 新規アプリ作成

1. **「マイ App」** → **「+」** → **「新規App」** をクリックする
2. 以下の情報を入力する:
   - **プラットフォーム**: iOS にチェック
   - **名前**: `30sec Challenge`（App Store に表示される名前、30文字以内）
   - **プライマリ言語**: 日本語
   - **バンドルID**: `com.thirtysecchallenge.thirtySecChallenge`（ドロップダウンから選択）
   - **SKU**: `thirty-sec-challenge`（内部管理用、任意の一意文字列）
   - **ユーザーアクセス**: フルアクセス
3. **「作成」** をクリックする

#### 2-7-3. アプリ情報入力

**「App 情報」** タブで以下を設定する:

##### 日本語の情報

| 項目 | 内容 |
|------|------|
| 名前 | `30sec Challenge` |
| サブタイトル | `30秒動画チャレンジSNS` |
| カテゴリ | プライマリ: `ソーシャルネットワーキング`、セカンダリ: `エンターテインメント` |
| プライバシーポリシーURL | `https://yourdomain.com/privacy` |

##### 英語の情報（ローカライゼーション追加）

1. 右上の **「+」** ボタンで **「English」** を追加する
2. 以下を入力する:

| 項目 | 内容 |
|------|------|
| Name | `30sec Challenge` |
| Subtitle | `30-Second Video Challenge SNS` |

#### 2-7-4. バージョン情報（「App Store」タブ）

##### スクリーンショット要件

| デバイス | サイズ | 必要枚数 | 対応デバイス |
|---------|-------|---------|-------------|
| 6.7インチ | 1290 x 2796 px | 3〜10枚 | iPhone 15 Pro Max, 14 Pro Max |
| 6.5インチ | 1284 x 2778 px | 3〜10枚 | iPhone 14 Plus, 13 Pro Max |
| 5.5インチ | 1242 x 2208 px | 3〜10枚 | iPhone 8 Plus |
| iPad 12.9インチ（第6世代） | 2048 x 2732 px | 3〜10枚 | iPad Pro 12.9 |

> **ヒント**: 6.7インチのスクリーンショットを用意すれば、他のサイズに自動適用されます（ただしiPad は別途必要）。

スクリーンショットのコツ:
- 主要な機能画面を3〜5枚撮影する（フィード、チャレンジ詳細、プロフィール等）
- テキストオーバーレイで機能説明を追加する
- 実機またはシミュレーターのスクリーンショットを使用する

##### プレビュー動画の要件

| 項目 | 要件 |
|------|------|
| 形式 | H.264, MOV または MP4 |
| 最大長さ | 30秒 |
| サイズ | 各スクリーンショットサイズに対応 |
| 音声 | 含めることを推奨 |

> **注意**: プレビュー動画は任意ですが、ダウンロード率の向上に効果的です。

##### その他の情報

| 項目 | 設定値 |
|------|-------|
| 説明文 | アプリの機能・特徴を最大4000文字で記述 |
| キーワード | `動画,チャレンジ,SNS,30秒,ショート動画`（100文字以内、カンマ区切り） |
| サポートURL | `https://yourdomain.com/support` |
| マーケティングURL | `https://yourdomain.com` （任意） |
| 年齢制限 | アプリ内容に応じて設定 |

#### 2-7-5. App Review ガイドライン注意点

Apple のレビューで**リジェクト（却下）されやすい点**と対策:

| よくあるリジェクト理由 | 対策 |
|---------------------|------|
| ユーザー生成コンテンツ (UGC) のモデレーション不足 | 通報機能・ブロック機能・コンテンツガイドラインの表示が必須 |
| ログイン必須でアプリを試せない | ゲストブラウジング可能にする、またはデモアカウント情報をレビューノートに記載 |
| プライバシーポリシーが不十分 | 収集データ・使用目的・第三者共有の詳細を明記 |
| Sign in with Apple 未対応 | ソーシャルログインを提供する場合、Apple Sign In も必須 |
| 広告が過度 | インタースティシャル広告の表示頻度を適切に制限 |

**レビューノートに記載すべき情報**:
- テストアカウントのメールアドレスとパスワード
- 主要機能のテスト手順
- アプリ内課金がある場合はその説明

#### 2-7-6. プライバシーポリシーURL 設定

1. **「App 情報」** タブの **「プライバシーポリシーURL」** に URL を入力する
2. **「App のプライバシー」** タブで収集データを申告する:
   - **連絡先情報**: メールアドレス
   - **識別子**: ユーザーID
   - **使用状況データ**: 広告データ
   - **コンテンツ**: 動画、写真

#### 2-7-7. ビルド＆アップロード（iOS）

```bash
# Flutter プロジェクトディレクトリに移動
cd /Users/ken/Desktop/App/30sec-challenge/flutter_app

# リリースビルド
flutter build ipa --release

# ビルド成果物の場所
# build/ios/archive/Runner.xcarchive
# build/ios/ipa/thirty_sec_challenge.ipa
```

アップロード方法（2つの方法）:

**方法A: Xcode を使用**

1. `flutter_app/ios/Runner.xcworkspace` を Xcode で開く
2. メニューバー → **Product** → **Archive** をクリック
3. Archive が完了したら **「Distribute App」** をクリック
4. **「App Store Connect」** → **「Upload」** を選択
5. オプションを確認して **「Upload」** をクリック

**方法B: コマンドラインを使用**

```bash
# Transporter CLI でアップロード
xcrun altool --upload-app \
  --type ios \
  --file build/ios/ipa/thirty_sec_challenge.ipa \
  --apiKey <App Store Connect API Key ID> \
  --apiIssuer <Issuer ID>
```

アップロード後、App Store Connect でビルドが処理されるまで数分〜数十分待つ。

---

### Google Play Console（Android）

#### 2-7-8. Google Play Developer アカウント登録

| 項目 | 内容 |
|------|------|
| 費用 | $25 USD（一回限り） |
| URL | https://play.google.com/console/signup |
| 必要なもの | Google アカウント、クレジットカード、本人確認書類 |

1. [Google Play Console](https://play.google.com/console/signup) にアクセスする
2. Google アカウントでサインインする
3. **開発者アカウントの種類**を選択する:
   - **個人**: 個人開発者
   - **組織**: 法人・団体
4. デベロッパー名を入力する（ストアに表示される名前）
5. 連絡先情報を入力する
6. $25 USD の登録料を支払う
7. 本人確認（ID の提出が求められる場合あり）を完了する

> **注意**: アカウント承認まで最大48時間かかる場合があります。

#### 2-7-9. アプリ作成

1. Google Play Console のダッシュボードで **「アプリを作成」** をクリックする
2. 以下の情報を入力する:
   - **アプリ名**: `30sec Challenge`
   - **デフォルトの言語**: 日本語 - ja
   - **アプリ / ゲーム**: アプリ
   - **無料 / 有料**: 無料
3. デベロッパー プログラム ポリシーと米国輸出法への同意にチェックを入れる
4. **「アプリを作成」** をクリックする

#### 2-7-10. ストア掲載情報

**「メインのストアの掲載情報」** で以下を入力する:

| 項目 | 要件 | 内容 |
|------|------|------|
| アプリ名 | 最大30文字 | `30sec Challenge` |
| 簡単な説明 | 最大80文字 | `30秒の動画チャレンジで競い合おう！` |
| 詳細な説明 | 最大4000文字 | アプリの機能・特徴を詳述 |
| アプリアイコン | 512 x 512 px, PNG | 高解像度アイコン |
| フィーチャーグラフィック | 1024 x 500 px, PNG/JPG | ストア上部のバナー画像 |
| スクリーンショット | 最低2枚、最大8枚 | 主要画面のキャプチャ |
| 動画 | YouTube URL（任意） | プロモーション動画 |

#### 2-7-11. コンテンツレーティング（IARC）

1. **「コンテンツのレーティング」** セクションを開く
2. **「アンケートを開始」** をクリックする
3. 以下のように回答する:

| 質問カテゴリ | 回答 |
|------------|------|
| メールアドレス | 連絡先メールアドレスを入力 |
| カテゴリの選択 | **「ソーシャル / コミュニケーション」** |
| 暴力的なコンテンツ | **「いいえ」** |
| 性的なコンテンツ | **「いいえ」** |
| 冒とく的な言葉遣い | **「いいえ」** |
| 規制物質 | **「いいえ」** |
| ユーザー生成コンテンツ | **「はい」**（ユーザーが動画を投稿するため） |
| ユーザー同士がコミュニケーションや情報交換を行えますか | **「はい」** |
| 個人情報を共有しますか | **「はい」**（ユーザー名、プロフィール情報） |
| 位置情報を共有しますか | **「いいえ」** |
| デジタル商品の購入 | **「はい」**（アプリ内課金がある場合） |

4. 回答を確認し、**「送信」** をクリックする
5. IARC レーティングが自動的に割り当てられる（通常は「全年齢」または「12+」）

#### 2-7-12. リリース署名鍵の設定

##### keystore の作成

```bash
# keystore の生成
keytool -genkey -v -keystore ~/30sec-challenge-release.jks \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -alias release-key

# プロンプトに従って以下を入力:
# - キーストアのパスワード
# - 名前、組織名、都市、国コード (JP)
```

##### key.properties の作成

`flutter_app/android/key.properties` を作成する:

```properties
storePassword=<キーストアのパスワード>
keyPassword=<キーのパスワード>
keyAlias=release-key
storeFile=/Users/ken/30sec-challenge-release.jks
```

> **警告**: `key.properties` と `.jks` ファイルは絶対に Git リポジトリにコミットしないでください。`.gitignore` に追加されていることを確認してください。

##### build.gradle.kts の確認

`flutter_app/android/app/build.gradle.kts` には既にリリース署名の設定が含まれています:

```kotlin
val keystorePropertiesFile = rootProject.file("key.properties")
val keystoreProperties = Properties()
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(FileInputStream(keystorePropertiesFile))
}

// ...

signingConfigs {
    create("release") {
        if (keystorePropertiesFile.exists()) {
            keyAlias = keystoreProperties["keyAlias"] as String
            keyPassword = keystoreProperties["keyPassword"] as String
            storeFile = file(keystoreProperties["storeFile"] as String)
            storePassword = keystoreProperties["storePassword"] as String
        }
    }
}
```

#### 2-7-13. ビルド＆アップロード（Android）

```bash
# Flutter プロジェクトディレクトリに移動
cd /Users/ken/Desktop/App/30sec-challenge/flutter_app

# リリース用 App Bundle のビルド
flutter build appbundle --release

# ビルド成果物の場所
# build/app/outputs/bundle/release/app-release.aab
```

アップロード手順:

1. Google Play Console → 対象アプリ → **「リリース」** → **「製品版」** を開く
2. **「新しいリリースを作成」** をクリックする
3. **「App Bundle」** セクションで `app-release.aab` をドラッグ＆ドロップ、またはアップロードする
4. **リリース名**: `1.0.0`（バージョン番号）
5. **リリースノート**: 初回リリースの説明を日本語・英語で記載する
6. **「リリースのレビュー」** → **「製品版としてリリース開始」** をクリックする

> **注意**: Google Play App Signing を使用する場合（推奨）、初回アップロード時に Google が管理する署名鍵が自動的に設定されます。この場合、Google Play Console の **「設定」→「アプリの署名」** から SHA-1 フィンガープリントを取得し、[2-1-4](#2-1-4-android用クライアントid作成) の Google Cloud Console に追加してください。

---

### 共通: プライバシーポリシーと利用規約

#### 2-7-14. プライバシーポリシーの作成ポイント

App Store・Google Play の両方で、プライバシーポリシーの URL が必須です。

##### 記載すべき項目

| セクション | 内容 |
|-----------|------|
| **収集するデータ** | メールアドレス、ユーザー名、プロフィール画像、投稿動画、デバイス情報（OS、デバイスモデル）、広告識別子 |
| **データの使用目的** | アカウント管理、コンテンツ表示、プッシュ通知、広告配信、アプリ改善 |
| **データの保存期間** | アカウント存続期間中。退会後は30日以内に削除 |
| **第三者への提供** | Google（認証・広告）、Apple（認証）、Firebase（プッシュ通知）、Cloudflare/AWS（ストレージ） |
| **ユーザーの権利** | データのアクセス・修正・削除の請求方法 |
| **Cookie / トラッキング** | 使用する技術と目的 |
| **子供のプライバシー** | 13歳未満の利用制限（COPPA / 児童オンライン保護法対応） |
| **変更の通知** | ポリシー変更時の通知方法 |
| **連絡先** | 問い合わせメールアドレス |

##### プライバシーポリシーの公開場所

- 自社ウェブサイト（`https://yourdomain.com/privacy`）に公開する
- App Store Connect と Google Play Console の両方にこの URL を設定する

#### 2-7-15. 利用規約の作成ポイント

| セクション | 内容 |
|-----------|------|
| **サービスの説明** | 30秒動画チャレンジプラットフォームの概要 |
| **アカウント** | 登録条件、アカウント管理責任 |
| **コンテンツルール** | 投稿禁止コンテンツ（暴力、性的、違法コンテンツ等） |
| **知的財産権** | ユーザー投稿コンテンツの権利帰属 |
| **アプリ内課金** | 購入ポリシー、返金ポリシー |
| **免責事項** | サービス中断、データ損失に関する免責 |
| **アカウント停止・削除** | 違反時のアカウント停止条件 |
| **紛争解決** | 準拠法、管轄裁判所 |
| **変更** | 規約変更時の通知方法と効力発生日 |

> **ヒント**: プライバシーポリシー・利用規約のテンプレートは [TermsFeed](https://www.termsfeed.com/) や [Kiyaku](https://kiyaku.jp/) などのサービスで生成できます。ただし、内容は必ず自身で確認・カスタマイズしてください。

---

## チェックリスト（デプロイ前最終確認）

### アカウント・サービス

- [ ] Google Cloud Console プロジェクト作成済み
- [ ] OAuth 2.0 クライアントID 作成済み（iOS / Android / Web）
- [ ] Apple Developer Program 登録済み
- [ ] App ID / Service ID / Key 作成済み
- [ ] AdMob アカウント作成・広告ユニットID 取得済み
- [ ] Firebase プロジェクト作成・FCM 有効化済み
- [ ] Cloudflare R2 ストレージ設定済み

### 設定ファイル

- [ ] `GoogleService-Info.plist` を `ios/Runner/` に配置済み
- [ ] `google-services.json` を `android/app/` に配置済み
- [ ] `Info.plist` の `GADApplicationIdentifier` を本番IDに更新済み
- [ ] `Info.plist` の `CFBundleURLSchemes` を REVERSED_CLIENT_ID に更新済み
- [ ] `AndroidManifest.xml` に AdMob App ID を設定済み
- [ ] `ad_constants.dart` の本番広告ユニットIDを設定済み
- [ ] `serviceAccountKey.json` をサーバーに配置済み
- [ ] `.env` の全項目を本番値で設定済み

### サーバー

- [ ] Xserver VPS 契約・SSH 接続設定済み
- [ ] Docker / Docker Compose インストール済み
- [ ] ドメイン DNS 設定済み
- [ ] SSL 証明書取得済み（Let's Encrypt）
- [ ] Nginx 設定済み
- [ ] `docker compose up -d --build` で起動成功
- [ ] マイグレーション＆シード実行済み
- [ ] ヘルスチェック（`/api/health`）正常応答確認
- [ ] ファイアウォール設定済み
- [ ] DB バックアップ cron 設定済み
- [ ] SSL 自動更新確認済み

### セキュリティ

- [ ] `NODE_ENV=production` 設定済み
- [ ] JWT シークレットは 64 バイト以上のランダム文字列
- [ ] PostgreSQL / Redis のパスワードは強力かつ一意
- [ ] `RATE_LIMIT_DISABLED=false`
- [ ] 外部から 3000 / 5432 / 6379 ポートにアクセスできないことを確認
- [ ] HTTPS が強制されていることを確認
- [ ] `serviceAccountKey.json` が Git にコミットされていないことを確認
- [ ] `key.properties` / `.jks` が Git にコミットされていないことを確認

### ストア申請

- [ ] プライバシーポリシー URL 公開済み
- [ ] 利用規約 URL 公開済み
- [ ] App Store Connect にアプリ作成・情報入力済み
- [ ] Google Play Console にアプリ作成・情報入力済み
- [ ] スクリーンショット準備済み
- [ ] iOS: `flutter build ipa` でビルド・アップロード完了
- [ ] Android: `flutter build appbundle` でビルド・アップロード完了
