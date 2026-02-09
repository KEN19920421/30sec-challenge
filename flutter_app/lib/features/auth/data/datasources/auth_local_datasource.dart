import 'dart:convert';

import '../../../../core/constants/app_constants.dart';
import '../../../../core/services/auth_storage_service.dart';
import '../../../../core/services/storage_service.dart';
import '../../domain/entities/auth_tokens.dart';
import '../models/user_model.dart';

/// Manages local persistence of auth tokens and cached user data.
///
/// Tokens are stored in [AuthStorageService] (flutter_secure_storage).
/// The user profile is stored in [StorageService] (SharedPreferences)
/// for quick access on app startup.
class AuthLocalDataSource {
  final AuthStorageService _authStorage;
  final StorageService _storage;

  static const String _keyUserData = 'cached_user';

  const AuthLocalDataSource({
    required AuthStorageService authStorage,
    required StorageService storage,
  })  : _authStorage = authStorage,
        _storage = storage;

  // ---------------------------------------------------------------------------
  // Tokens
  // ---------------------------------------------------------------------------

  /// Persist both tokens to secure storage.
  Future<void> saveTokens(AuthTokens tokens) {
    return _authStorage.saveTokens(
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    );
  }

  /// Retrieve the stored tokens, or `null` if none are saved.
  Future<AuthTokens?> getTokens() async {
    final accessToken = await _authStorage.getAccessToken();
    final refreshToken = await _authStorage.getRefreshToken();

    if (accessToken == null || accessToken.isEmpty) return null;

    return AuthTokens(
      accessToken: accessToken,
      refreshToken: refreshToken ?? '',
    );
  }

  /// Delete both tokens from secure storage.
  Future<void> clearTokens() => _authStorage.clearTokens();

  /// Quick check for stored access token existence.
  Future<bool> hasTokens() => _authStorage.isLoggedIn();

  // ---------------------------------------------------------------------------
  // User cache
  // ---------------------------------------------------------------------------

  /// Cache the user profile to SharedPreferences as JSON.
  Future<void> saveUser(UserModel user) async {
    final json = jsonEncode(user.toJson());
    await _storage.setString(_keyUserData, json);
  }

  /// Read the cached user, or `null` if not present.
  UserModel? getUser() {
    final raw = _storage.getString(_keyUserData);
    if (raw == null || raw.isEmpty) return null;
    try {
      final map = jsonDecode(raw) as Map<String, dynamic>;
      return UserModel.fromJson(map);
    } catch (_) {
      return null;
    }
  }

  /// Remove the cached user profile.
  Future<void> clearUser() async {
    await _storage.remove(_keyUserData);
  }

  // ---------------------------------------------------------------------------
  // Onboarding
  // ---------------------------------------------------------------------------

  /// Whether the user has completed onboarding.
  bool isOnboardingCompleted() {
    return _storage.getBool(AppConstants.keyOnboardingCompleted) ?? false;
  }

  /// Mark onboarding as completed.
  Future<void> setOnboardingCompleted() {
    return _storage.setBool(AppConstants.keyOnboardingCompleted, true);
  }

  // ---------------------------------------------------------------------------
  // Full clear
  // ---------------------------------------------------------------------------

  /// Wipe all auth-related local data (tokens + cached user).
  Future<void> clearAll() async {
    await Future.wait([
      clearTokens(),
      clearUser(),
    ]);
  }
}
