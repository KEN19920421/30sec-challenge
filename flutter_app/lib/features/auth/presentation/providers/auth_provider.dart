import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_sign_in/google_sign_in.dart';
import 'package:sign_in_with_apple/sign_in_with_apple.dart';

import '../../../../core/network/api_client.dart';
import '../../../../core/services/storage_service.dart';
import '../../data/datasources/auth_local_datasource.dart';
import '../../data/datasources/auth_remote_datasource.dart';
import '../../data/repositories/auth_repository_impl.dart';
import '../../domain/entities/user.dart';
import '../../domain/repositories/auth_repository.dart';
import '../../domain/usecases/logout_usecase.dart';
import '../../domain/usecases/social_login_usecase.dart';

// =============================================================================
// Auth State
// =============================================================================

/// The possible states of the authentication lifecycle.
enum AuthStatus { initial, loading, authenticated, unauthenticated, error }

/// Immutable snapshot of the current authentication state.
class AuthState {
  final AuthStatus status;
  final User? user;
  final String? errorMessage;

  const AuthState({
    this.status = AuthStatus.initial,
    this.user,
    this.errorMessage,
  });

  const AuthState.initial() : this(status: AuthStatus.initial);

  const AuthState.loading() : this(status: AuthStatus.loading);

  AuthState.authenticated(User user)
      : this(status: AuthStatus.authenticated, user: user);

  const AuthState.unauthenticated() : this(status: AuthStatus.unauthenticated);

  AuthState.error(String message)
      : this(status: AuthStatus.error, errorMessage: message);

  bool get isLoading => status == AuthStatus.loading;
  bool get isAuthenticated => status == AuthStatus.authenticated;

  AuthState copyWith({
    AuthStatus? status,
    User? user,
    String? errorMessage,
  }) {
    return AuthState(
      status: status ?? this.status,
      user: user ?? this.user,
      errorMessage: errorMessage ?? this.errorMessage,
    );
  }

  @override
  String toString() => 'AuthState(status: $status, user: ${user?.id})';
}

// =============================================================================
// Dependency providers
// =============================================================================

/// Provides the [AuthRemoteDataSource].
final authRemoteDataSourceProvider = Provider<AuthRemoteDataSource>((ref) {
  final client = ref.watch(apiClientProvider);
  return AuthRemoteDataSource(client);
});

/// Provides the [AuthLocalDataSource].
final authLocalDataSourceProvider = Provider<AuthLocalDataSource>((ref) {
  final authStorage = ref.watch(authStorageServiceProvider);
  final storage = ref.watch(storageServiceProvider);
  return AuthLocalDataSource(authStorage: authStorage, storage: storage);
});

/// Provides the [AuthRepository] implementation.
final authRepositoryProvider = Provider<AuthRepository>((ref) {
  final remote = ref.watch(authRemoteDataSourceProvider);
  final local = ref.watch(authLocalDataSourceProvider);
  return AuthRepositoryImpl(remote: remote, local: local);
});

/// Provides the [SocialLoginUseCase].
final socialLoginUseCaseProvider = Provider<SocialLoginUseCase>((ref) {
  return SocialLoginUseCase(ref.watch(authRepositoryProvider));
});

/// Provides the [LogoutUseCase].
final logoutUseCaseProvider = Provider<LogoutUseCase>((ref) {
  return LogoutUseCase(ref.watch(authRepositoryProvider));
});

// =============================================================================
// Auth Notifier
// =============================================================================

/// Controls the authentication state for the entire app.
///
/// On creation it calls [checkAuthStatus] to restore a previous session
/// from local storage.
class AuthNotifier extends StateNotifier<AuthState> {
  final SocialLoginUseCase _socialLogin;
  final LogoutUseCase _logout;
  final AuthRepository _repository;
  final AuthLocalDataSource _local;

  AuthNotifier({
    required SocialLoginUseCase socialLogin,
    required LogoutUseCase logout,
    required AuthRepository repository,
    required AuthLocalDataSource local,
  })  : _socialLogin = socialLogin,
        _logout = logout,
        _repository = repository,
        _local = local,
        super(const AuthState.initial()) {
    checkAuthStatus();
  }

  // ---------------------------------------------------------------------------
  // Session restoration
  // ---------------------------------------------------------------------------

