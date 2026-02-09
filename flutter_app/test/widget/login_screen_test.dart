import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mockito/annotations.dart';
import 'package:mockito/mockito.dart';
import 'package:thirty_sec_challenge/l10n/generated/app_localizations.dart';

import 'package:thirty_sec_challenge/features/auth/data/datasources/auth_local_datasource.dart';
import 'package:thirty_sec_challenge/features/auth/domain/entities/auth_tokens.dart';
import 'package:thirty_sec_challenge/features/auth/domain/entities/user.dart';
import 'package:thirty_sec_challenge/features/auth/domain/repositories/auth_repository.dart';
import 'package:thirty_sec_challenge/features/auth/domain/usecases/login_usecase.dart';
import 'package:thirty_sec_challenge/features/auth/domain/usecases/logout_usecase.dart';
import 'package:thirty_sec_challenge/features/auth/domain/usecases/register_usecase.dart';
import 'package:thirty_sec_challenge/features/auth/domain/usecases/social_login_usecase.dart';
import 'package:thirty_sec_challenge/features/auth/presentation/providers/auth_provider.dart';
import 'package:thirty_sec_challenge/features/auth/presentation/screens/login_screen.dart';

@GenerateMocks([
  AuthRepository,
  LoginUseCase,
  RegisterUseCase,
  SocialLoginUseCase,
  LogoutUseCase,
  AuthLocalDataSource,
])
import 'login_screen_test.mocks.dart';

void main() {
  late MockAuthRepository mockRepository;
  late MockLoginUseCase mockLoginUseCase;
  late MockRegisterUseCase mockRegisterUseCase;
  late MockSocialLoginUseCase mockSocialLoginUseCase;
  late MockLogoutUseCase mockLogoutUseCase;
  late MockAuthLocalDataSource mockLocalDataSource;

  setUp(() {
    mockRepository = MockAuthRepository();
    mockLoginUseCase = MockLoginUseCase();
    mockRegisterUseCase = MockRegisterUseCase();
    mockSocialLoginUseCase = MockSocialLoginUseCase();
    mockLogoutUseCase = MockLogoutUseCase();
    mockLocalDataSource = MockAuthLocalDataSource();

    // Default stubs so the AuthNotifier constructor's checkAuthStatus
    // completes without errors.
    when(mockLocalDataSource.hasTokens()).thenAnswer((_) async => false);
    when(mockLocalDataSource.getUser()).thenReturn(null);
  });

  /// Wraps the [LoginScreen] in the necessary providers and [MaterialApp].
  Widget buildTestWidget() {
    return ProviderScope(
      overrides: [
        authProvider.overrideWith((ref) {
          return AuthNotifier(
            login: mockLoginUseCase,
            register: mockRegisterUseCase,
            socialLogin: mockSocialLoginUseCase,
            logout: mockLogoutUseCase,
            repository: mockRepository,
            local: mockLocalDataSource,
          );
        }),
      ],
      child: MaterialApp(
        localizationsDelegates: const [
          AppLocalizations.delegate,
          GlobalMaterialLocalizations.delegate,
          GlobalWidgetsLocalizations.delegate,
          GlobalCupertinoLocalizations.delegate,
        ],
        supportedLocales: AppLocalizations.supportedLocales,
        home: const LoginScreen(),
      ),
    );
  }

  group('LoginScreen', () {
    testWidgets('renders email and password fields', (tester) async {
      await tester.pumpWidget(buildTestWidget());
      await tester.pumpAndSettle();

      // Should find email text field.
      expect(find.text('Email'), findsOneWidget);

      // Should find password text field.
      expect(find.text('Password'), findsOneWidget);
    });

    testWidgets('renders login button', (tester) async {
      await tester.pumpWidget(buildTestWidget());
      await tester.pumpAndSettle();

      expect(find.text('Log In'), findsOneWidget);
    });

    testWidgets('shows validation error for empty email on submit',
        (tester) async {
      await tester.pumpWidget(buildTestWidget());
      await tester.pumpAndSettle();

      // Tap the login button without entering anything.
      await tester.tap(find.text('Log In'));
      await tester.pumpAndSettle();

      // Should show email validation error.
      expect(find.text('Email is required'), findsOneWidget);
    });

    testWidgets('shows validation error for empty password on submit',
        (tester) async {
      await tester.pumpWidget(buildTestWidget());
      await tester.pumpAndSettle();

      // Enter a valid email but leave password empty.
      final emailField = find.byType(TextFormField).first;
      await tester.enterText(emailField, 'test@example.com');

      // Tap the login button.
      await tester.tap(find.text('Log In'));
      await tester.pumpAndSettle();

      // Should show password validation error.
      expect(find.text('Password is required'), findsOneWidget);
    });

    testWidgets('renders social login buttons', (tester) async {
      await tester.pumpWidget(buildTestWidget());
      await tester.pumpAndSettle();

      // The Google sign-in button should be present.
      expect(find.text('Continue with Google'), findsOneWidget);

      // The "or continue with" divider text.
      expect(find.text('or continue with'), findsOneWidget);
    });

    testWidgets('renders sign-up navigation link', (tester) async {
      await tester.pumpWidget(buildTestWidget());
      await tester.pumpAndSettle();

      expect(find.text("Don't have an account? "), findsOneWidget);
      expect(find.text('Sign Up'), findsOneWidget);
    });

    testWidgets('renders forgot password link', (tester) async {
      await tester.pumpWidget(buildTestWidget());
      await tester.pumpAndSettle();

      expect(find.text('Forgot Password?'), findsOneWidget);
    });

    testWidgets('password field has visibility toggle', (tester) async {
      await tester.pumpWidget(buildTestWidget());
      await tester.pumpAndSettle();

      // Find the visibility toggle icon button.
      expect(find.byIcon(Icons.visibility_off_outlined), findsOneWidget);

      // Tap it to toggle visibility.
      await tester.tap(find.byIcon(Icons.visibility_off_outlined));
      await tester.pumpAndSettle();

      // Icon should change to visibility_outlined.
      expect(find.byIcon(Icons.visibility_outlined), findsOneWidget);
    });

    testWidgets('shows loading indicator when login is in progress',
        (tester) async {
      // Use a Completer that we never complete, so the login hangs
      // without leaving a pending timer.
      final completer = Completer<(User, AuthTokens)>();

      when(mockLoginUseCase(
              email: 'test@example.com', password: 'password123'))
          .thenAnswer((_) => completer.future);

      await tester.pumpWidget(buildTestWidget());
      await tester.pumpAndSettle();

      // Enter valid credentials.
      final fields = find.byType(TextFormField);
      await tester.enterText(fields.at(0), 'test@example.com');
      await tester.enterText(fields.at(1), 'password123');

      // Tap login.
      await tester.tap(find.text('Log In'));
      await tester.pump();

      // Should show a CircularProgressIndicator (button + possibly overlay).
      expect(find.byType(CircularProgressIndicator), findsWidgets);
    });
  });
}
