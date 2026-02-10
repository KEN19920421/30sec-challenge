import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mockito/annotations.dart';
import 'package:mockito/mockito.dart';
import 'package:thirty_sec_challenge/l10n/generated/app_localizations.dart';

import 'package:thirty_sec_challenge/features/auth/data/datasources/auth_local_datasource.dart';
import 'package:thirty_sec_challenge/features/auth/domain/repositories/auth_repository.dart';
import 'package:thirty_sec_challenge/features/auth/domain/usecases/logout_usecase.dart';
import 'package:thirty_sec_challenge/features/auth/domain/usecases/social_login_usecase.dart';
import 'package:thirty_sec_challenge/features/auth/presentation/providers/auth_provider.dart';
import 'package:thirty_sec_challenge/features/auth/presentation/screens/login_screen.dart';

@GenerateMocks([
  AuthRepository,
  SocialLoginUseCase,
  LogoutUseCase,
  AuthLocalDataSource,
])
import 'login_screen_test.mocks.dart';

void main() {
  late MockAuthRepository mockRepository;
  late MockSocialLoginUseCase mockSocialLoginUseCase;
  late MockLogoutUseCase mockLogoutUseCase;
  late MockAuthLocalDataSource mockLocalDataSource;

  setUp(() {
    mockRepository = MockAuthRepository();
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
    testWidgets('renders social login buttons', (tester) async {
      await tester.pumpWidget(buildTestWidget());
      await tester.pumpAndSettle();

      // The Google sign-in button should be present.
      expect(find.text('Continue with Google'), findsOneWidget);
    });

    testWidgets('renders app title', (tester) async {
      await tester.pumpWidget(buildTestWidget());
      await tester.pumpAndSettle();

      expect(find.text('30sec Challenge'), findsOneWidget);
    });

    testWidgets('renders sign-in subtitle', (tester) async {
      await tester.pumpWidget(buildTestWidget());
      await tester.pumpAndSettle();

      expect(find.text('Sign in to continue'), findsOneWidget);
    });

    testWidgets('renders terms and privacy links', (tester) async {
      await tester.pumpWidget(buildTestWidget());
      await tester.pumpAndSettle();

      expect(find.text('Terms of Service'), findsOneWidget);
      expect(find.text('Privacy Policy'), findsOneWidget);
    });

    testWidgets('does not render email/password fields', (tester) async {
      await tester.pumpWidget(buildTestWidget());
      await tester.pumpAndSettle();

      // Should NOT find email or password text fields.
      expect(find.byType(TextFormField), findsNothing);
    });
  });
}
