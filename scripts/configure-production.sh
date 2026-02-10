#!/usr/bin/env bash
# =============================================================================
# 30sec Challenge — Production Configuration Script
# =============================================================================
# Interactive script that collects production credentials and generates/updates
# configuration files for the 30sec video challenge app.
#
# Files affected:
#   - backend/.env                (generated from scratch)
#   - flutter_app/lib/core/constants/ad_constants.dart  (AdMob IDs updated)
#   - flutter_app/ios/Runner/Info.plist                 (Google reversed client ID + AdMob App ID)
#   - flutter_app/android/app/src/main/AndroidManifest.xml  (AdMob App ID meta-data)
#   - deploy/nginx.conf                                 (API domain replaced)
# =============================================================================

set -euo pipefail

# ---------------------------------------------------------------------------
# Resolve paths relative to this script's location
# ---------------------------------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

BACKEND_DIR="${PROJECT_ROOT}/backend"
FLUTTER_DIR="${PROJECT_ROOT}/flutter_app"
DEPLOY_DIR="${PROJECT_ROOT}/deploy"

BACKEND_ENV="${BACKEND_DIR}/.env"
AD_CONSTANTS="${FLUTTER_DIR}/lib/core/constants/ad_constants.dart"
INFO_PLIST="${FLUTTER_DIR}/ios/Runner/Info.plist"
ANDROID_MANIFEST="${FLUTTER_DIR}/android/app/src/main/AndroidManifest.xml"
NGINX_CONF="${DEPLOY_DIR}/nginx.conf"

# ---------------------------------------------------------------------------
# Color helpers
# ---------------------------------------------------------------------------
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

info()    { echo -e "${GREEN}[OK]${NC} $1"; }
warn()    { echo -e "${YELLOW}[!]${NC} $1"; }
error()   { echo -e "${RED}[ERROR]${NC} $1"; }
prompt()  { echo -en "${YELLOW}▶${NC} $1: "; }
header()  { echo -e "\n${CYAN}${BOLD}═══ $1 ═══${NC}\n"; }
divider() { echo -e "${CYAN}───────────────────────────────────────────────────${NC}"; }

# ---------------------------------------------------------------------------
# Validation helpers
# ---------------------------------------------------------------------------

# Validate that a string is non-empty
validate_required() {
  local value="$1"
  local field_name="$2"
  if [[ -z "${value}" ]]; then
    error "${field_name} は必須です。空にできません。"
    return 1
  fi
  return 0
}

# Validate AdMob App ID format: ca-app-pub-XXXXXXXXXXXXXXXX~XXXXXXXXXX
validate_admob_app_id() {
  local value="$1"
  if [[ ! "${value}" =~ ^ca-app-pub-[0-9]+~[0-9]+$ ]]; then
    error "AdMob App ID の形式が不正です。形式: ca-app-pub-XXXXXXXXXXXXXXXX~XXXXXXXXXX"
    return 1
  fi
  return 0
}

# Validate AdMob Unit ID format: ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX
validate_admob_unit_id() {
  local value="$1"
  if [[ ! "${value}" =~ ^ca-app-pub-[0-9]+/[0-9]+$ ]]; then
    error "AdMob Unit ID の形式が不正です。形式: ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX"
    return 1
  fi
  return 0
}

# Validate Apple Team ID: exactly 10 alphanumeric characters
validate_team_id() {
  local value="$1"
  if [[ ! "${value}" =~ ^[A-Z0-9]{10}$ ]]; then
    error "Apple Team ID は英数字10文字です。例: ABC1234DEF"
    return 1
  fi
  return 0
}

