import 'package:flutter_test/flutter_test.dart';
import 'package:mockito/annotations.dart';
import 'package:mockito/mockito.dart';

import 'package:thirty_sec_challenge/features/auth/data/datasources/auth_local_datasource.dart';
import 'package:thirty_sec_challenge/features/auth/domain/entities/user.dart';
import 'package:thirty_sec_challenge/features/auth/domain/entities/auth_tokens.dart';
import 'package:thirty_sec_challenge/features/auth/domain/repositories/auth_repository.dart';
import 'package:thirty_sec_challenge/features/auth/domain/usecases/login_usecase.dart';
import 'package:thirty_sec_challenge/features/auth/domain/usecases/logout_usecase.dart';
import 'package:thirty_sec_challenge/features/auth/domain/usecases/register_usecase.dart';
import 'package:thirty_sec_challenge/features/auth/domain/usecases/social_login_usecase.dart';
import 'package:thirty_sec_challenge/features/auth/presentation/providers/auth_provider.dart';

@GenerateMocks([
  AuthRepository,
  LoginUseCase,
  RegisterUseCase,
  SocialLoginUseCase,
  LogoutUseCase,
  AuthLocalDataSource,
])
import 'auth_provider_test.mocks.dart';

void main() {
  late MockAuthRepository mockRepository;
  late MockLoginUseCase mockLoginUseCase;
  late MockRegisterUseCase mockRegisterUseCase;
  late MockSocialLoginUseCase mockSocialLoginUseCase;
  late MockLogoutUseCase mockLogoutUseCase;
  late MockAuthLocalDataSource mockLocalDataSource;
  late AuthNotifier authNotifier;

  final testUser = User(
    id: 'user-123',
    username: 'testuser',
    email: 'test@example.com',
    displayName: 'Test User',
    createdAt: DateTime(2024, 1, 1),
  );

  final testTokens = AuthTokens(
    accessToken: 'access-token-123',
    refreshToken: 'refresh-token-123',
  );

  setUp(() {
    mockRepository = MockAuthRepository();
    mockLoginUseCase = MockLoginUseCase();
    mockRegisterUseCase = MockRegisterUseCase();
    mockSocialLoginUseCase = MockSocialLoginUseCase();
    mockLogoutUseCase = MockLogoutUseCase();
    mockLocalDataSource = MockAuthLocalDataSource();

    // Default stubs for the checkAuthStatus call in the constructor.
    when(mockLocalDataSource.hasTokens()).thenAnswer((_) async => false);
    when(mockLocalDataSource.getUser()).thenReturn(null);

    authNotifier = AuthNotifier(
      login: mockLoginUseCase,
      register: mockRegisterUseCase,
      socialLogin: mockSocialLoginUseCase,
      logout: mockLogoutUseCase,
      repository: mockRepository,
      local: mockLocalDataSource,
    );
  });

  group('AuthNotifier', () {
    // -------------------------------------------------------------------------
    // Initial state
    // -------------------------------------------------------------------------

    test('initial state transitions to unauthenticated when no tokens exist',
        () async {
      // The constructor calls checkAuthStatus(), which returns unauthenticated
      // because hasTokens returns false.
      await Future<void>.delayed(Duration.zero);
      expect(authNotifier.state.status, AuthStatus.unauthenticated);
      expect(authNotifier.state.user, isNull);
    });

    // -------------------------------------------------------------------------
    // Login
    // -------------------------------------------------------------------------

    test('login success transitions to authenticated with user', () async {
      when(mockLoginUseCase(email: 'test@example.com', password: 'password123'))
          .thenAnswer((_) async => (testUser, testTokens));

      await authNotifier.login(
        email: 'test@example.com',
        password: 'password123',
      );

      expect(authNotifier.state.status, AuthStatus.authenticated);
      expect(authNotifier.state.user, testUser);
      expect(authNotifier.state.user?.email, 'test@example.com');
      expect(authNotifier.state.errorMessage, isNull);
    });

    test('login failure transitions to error with message', () async {
      when(mockLoginUseCase(email: 'test@example.com', password: 'wrong'))
          .thenThrow(Exception('Invalid credentials'));

      await authNotifier.login(
        email: 'test@example.com',
        password: 'wrong',
      );

      expect(authNotifier.state.status, AuthStatus.error);
      expect(authNotifier.state.errorMessage, 'Invalid credentials');
      expect(authNotifier.state.user, isNull);
    });

    test('login sets loading state before completing', () async {
      final states = <AuthStatus>[];

      // Capture state transitions by using a delayed future.
      when(mockLoginUseCase(email: 'test@example.com', password: 'password123'))
          .thenAnswer((_) async {
        states.add(authNotifier.state.status);
        return (testUser, testTokens);
      });

      await authNotifier.login(
        email: 'test@example.com',
        password: 'password123',
      );

      // The state should have been loading when the use case was invoked.
      expect(states, contains(AuthStatus.loading));
      // Final state should be authenticated.
      expect(authNotifier.state.status, AuthStatus.authenticated);
    });

    // -------------------------------------------------------------------------
    // Logout
    // -------------------------------------------------------------------------

    test('logout transitions to unauthenticated', () async {
      // First log in.
      when(mockLoginUseCase(email: 'test@example.com', password: 'password123'))
          .thenAnswer((_) async => (testUser, testTokens));
      await authNotifier.login(
        email: 'test@example.com',
        password: 'password123',
      );
      expect(authNotifier.state.isAuthenticated, isTrue);

      // Now log out.
      when(mockLogoutUseCase()).thenAnswer((_) async {});
      await authNotifier.logout();

      expect(authNotifier.state.status, AuthStatus.unauthenticated);
      expect(authNotifier.state.user, isNull);
    });

    test('logout transitions to unauthenticated even when use case throws',
        () async {
      // First log in.
      when(mockLoginUseCase(email: 'test@example.com', password: 'password123'))
          .thenAnswer((_) async => (testUser, testTokens));
      await authNotifier.login(
        email: 'test@example.com',
        password: 'password123',
      );

      // Logout throws a network error, but we should still become
      // unauthenticated.
      when(mockLogoutUseCase()).thenThrow(Exception('Network error'));
      await authNotifier.logout();

      expect(authNotifier.state.status, AuthStatus.unauthenticated);
    });

    // -------------------------------------------------------------------------
    // Register
    // -------------------------------------------------------------------------

    test('register success transitions to authenticated', () async {
      when(mockRegisterUseCase(
        email: 'new@example.com',
        password: 'password123',
        username: 'newuser',
        displayName: 'New User',
      )).thenAnswer((_) async => (testUser, testTokens));

      await authNotifier.register(
        email: 'new@example.com',
        password: 'password123',
        username: 'newuser',
        displayName: 'New User',
      );

      expect(authNotifier.state.status, AuthStatus.authenticated);
      expect(authNotifier.state.user, testUser);
    });

    test('register failure transitions to error', () async {
      when(mockRegisterUseCase(
        email: 'existing@example.com',
        password: 'password123',
        username: 'existinguser',
        displayName: 'Existing',
      )).thenThrow(Exception('Email already in use'));

      await authNotifier.register(
        email: 'existing@example.com',
        password: 'password123',
        username: 'existinguser',
        displayName: 'Existing',
      );

      expect(authNotifier.state.status, AuthStatus.error);
      expect(authNotifier.state.errorMessage, 'Email already in use');
    });

    // -------------------------------------------------------------------------
    // Session restoration
    // -------------------------------------------------------------------------

    test(
        'checkAuthStatus restores authenticated state when tokens and user exist',
        () async {
      // Override for this specific test -- create a new notifier with tokens.
      when(mockLocalDataSource.hasTokens()).thenAnswer((_) async => true);
      when(mockLocalDataSource.getUser()).thenReturn(null);
      when(mockRepository.getCurrentUser())
          .thenAnswer((_) async => testUser);

      final notifier = AuthNotifier(
        login: mockLoginUseCase,
        register: mockRegisterUseCase,
        socialLogin: mockSocialLoginUseCase,
        logout: mockLogoutUseCase,
        repository: mockRepository,
        local: mockLocalDataSource,
      );

      // Wait for the async checkAuthStatus to complete.
      await Future<void>.delayed(const Duration(milliseconds: 100));

      expect(notifier.state.status, AuthStatus.authenticated);
      expect(notifier.state.user, testUser);
    });

    // -------------------------------------------------------------------------
    // AuthState
    // -------------------------------------------------------------------------

    test('AuthState copyWith creates a new instance with updated fields', () {
      const state = AuthState(status: AuthStatus.loading);

      final updated = state.copyWith(
        status: AuthStatus.authenticated,
        user: testUser,
      );

      expect(updated.status, AuthStatus.authenticated);
      expect(updated.user, testUser);
      expect(updated.errorMessage, isNull);
    });

    test('AuthState convenience constructors produce correct statuses', () {
      expect(const AuthState.initial().status, AuthStatus.initial);
      expect(const AuthState.loading().status, AuthStatus.loading);
      expect(const AuthState.unauthenticated().status,
          AuthStatus.unauthenticated);
      expect(AuthState.authenticated(testUser).status,
          AuthStatus.authenticated);
      expect(AuthState.error('fail').status, AuthStatus.error);
      expect(AuthState.error('fail').errorMessage, 'fail');
    });

    test('AuthState isLoading and isAuthenticated helpers', () {
      expect(const AuthState.loading().isLoading, isTrue);
      expect(const AuthState.loading().isAuthenticated, isFalse);
      expect(AuthState.authenticated(testUser).isAuthenticated, isTrue);
      expect(AuthState.authenticated(testUser).isLoading, isFalse);
    });
  });
}