  /// Check for stored tokens and attempt to fetch the current user.
  ///
  /// Called automatically on construction and can also be invoked manually
  /// (for example when the app resumes from background).
  Future<void> checkAuthStatus() async {
    try {
      final hasTokens = await _local.hasTokens();
      if (!hasTokens) {
        state = const AuthState.unauthenticated();
        return;
      }

      // Optimistically show the cached user while validating the token.
      final cachedUser = _local.getUser();
      if (cachedUser != null) {
        state = AuthState.authenticated(cachedUser);
      }

      // Validate the session against the server.
      final user = await _repository.getCurrentUser();
      state = AuthState.authenticated(user);
    } catch (_) {
      // Token may be invalid or network unreachable.
      // If we already set a cached user above, keep it.
      if (state.user != null) return;
      state = const AuthState.unauthenticated();
    }
  }

  // ---------------------------------------------------------------------------
  // Social auth
  // ---------------------------------------------------------------------------

  /// Initiate Google Sign-In flow and authenticate with the backend.
  Future<void> signInWithGoogle() async {
    state = const AuthState.loading();
    try {
      final googleUser = await GoogleSignIn(scopes: ['email']).signIn();
      if (googleUser == null) {
        // User cancelled the dialog.
        state = const AuthState.unauthenticated();
        return;
      }

      final googleAuth = await googleUser.authentication;
      final idToken = googleAuth.idToken;
      if (idToken == null) {
        state = AuthState.error('Failed to obtain Google ID token.');
        return;
      }

      final (user, _) =
          await _socialLogin(provider: 'google', idToken: idToken);
      state = AuthState.authenticated(user);
    } catch (e) {
      state = AuthState.error(_messageFromError(e));
    }
  }

  /// Initiate Apple Sign-In flow and authenticate with the backend.
  Future<void> signInWithApple() async {
    state = const AuthState.loading();
    try {
      final credential = await SignInWithApple.getAppleIDCredential(
        scopes: [
          AppleIDAuthorizationScopes.email,
          AppleIDAuthorizationScopes.fullName,
        ],
      );

      final idToken = credential.identityToken;
      if (idToken == null) {
        state = AuthState.error('Failed to obtain Apple ID token.');
        return;
      }

      final (user, _) =
          await _socialLogin(provider: 'apple', idToken: idToken);
      state = AuthState.authenticated(user);
    } catch (e) {
      state = AuthState.error(_messageFromError(e));
    }
  }

  // ---------------------------------------------------------------------------
  // Logout
  // ---------------------------------------------------------------------------

  /// Sign the user out and clear all local auth data.
  Future<void> logout() async {
    state = const AuthState.loading();
    try {
      await _logout();
    } catch (_) {
      // Even on failure we transition to unauthenticated.
    }
    state = const AuthState.unauthenticated();
  }

  // ---------------------------------------------------------------------------
  // Account deletion
  // ---------------------------------------------------------------------------

  /// Delete the current user's account. Returns `true` on success.
  Future<bool> deleteAccount() async {
    try {
      await _repository.deleteAccount();
      state = const AuthState.unauthenticated();
      return true;
    } catch (_) {
      return false;
    }
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  String _messageFromError(Object error) {
    if (error is Exception) {
      final msg = error.toString();
      // Strip the "Exception: " prefix added by Dart.
      if (msg.startsWith('Exception: ')) return msg.substring(11);
      return msg;
    }
    return 'An unexpected error occurred. Please try again.';
  }
}

// =============================================================================
// Public Riverpod providers
// =============================================================================

/// The main authentication provider used throughout the app.
final authProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  return AuthNotifier(
    socialLogin: ref.watch(socialLoginUseCaseProvider),
    logout: ref.watch(logoutUseCaseProvider),
    repository: ref.watch(authRepositoryProvider),
    local: ref.watch(authLocalDataSourceProvider),
  );
});

/// Convenience provider that exposes only the current [User] (or null).
final currentUserProvider = Provider<User?>((ref) {
  return ref.watch(authProvider).user;
});

/// Convenience boolean indicating whether the user is logged in.
final isLoggedInProvider = Provider<bool>((ref) {
  return ref.watch(authProvider).isAuthenticated;
});