# Validate URL format (basic check)
validate_url() {
  local value="$1"
  if [[ ! "${value}" =~ ^https?:// ]]; then
    error "有効なURLを入力してください（http:// または https:// で始まる必要があります）"
    return 1
  fi
  return 0
}

# Validate domain format (no protocol prefix)
validate_domain() {
  local value="$1"
  if [[ "${value}" =~ ^https?:// ]]; then
    error "ドメイン名のみを入力してください（http:// / https:// は不要です）"
    return 1
  fi
  if [[ ! "${value}" =~ ^[a-zA-Z0-9]([a-zA-Z0-9.-]*[a-zA-Z0-9])?$ ]]; then
    error "有効なドメイン名を入力してください。例: api.example.com"
    return 1
  fi
  return 0
}

# ---------------------------------------------------------------------------
# Input helpers
# ---------------------------------------------------------------------------

# Prompt for input with validation. Retries until valid.
# Usage: ask_input VARNAME "prompt text" "validator_function" ["default_value"]
ask_input() {
  local -n ref=$1
  local prompt_text="$2"
  local validator="${3:-}"
  local default_val="${4:-}"

  while true; do
    if [[ -n "${default_val}" ]]; then
      prompt "${prompt_text} [デフォルト: ${default_val}]"
    else
      prompt "${prompt_text}"
    fi
    read -r ref

    # Use default if empty and default exists
    if [[ -z "${ref}" && -n "${default_val}" ]]; then
      ref="${default_val}"
    fi

    # Always check required
    if ! validate_required "${ref}" "${prompt_text}"; then
      continue
    fi

    # Run validator if provided
    if [[ -n "${validator}" ]]; then
      if ${validator} "${ref}"; then
        break
      fi
    else
      break
    fi
  done
}

# Prompt for a secret (password/key) with optional auto-generation
# Usage: ask_secret VARNAME "prompt text"
ask_secret() {
  local -n ref=$1
  local prompt_text="$2"

  echo -en "${YELLOW}▶${NC} ${prompt_text}\n"
  echo -e "  ${CYAN}1)${NC} 自動生成する（推奨）"
  echo -e "  ${CYAN}2)${NC} 手動で入力する"
  prompt "選択 [1/2]"
  read -r choice

  if [[ "${choice}" == "2" ]]; then
    while true; do
      prompt "値を入力してください"
      read -rs ref
      echo ""
      if validate_required "${ref}" "${prompt_text}"; then
        break
      fi
    done
  else
    ref="$(openssl rand -base64 48 | tr -d '/+=' | head -c 64)"
    info "自動生成しました: ${ref:0:8}...（${#ref}文字）"
  fi
}

# ---------------------------------------------------------------------------
# Backup helper
# ---------------------------------------------------------------------------
backup_file() {
  local filepath="$1"
  if [[ -f "${filepath}" ]]; then
    local backup="${filepath}.bak"
    cp "${filepath}" "${backup}"
    info "バックアップ作成: ${backup}"
  fi
}

# ---------------------------------------------------------------------------
# Main: collect all inputs
# ---------------------------------------------------------------------------
main() {
  echo ""
  echo -e "${BOLD}${CYAN}╔═══════════════════════════════════════════════════════════╗${NC}"
  echo -e "${BOLD}${CYAN}║       30sec Challenge — 本番環境設定スクリプト           ║${NC}"
  echo -e "${BOLD}${CYAN}╚═══════════════════════════════════════════════════════════╝${NC}"
  echo ""
  echo -e "このスクリプトは本番環境に必要な認証情報とIDを収集し、"
  echo -e "設定ファイルを自動生成・更新します。"
  echo ""
  echo -e "${YELLOW}プロジェクトルート:${NC} ${PROJECT_ROOT}"
  divider

  # ── Verify project structure exists ──
  local missing_files=()
  [[ ! -f "${AD_CONSTANTS}" ]]    && missing_files+=("${AD_CONSTANTS}")
  [[ ! -f "${INFO_PLIST}" ]]      && missing_files+=("${INFO_PLIST}")
  [[ ! -f "${ANDROID_MANIFEST}" ]] && missing_files+=("${ANDROID_MANIFEST}")
  [[ ! -f "${NGINX_CONF}" ]]      && missing_files+=("${NGINX_CONF}")

  if [[ ${#missing_files[@]} -gt 0 ]]; then
    error "以下のファイルが見つかりません:"
    for f in "${missing_files[@]}"; do
      echo -e "  ${RED}✗${NC} ${f}"
    done
    echo ""
    error "プロジェクトルートが正しいか確認してください: ${PROJECT_ROOT}"
    exit 1
  fi
  info "プロジェクト構造を確認しました。"

  # =====================================================================
  # Section 1: Google OAuth
  # =====================================================================
  header "Google OAuth 設定"

  ask_input GOOGLE_CLIENT_ID \
    "Google OAuth Client ID (Web)（例: 123456789-xxx.apps.googleusercontent.com）" \
    ""

  ask_input GOOGLE_REVERSED_CLIENT_ID \
    "Google Reversed Client ID（iOS用、例: com.googleusercontent.apps.123456789-xxx）" \
    ""

  # =====================================================================
  # Section 2: Apple Sign-In
  # =====================================================================
  header "Apple Sign-In 設定"

  ask_input APPLE_TEAM_ID \
    "Apple Team ID（10文字の英数字）" \
    "validate_team_id"

  ask_input APPLE_KEY_ID \
    "Apple Key ID" \
    ""

  ask_input APPLE_CLIENT_ID \
    "Apple Client ID（Bundle ID / Service ID、例: com.yourcompany.app）" \
    ""

  # =====================================================================
  # Section 3: AdMob
  # =====================================================================
  header "AdMob 設定"

  echo -e "  ${CYAN}まず、AdMob App IDを入力してください。${NC}"
  echo ""

  ask_input ADMOB_APP_ID_IOS \
    "AdMob App ID (iOS)（形式: ca-app-pub-XXXX~XXXX）" \
    "validate_admob_app_id"

  ask_input ADMOB_APP_ID_ANDROID \
    "AdMob App ID (Android)（形式: ca-app-pub-XXXX~XXXX）" \
    "validate_admob_app_id"

  echo ""
  echo -e "  ${CYAN}次に、各広告ユニットIDを入力してください。${NC}"
  echo -e "  ${CYAN}形式: ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX${NC}"
  echo ""

  # iOS Ad Unit IDs
  echo -e "  ${BOLD}── iOS 広告ユニットID ──${NC}"
  ask_input ADMOB_BANNER_IOS \
    "Banner (iOS)" \
    "validate_admob_unit_id"
  ask_input ADMOB_INTERSTITIAL_IOS \
    "Interstitial (iOS)" \
    "validate_admob_unit_id"
  ask_input ADMOB_REWARDED_IOS \
    "Rewarded (iOS)" \
    "validate_admob_unit_id"
  ask_input ADMOB_NATIVE_IOS \
    "Native (iOS)" \
    "validate_admob_unit_id"

  echo ""

  # Android Ad Unit IDs
  echo -e "  ${BOLD}── Android 広告ユニットID ──${NC}"
  ask_input ADMOB_BANNER_ANDROID \
    "Banner (Android)" \
    "validate_admob_unit_id"
  ask_input ADMOB_INTERSTITIAL_ANDROID \
    "Interstitial (Android)" \
    "validate_admob_unit_id"
  ask_input ADMOB_REWARDED_ANDROID \
    "Rewarded (Android)" \
    "validate_admob_unit_id"
  ask_input ADMOB_NATIVE_ANDROID \
    "Native (Android)" \
    "validate_admob_unit_id"

  # =====================================================================
  # Section 4: Firebase
  # =====================================================================
  header "Firebase 設定"

  ask_input FCM_PROJECT_ID \
    "Firebase Project ID（FCM用）" \
    ""

  # =====================================================================
  # Section 5: S3 / Object Storage
  # =====================================================================
  header "S3 / オブジェクトストレージ設定"

  ask_input S3_ENDPOINT \
    "S3 Endpoint URL（例: https://s3.amazonaws.com）" \
    "validate_url"

  ask_input S3_REGION \
    "S3 Region（例: ap-northeast-1）" \
    "" \
    "ap-northeast-1"

  ask_input S3_BUCKET \
    "S3 Bucket名" \
    ""

  ask_input S3_ACCESS_KEY \
    "S3 Access Key" \
    ""

  echo -en "${YELLOW}▶${NC} S3 Secret Key: "
  read -rs S3_SECRET_KEY
  echo ""
  if [[ -z "${S3_SECRET_KEY}" ]]; then
    error "S3 Secret Key は必須です。"
    exit 1
  fi
  info "S3 Secret Key を受け取りました。"

  ask_input CDN_BASE_URL \
    "CDN Base URL（例: https://cdn.example.com）" \
    "validate_url"

  # =====================================================================
  # Section 6: API / Network
  # =====================================================================
  header "API / ネットワーク設定"

  ask_input API_DOMAIN \
    "APIドメイン（例: api.example.com）" \
    "validate_domain"

  ask_input CORS_ORIGIN \
    "CORS Origin（例: https://example.com）" \
    "validate_url"

  # =====================================================================
  # Section 7: Secrets (auto-generate option)
  # =====================================================================
  header "パスワード・シークレット設定"

  ask_secret POSTGRES_PASSWORD "PostgreSQL パスワード"
  ask_secret REDIS_PASSWORD "Redis パスワード"
  ask_secret JWT_SECRET "JWT Secret"
  ask_secret JWT_REFRESH_SECRET "JWT Refresh Secret"

  # Fixed DB settings
  POSTGRES_USER="app_user"
  POSTGRES_DB="video_challenge"

  # =====================================================================
  # Confirmation
  # =====================================================================
  header "設定内容の確認"

  echo -e "${BOLD}Google OAuth:${NC}"
  echo -e "  Client ID:          ${GOOGLE_CLIENT_ID}"
  echo -e "  Reversed Client ID: ${GOOGLE_REVERSED_CLIENT_ID}"
  divider

  echo -e "${BOLD}Apple Sign-In:${NC}"
  echo -e "  Team ID:    ${APPLE_TEAM_ID}"
  echo -e "  Key ID:     ${APPLE_KEY_ID}"
  echo -e "  Client ID:  ${APPLE_CLIENT_ID}"
  divider

  echo -e "${BOLD}AdMob:${NC}"
  echo -e "  App ID (iOS):     ${ADMOB_APP_ID_IOS}"
  echo -e "  App ID (Android): ${ADMOB_APP_ID_ANDROID}"
  echo -e "  Banner (iOS):         ${ADMOB_BANNER_IOS}"
  echo -e "  Interstitial (iOS):   ${ADMOB_INTERSTITIAL_IOS}"
  echo -e "  Rewarded (iOS):       ${ADMOB_REWARDED_IOS}"
  echo -e "  Native (iOS):         ${ADMOB_NATIVE_IOS}"
  echo -e "  Banner (Android):         ${ADMOB_BANNER_ANDROID}"
  echo -e "  Interstitial (Android):   ${ADMOB_INTERSTITIAL_ANDROID}"
  echo -e "  Rewarded (Android):       ${ADMOB_REWARDED_ANDROID}"
  echo -e "  Native (Android):         ${ADMOB_NATIVE_ANDROID}"
  divider

  echo -e "${BOLD}Firebase:${NC}"
  echo -e "  Project ID: ${FCM_PROJECT_ID}"
  divider

  echo -e "${BOLD}S3:${NC}"
  echo -e "  Endpoint:   ${S3_ENDPOINT}"
  echo -e "  Region:     ${S3_REGION}"
  echo -e "  Bucket:     ${S3_BUCKET}"
  echo -e "  Access Key: ${S3_ACCESS_KEY}"
  echo -e "  Secret Key: ********"
  echo -e "  CDN URL:    ${CDN_BASE_URL}"
  divider

  echo -e "${BOLD}API:${NC}"
  echo -e "  Domain:      ${API_DOMAIN}"
  echo -e "  CORS Origin: ${CORS_ORIGIN}"
  divider

  echo -e "${BOLD}Database / Cache:${NC}"
  echo -e "  PostgreSQL User: ${POSTGRES_USER}"
  echo -e "  PostgreSQL DB:   ${POSTGRES_DB}"
  echo -e "  PostgreSQL Pass: ********"
  echo -e "  Redis Pass:      ********"
  divider

  echo -e "${BOLD}JWT:${NC}"
  echo -e "  Secret:         ${JWT_SECRET:0:8}..."
  echo -e "  Refresh Secret: ${JWT_REFRESH_SECRET:0:8}..."
  divider

  echo ""
  echo -e "${BOLD}以下のファイルが作成・更新されます:${NC}"
  echo -e "  1. ${BACKEND_ENV}"
  echo -e "  2. ${AD_CONSTANTS}"
  echo -e "  3. ${INFO_PLIST}"
  echo -e "  4. ${ANDROID_MANIFEST}"
  echo -e "  5. ${NGINX_CONF}"
  echo ""

  prompt "上記の内容でファイルを生成・更新しますか？ [y/N]"
  read -r confirm
  if [[ "${confirm}" != "y" && "${confirm}" != "Y" ]]; then
    warn "キャンセルしました。変更は行われていません。"
    exit 0
  fi

  echo ""

  # =====================================================================
  # Generate files
  # =====================================================================

  # Track changes for summary
  declare -a changes=()

  # ── 1. Backend .env ──
  generate_backend_env
  changes+=("backend/.env — 本番環境設定ファイルを生成しました")

  # ── 2. ad_constants.dart ──
  update_ad_constants
  changes+=("flutter_app/lib/core/constants/ad_constants.dart — AdMob IDを更新しました")

  # ── 3. Info.plist ──
  update_info_plist
  changes+=("flutter_app/ios/Runner/Info.plist — Google Reversed Client ID と AdMob App ID を更新しました")

  # ── 4. AndroidManifest.xml ──
  update_android_manifest
  changes+=("flutter_app/android/app/src/main/AndroidManifest.xml — AdMob App ID meta-data を追加しました")

  # ── 5. nginx.conf ──
  update_nginx_conf
  changes+=("deploy/nginx.conf — APIドメインを ${API_DOMAIN} に更新しました")

  # =====================================================================
  # Summary
  # =====================================================================
  header "完了サマリー"

  for change in "${changes[@]}"; do
    echo -e "  ${GREEN}✔${NC} ${change}"
  done

  echo ""
  echo -e "${GREEN}${BOLD}本番環境の設定が完了しました！${NC}"
  echo ""
  echo -e "${YELLOW}次のステップ:${NC}"
  echo -e "  1. 生成されたファイルの内容を確認してください"
  echo -e "  2. backend/.env を .gitignore に追加されていることを確認してください"
  echo -e "  3. Apple Sign-In の .p8 キーファイルを適切な場所に配置してください"
  echo -e "  4. Firebase の google-services.json / GoogleService-Info.plist を配置してください"
  echo -e "  5. SSL証明書を設定してください: sudo certbot --nginx -d ${API_DOMAIN}"
  echo ""
}

# ---------------------------------------------------------------------------
# File generation functions
# ---------------------------------------------------------------------------

generate_backend_env() {
  backup_file "${BACKEND_ENV}"

  cat > "${BACKEND_ENV}" << ENVEOF
# ─── Application ───────────────────────────────────────────
NODE_ENV=production
PORT=3000

# ─── Database (PostgreSQL) ─────────────────────────────────
# Format: postgresql://user:password@host:port/dbname
DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}

# ─── Redis ─────────────────────────────────────────────────
REDIS_URL=redis://:${REDIS_PASSWORD}@redis:6379

# ─── JWT Authentication ───────────────────────────────────
JWT_SECRET=${JWT_SECRET}
JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# ─── S3 / Object Storage ─────────────────────────────────
S3_ENDPOINT=${S3_ENDPOINT}
S3_REGION=${S3_REGION}
S3_BUCKET=${S3_BUCKET}
S3_ACCESS_KEY=${S3_ACCESS_KEY}
S3_SECRET_KEY=${S3_SECRET_KEY}

# ─── CDN ───────────────────────────────────────────────────
CDN_BASE_URL=${CDN_BASE_URL}

# ─── Google OAuth ──────────────────────────────────────────
GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID}

# ─── Apple Sign-In ─────────────────────────────────────────
APPLE_CLIENT_ID=${APPLE_CLIENT_ID}
APPLE_TEAM_ID=${APPLE_TEAM_ID}
APPLE_KEY_ID=${APPLE_KEY_ID}

# ─── Firebase Cloud Messaging ─────────────────────────────
FCM_PROJECT_ID=${FCM_PROJECT_ID}

# ─── CORS ──────────────────────────────────────────────────
CORS_ORIGIN=${CORS_ORIGIN}

# ─── Logging ──────────────────────────────────────────────
LOG_LEVEL=info

# ─── Rate Limiting ────────────────────────────────────────
RATE_LIMIT_DISABLED=false

# ─── Docker Compose Vars ──────────────────────────────────
POSTGRES_USER=${POSTGRES_USER}
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
POSTGRES_DB=${POSTGRES_DB}
REDIS_PASSWORD=${REDIS_PASSWORD}
ENVEOF

  info "backend/.env を生成しました"
}

update_ad_constants() {
  backup_file "${AD_CONSTANTS}"

  # Replace each production ad unit ID placeholder individually using sed.
  # The file has unique variable names per line, so we match on the variable name.

  sed -i.tmp \
    -e "s|static const _prodBannerAndroid = '.*';|static const _prodBannerAndroid = '${ADMOB_BANNER_ANDROID}';|" \
    -e "s|static const _prodInterstitialAndroid = '.*';|static const _prodInterstitialAndroid = '${ADMOB_INTERSTITIAL_ANDROID}';|" \
    -e "s|static const _prodRewardedAndroid = '.*';|static const _prodRewardedAndroid = '${ADMOB_REWARDED_ANDROID}';|" \
    -e "s|static const _prodNativeAndroid = '.*';|static const _prodNativeAndroid = '${ADMOB_NATIVE_ANDROID}';|" \
    -e "s|static const _prodBannerIos = '.*';|static const _prodBannerIos = '${ADMOB_BANNER_IOS}';|" \
    -e "s|static const _prodInterstitialIos = '.*';|static const _prodInterstitialIos = '${ADMOB_INTERSTITIAL_IOS}';|" \
    -e "s|static const _prodRewardedIos = '.*';|static const _prodRewardedIos = '${ADMOB_REWARDED_IOS}';|" \
    -e "s|static const _prodNativeIos = '.*';|static const _prodNativeIos = '${ADMOB_NATIVE_IOS}';|" \
    "${AD_CONSTANTS}"

  # Clean up temp file created by sed -i on macOS
  rm -f "${AD_CONSTANTS}.tmp"

  info "ad_constants.dart の AdMob IDを更新しました"
}

update_info_plist() {
  backup_file "${INFO_PLIST}"

  # Replace the Google Sign-In reversed client ID URL scheme
  sed -i.tmp \
    -e "s|com.googleusercontent.apps.YOUR_REVERSED_CLIENT_ID|${GOOGLE_REVERSED_CLIENT_ID}|g" \
    "${INFO_PLIST}"

  # Replace the test AdMob App ID with the production iOS AdMob App ID
  sed -i.tmp \
    -e "s|ca-app-pub-3940256099942544~1458002511|${ADMOB_APP_ID_IOS}|g" \
    "${INFO_PLIST}"

  # Clean up temp files
  rm -f "${INFO_PLIST}.tmp"

  info "Info.plist を更新しました（Google Reversed Client ID + AdMob App ID）"
}

update_android_manifest() {
  backup_file "${ANDROID_MANIFEST}"

  # Check if AdMob meta-data already exists
  if grep -q "com.google.android.gms.ads.APPLICATION_ID" "${ANDROID_MANIFEST}"; then
    # Update existing value
    sed -i.tmp \
      -e "s|<meta-data[[:space:]]*android:name=\"com.google.android.gms.ads.APPLICATION_ID\"[[:space:]]*android:value=\"[^\"]*\"|<meta-data android:name=\"com.google.android.gms.ads.APPLICATION_ID\" android:value=\"${ADMOB_APP_ID_ANDROID}\"|" \
      "${ANDROID_MANIFEST}"
    rm -f "${ANDROID_MANIFEST}.tmp"
    info "AndroidManifest.xml の AdMob App ID を更新しました"
  else
    # Insert AdMob meta-data before the closing </application> tag.
    # We use sed to insert lines before </application>.
    sed -i.tmp \
      -e "s|</application>|        <!-- AdMob App ID for production ads -->\n        <meta-data\n            android:name=\"com.google.android.gms.ads.APPLICATION_ID\"\n            android:value=\"${ADMOB_APP_ID_ANDROID}\"/>\n    </application>|" \
      "${ANDROID_MANIFEST}"
    rm -f "${ANDROID_MANIFEST}.tmp"
    info "AndroidManifest.xml に AdMob App ID meta-data を追加しました"
  fi
}

update_nginx_conf() {
  backup_file "${NGINX_CONF}"

  # Replace all occurrences of api.yourdomain.com with the actual domain
  sed -i.tmp \
    -e "s|api.yourdomain.com|${API_DOMAIN}|g" \
    "${NGINX_CONF}"

  # Clean up temp file
  rm -f "${NGINX_CONF}.tmp"

  info "nginx.conf のドメインを ${API_DOMAIN} に更新しました"
}

# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------
main "$@"
