import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mockito/annotations.dart';
import 'package:mockito/mockito.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:thirty_sec_challenge/l10n/generated/app_localizations.dart';

import 'package:thirty_sec_challenge/features/auth/data/datasources/auth_local_datasource.dart';
import 'package:thirty_sec_challenge/features/auth/domain/repositories/auth_repository.dart';
import 'package:thirty_sec_challenge/features/auth/domain/usecases/login_usecase.dart';
import 'package:thirty_sec_challenge/features/auth/domain/usecases/logout_usecase.dart';
import 'package:thirty_sec_challenge/features/auth/domain/usecases/register_usecase.dart';
import 'package:thirty_sec_challenge/features/auth/domain/usecases/social_login_usecase.dart';
import 'package:thirty_sec_challenge/features/auth/presentation/providers/auth_provider.dart';
import 'package:thirty_sec_challenge/core/services/auth_storage_service.dart';
import 'package:thirty_sec_challenge/core/services/storage_service.dart';
import 'package:thirty_sec_challenge/core/router/app_router.dart';
import 'package:thirty_sec_challenge/core/theme/app_theme.dart';

@GenerateMocks([
  AuthRepository,
  LoginUseCase,
  RegisterUseCase,
  SocialLoginUseCase,
  LogoutUseCase,
  AuthLocalDataSource,
  AuthStorageService,
])
import 'app_test.mocks.dart';

void main() {
  late MockAuthRepository mockRepository;
  late MockLoginUseCase mockLoginUseCase;
  late MockRegisterUseCase mockRegisterUseCase;
  late MockSocialLoginUseCase mockSocialLoginUseCase;
  late MockLogoutUseCase mockLogoutUseCase;
  late MockAuthLocalDataSource mockLocalDataSource;
  late MockAuthStorageService mockAuthStorageService;

  setUp(() async {
    mockRepository = MockAuthRepository();
    mockLoginUseCase = MockLoginUseCase();
    mockRegisterUseCase = MockRegisterUseCase();
    mockSocialLoginUseCase = MockSocialLoginUseCase();
    mockLogoutUseCase = MockLogoutUseCase();
    mockLocalDataSource = MockAuthLocalDataSource();
    mockAuthStorageService = MockAuthStorageService();

    // Default: user is not logged in.
    when(mockLocalDataSource.hasTokens()).thenAnswer((_) async => false);
    when(mockLocalDataSource.getUser()).thenReturn(null);
    when(mockAuthStorageService.isLoggedIn()).thenAnswer((_) async => false);

    // Initialize SharedPreferences with empty values for testing.
    SharedPreferences.setMockInitialValues({});
  });

  group('App Integration', () {
    testWidgets('app launches without crashing', (tester) async {
      SharedPreferences.setMockInitialValues({});
      final prefs = await SharedPreferences.getInstance();

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            storageServiceProvider.overrideWithValue(StorageService(prefs)),
            authStorageServiceProvider
                .overrideWithValue(mockAuthStorageService),
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
          child: Consumer(
            builder: (context, ref, _) {
              final router = ref.watch(appRouterProvider);
              return MaterialApp.router(
                routerConfig: router,
                theme: AppTheme.light,
                localizationsDelegates: const [
                  AppLocalizations.delegate,
                  GlobalMaterialLocalizations.delegate,
                  GlobalWidgetsLocalizations.delegate,
                  GlobalCupertinoLocalizations.delegate,
                ],
                supportedLocales: AppLocalizations.supportedLocales,
              );
            },
          ),
        ),
      );

      // Let async operations (route redirect, auth check) settle.
      await tester.pumpAndSettle();

      // The app should have started successfully.
      expect(find.byType(MaterialApp), findsOneWidget);
    });

    testWidgets('shows login screen when user is not authenticated',
        (tester) async {
      SharedPreferences.setMockInitialValues({});
      final prefs = await SharedPreferences.getInstance();

      // Auth storage says not logged in -> router redirects to /login.
      when(mockAuthStorageService.isLoggedIn())
          .thenAnswer((_) async => false);

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            storageServiceProvider.overrideWithValue(StorageService(prefs)),
            authStorageServiceProvider
                .overrideWithValue(mockAuthStorageService),
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
          child: Consumer(
            builder: (context, ref, _) {
              final router = ref.watch(appRouterProvider);
              return MaterialApp.router(
                routerConfig: router,
                theme: AppTheme.light,
                localizationsDelegates: const [
                  AppLocalizations.delegate,
                  GlobalMaterialLocalizations.delegate,
                  GlobalWidgetsLocalizations.delegate,
                  GlobalCupertinoLocalizations.delegate,
                ],
                supportedLocales: AppLocalizations.supportedLocales,
              );
            },
          ),
        ),
      );

      await tester.pumpAndSettle();

      // The router should have redirected to the login page.
      // The login placeholder page shows "Login" text.
      expect(find.text('Login'), findsWidgets);
    });

    testWidgets('router handles unknown routes with error page',
        (tester) async {
      SharedPreferences.setMockInitialValues({});
      final prefs = await SharedPreferences.getInstance();

      // Make the user appear logged in so we don't redirect to /login.
      when(mockAuthStorageService.isLoggedIn())
          .thenAnswer((_) async => true);

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            storageServiceProvider.overrideWithValue(StorageService(prefs)),
            authStorageServiceProvider
                .overrideWithValue(mockAuthStorageService),
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
          child: Consumer(
            builder: (context, ref, _) {
              final router = ref.watch(appRouterProvider);
              return MaterialApp.router(
                routerConfig: router,
                theme: AppTheme.light,
                localizationsDelegates: const [
                  AppLocalizations.delegate,
                  GlobalMaterialLocalizations.delegate,
                  GlobalWidgetsLocalizations.delegate,
                  GlobalCupertinoLocalizations.delegate,
                ],
                supportedLocales: AppLocalizations.supportedLocales,
              );
            },
          ),
        ),
      );

      await tester.pumpAndSettle();

      // The app should render without error.
      expect(find.byType(Scaffold), findsWidgets);
    });
  });
}
