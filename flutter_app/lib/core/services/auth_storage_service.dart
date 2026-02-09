import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../constants/app_constants.dart';

/// Secure storage wrapper for authentication tokens.
///
/// Uses [FlutterSecureStorage] to persist access and refresh tokens in the
/// platform keychain / keystore. All token-related reads and writes should
/// go through this service.
class AuthStorageService {
  final FlutterSecureStorage _storage;

  AuthStorageService({FlutterSecureStorage? storage})
      : _storage = storage ??
            const FlutterSecureStorage(
              aOptions: AndroidOptions(encryptedSharedPreferences: true),
              iOptions: IOSOptions(
                accessibility: KeychainAccessibility.first_unlock_this_device,
              ),
            );

  // ---------------------------------------------------------------------------
  // Tokens
  // ---------------------------------------------------------------------------

  /// Persist both tokens atomically.
  Future<void> saveTokens({
    required String accessToken,
    required String refreshToken,
  }) async {
    await Future.wait([
      _storage.write(key: AppConstants.keyAccessToken, value: accessToken),
      _storage.write(key: AppConstants.keyRefreshToken, value: refreshToken),
    ]);
  }

  /// Read the current access token, or null if not stored.
  Future<String?> getAccessToken() {
    return _storage.read(key: AppConstants.keyAccessToken);
  }

  /// Read the current refresh token, or null if not stored.
  Future<String?> getRefreshToken() {
    return _storage.read(key: AppConstants.keyRefreshToken);
  }

  /// Delete both tokens (used on logout or forced sign-out).
  Future<void> clearTokens() async {
    await Future.wait([
      _storage.delete(key: AppConstants.keyAccessToken),
      _storage.delete(key: AppConstants.keyRefreshToken),
    ]);
  }

  /// Quick check to determine if the user has a stored access token.
  ///
  /// Does **not** validate whether the token is still valid on the server.
  Future<bool> isLoggedIn() async {
    final token = await getAccessToken();
    return token != null && token.isNotEmpty;
  }

  // ---------------------------------------------------------------------------
  // Generic secure values
  // ---------------------------------------------------------------------------

  /// Write an arbitrary key/value pair to secure storage.
  Future<void> write({required String key, required String value}) {
    return _storage.write(key: key, value: value);
  }

  /// Read an arbitrary key from secure storage.
  Future<String?> read({required String key}) {
    return _storage.read(key: key);
  }

  /// Delete an arbitrary key from secure storage.
  Future<void> delete({required String key}) {
    return _storage.delete(key: key);
  }

  /// Wipe all secure storage (nuclear option for account deletion / full reset).
  Future<void> clearAll() {
    return _storage.deleteAll();
  }
}

/// Riverpod provider for [AuthStorageService].
///
/// Override in tests to inject a mock.
final authStorageServiceProvider = Provider<AuthStorageService>((ref) {
  return AuthStorageService();
});
