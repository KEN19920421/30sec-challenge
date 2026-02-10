import '../entities/auth_tokens.dart';
import '../entities/user.dart';

/// Abstract contract for authentication operations.
///
/// The data layer provides [AuthRepositoryImpl] which coordinates between
/// the remote API and local secure storage.
abstract class AuthRepository {
  /// Authenticate via a social identity provider (Google, Apple).
  ///
  /// [provider] should be `"google"` or `"apple"`.
  /// [idToken] is the identity token obtained from the social SDK.
  Future<(User, AuthTokens)> socialLogin({
    required String provider,
    required String idToken,
  });

  /// Exchange a refresh token for a fresh token pair.
  Future<AuthTokens> refreshToken(String refreshToken);

  /// Fetch the currently authenticated user's profile from the server.
  Future<User> getCurrentUser();

  /// Sign out and invalidate tokens on both client and server.
  Future<void> logout();

  /// Soft-delete the current user's account.
  Future<void> deleteAccount();
}
