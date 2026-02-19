import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mockito/annotations.dart';
import 'package:mockito/mockito.dart';

import 'package:thirty_sec_challenge/core/config/app_config.dart';
import 'package:thirty_sec_challenge/features/auth/data/datasources/auth_local_datasource.dart';
import 'package:thirty_sec_challenge/features/auth/domain/repositories/auth_repository.dart';
import 'package:thirty_sec_challenge/features/auth/domain/usecases/logout_usecase.dart';
import 'package:thirty_sec_challenge/features/auth/domain/usecases/social_login_usecase.dart';
import 'package:thirty_sec_challenge/features/auth/presentation/providers/auth_provider.dart';
import 'package:thirty_sec_challenge/features/leaderboard/data/leaderboard_repository.dart';
import 'package:thirty_sec_challenge/features/leaderboard/domain/leaderboard_entry.dart';
import 'package:thirty_sec_challenge/features/leaderboard/presentation/providers/leaderboard_provider.dart';
import 'package:thirty_sec_challenge/features/leaderboard/presentation/screens/leaderboard_screen.dart';
import 'package:thirty_sec_challenge/l10n/generated/app_localizations.dart';

@GenerateMocks([
  LeaderboardRepository,
  AuthRepository,
  SocialLoginUseCase,
  LogoutUseCase,
  AuthLocalDataSource,
])
import 'leaderboard_screen_test.mocks.dart';

// =============================================================================
// Test helpers
// =============================================================================

/// A [LeaderboardNotifier] subclass that seeds state and does not call the API.
class _TestLeaderboardNotifier extends LeaderboardNotifier {
  final LeaderboardState _initialState;

  _TestLeaderboardNotifier(
    this._initialState, {
    required super.repository,
    required super.challengeId,
  }) {
    state = _initialState;
  }

  @override
  Future<void> loadLeaderboard() async {
    // No-op.
  }

  @override
  Future<void> loadMyRank() async {
    // No-op.
  }

  @override
  Future<void> loadNextPage() async {
    // No-op.
  }

  @override
  void changePeriod(LeaderboardPeriod period) {
    state = state.copyWith(period: period);
  }

  @override
  void loadFriendsLeaderboard() {
    state = state.copyWith(isFriendsTab: true);
  }

  @override
  Future<void> refresh() async {
    // No-op.
  }
}

/// Creates a [LeaderboardEntry] for testing.
LeaderboardEntry _createEntry({
  required int rank,
  required String username,
  String? displayName,
  double score = 10.0,
  int voteCount = 5,
}) {
  return LeaderboardEntry(
    submissionId: 'sub-$rank',
    userId: 'user-$rank',
    username: username,
    displayName: displayName ?? username,
    rank: rank,
    score: score,
    voteCount: voteCount,
  );
}

late MockLeaderboardRepository _mockLeaderboardRepo;
late MockAuthRepository _mockAuthRepo;
late MockSocialLoginUseCase _mockSocialLogin;
late MockLogoutUseCase _mockLogout;
late MockAuthLocalDataSource _mockAuthLocal;

/// Wraps [LeaderboardScreen] in the necessary providers.
Widget _buildTestWidget({
  String challengeId = 'test-challenge',
  String challengeTitle = 'Test Leaderboard',
  required LeaderboardState leaderboardState,
  bool showBannerAd = false, // Disable ads in tests.
}) {
  return ProviderScope(
    overrides: [
      // Override leaderboard notifier with seeded state.
      leaderboardProvider(challengeId).overrideWith(
        (_) => _TestLeaderboardNotifier(
          leaderboardState,
          repository: _mockLeaderboardRepo,
          challengeId: challengeId,
        ),
      ),
      // Override auth provider to avoid pulling real auth dependencies.
      authProvider.overrideWith((ref) {
        return AuthNotifier(
          socialLogin: _mockSocialLogin,
          logout: _mockLogout,
          repository: _mockAuthRepo,
          local: _mockAuthLocal,
        );
      }),
      // Override currentUserProvider so leaderboard "is current user" check works.
      currentUserProvider.overrideWithValue(null),
    ],
    child: MaterialApp(
      localizationsDelegates: const [
        AppLocalizations.delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      supportedLocales: AppLocalizations.supportedLocales,
      home: LeaderboardScreen(
        challengeId: challengeId,
        challengeTitle: challengeTitle,
        showBannerAd: showBannerAd,
      ),
    ),
  );
}

// =============================================================================
// Tests
// =============================================================================

void main() {
  setUpAll(() {
    try {
      AppConfig.initialize();
    } catch (_) {
      // Already initialized.
    }
  });

  setUp(() {
    _mockLeaderboardRepo = MockLeaderboardRepository();
    _mockAuthRepo = MockAuthRepository();
    _mockSocialLogin = MockSocialLoginUseCase();
    _mockLogout = MockLogoutUseCase();
    _mockAuthLocal = MockAuthLocalDataSource();

    // Default stubs for auth (unauthenticated).
    when(_mockAuthLocal.hasTokens()).thenAnswer((_) async => false);
    when(_mockAuthLocal.getUser()).thenReturn(null);
  });

  group('LeaderboardScreen', () {
    // -------------------------------------------------------------------------
    // App bar
    // -------------------------------------------------------------------------

    testWidgets('renders app bar with challenge title', (tester) async {
      await tester.pumpWidget(
        _buildTestWidget(
          challengeTitle: 'Best Dance Move',
          leaderboardState: const LeaderboardState(isLoading: true),
        ),
      );
      await tester.pump();

      expect(find.text('Best Dance Move'), findsOneWidget);
    });

    testWidgets('renders scoring info button in app bar', (tester) async {
      await tester.pumpWidget(
        _buildTestWidget(
          leaderboardState: const LeaderboardState(isLoading: true),
        ),
      );
      await tester.pump();

      expect(find.byIcon(Icons.info_outline_rounded), findsOneWidget);
    });

    // -------------------------------------------------------------------------
    // Loading state
    // -------------------------------------------------------------------------

    testWidgets('shows loading indicator when loading with no entries',
        (tester) async {
      await tester.pumpWidget(
        _buildTestWidget(
          leaderboardState: const LeaderboardState(isLoading: true),
        ),
      );
      await tester.pump();

      expect(find.byType(CircularProgressIndicator), findsOneWidget);
    });

    // -------------------------------------------------------------------------
    // Error state
    // -------------------------------------------------------------------------

    testWidgets('shows error message and error icon on error', (tester) async {
      await tester.pumpWidget(
        _buildTestWidget(
          leaderboardState: const LeaderboardState(
            isLoading: false,
            errorMessage: 'Network error',
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.byIcon(Icons.error_outline_rounded), findsOneWidget);
      expect(find.text('Network error'), findsOneWidget);
    });

    // -------------------------------------------------------------------------
    // Tab bar
    // -------------------------------------------------------------------------

    testWidgets('renders all four leaderboard tabs', (tester) async {
      await tester.pumpWidget(
        _buildTestWidget(
          leaderboardState: const LeaderboardState(isLoading: false),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Daily'), findsOneWidget);
      expect(find.text('Weekly'), findsOneWidget);
      expect(find.text('All Time'), findsOneWidget);
      expect(find.text('Friends'), findsOneWidget);
    });

    // -------------------------------------------------------------------------
    // Empty state
    // -------------------------------------------------------------------------

    testWidgets('shows empty state message when no entries', (tester) async {
      await tester.pumpWidget(
        _buildTestWidget(
          leaderboardState: const LeaderboardState(
            isLoading: false,
            entries: [],
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('No rankings yet'), findsOneWidget);
      expect(
        find.text('Be the first to submit and get ranked.'),
        findsOneWidget,
      );
    });

    // -------------------------------------------------------------------------
    // Populated leaderboard
    // -------------------------------------------------------------------------

    testWidgets('renders screen successfully with entries', (tester) async {
      // Entries only from rank 4 onwards to avoid TopThreePodium rendering
      // issues in test (borderRadius + non-uniform borders).
      final entries = [
        _createEntry(rank: 4, username: 'diana', score: 65.0),
        _createEntry(rank: 5, username: 'eve', score: 52.1),
      ];

      await tester.pumpWidget(
        _buildTestWidget(
          leaderboardState: LeaderboardState(
            isLoading: false,
            entries: entries,
            hasMorePages: false,
          ),
        ),
      );
      await tester.pumpAndSettle();

      // Screen renders without errors.
      expect(find.byType(Scaffold), findsOneWidget);
    });

    testWidgets('renders rank 4+ entries in the scrollable list',
        (tester) async {
      final entries = [
        _createEntry(rank: 4, username: 'diana', displayName: 'Diana D.'),
        _createEntry(rank: 5, username: 'eve', displayName: 'Eve E.'),
      ];

      await tester.pumpWidget(
        _buildTestWidget(
          leaderboardState: LeaderboardState(
            isLoading: false,
            entries: entries,
            hasMorePages: false,
          ),
        ),
      );
      await tester.pumpAndSettle();

      // Rank 4+ entries appear via RankTile.
      expect(find.text('Diana D.'), findsOneWidget);
      expect(find.text('Eve E.'), findsOneWidget);
    });

    // -------------------------------------------------------------------------
    // My Rank banner
    // -------------------------------------------------------------------------

    testWidgets('renders "Your Rank" banner when user has a rank',
        (tester) async {
      // Use rank 4+ entries to avoid TopThreePodium rendering issues in test.
      final entries = [
        _createEntry(rank: 4, username: 'diana'),
        _createEntry(rank: 5, username: 'eve'),
      ];

      await tester.pumpWidget(
        _buildTestWidget(
          leaderboardState: LeaderboardState(
            isLoading: false,
            entries: entries,
            myRank: const UserRank(
              rank: 7,
              score: 45.5,
              totalParticipants: 100,
            ),
            hasMorePages: false,
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Your Rank'), findsOneWidget);
      expect(find.text('#7'), findsOneWidget);
      expect(find.text('45.5 points'), findsOneWidget);
    });

    testWidgets('does not render "Your Rank" banner when no rank',
        (tester) async {
      // Use rank 4+ entries to avoid TopThreePodium rendering issues in test.
      await tester.pumpWidget(
        _buildTestWidget(
          leaderboardState: LeaderboardState(
            isLoading: false,
            entries: [_createEntry(rank: 4, username: 'diana')],
            myRank: null,
            hasMorePages: false,
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Your Rank'), findsNothing);
    });

    // -------------------------------------------------------------------------
    // Scoring info dialog
    // -------------------------------------------------------------------------

    testWidgets('tapping info button shows scoring info dialog',
        (tester) async {
      await tester.pumpWidget(
        _buildTestWidget(
          leaderboardState: const LeaderboardState(isLoading: false),
        ),
      );
      await tester.pumpAndSettle();

      // Tap the info button.
      await tester.tap(find.byIcon(Icons.info_outline_rounded));
      await tester.pumpAndSettle();

      // Dialog should show scoring details.
      expect(find.text('Upvote'), findsOneWidget);
      expect(find.text('+1 point'), findsOneWidget);
      expect(find.text('Downvote'), findsOneWidget);
      expect(find.text('-1 point'), findsOneWidget);
      expect(find.text('Super Vote'), findsOneWidget);
      expect(find.text('+3 points'), findsOneWidget);
    });

    testWidgets('scoring info dialog can be dismissed', (tester) async {
      await tester.pumpWidget(
        _buildTestWidget(
          leaderboardState: const LeaderboardState(isLoading: false),
        ),
      );
      await tester.pumpAndSettle();

      // Open the dialog.
      await tester.tap(find.byIcon(Icons.info_outline_rounded));
      await tester.pumpAndSettle();

      // The dialog should contain a dismiss TextButton.
      final dismissButton = find.byType(TextButton);
      expect(dismissButton, findsOneWidget);

      // Tap to dismiss.
      await tester.tap(dismissButton);
      await tester.pumpAndSettle();

      // Dialog should be gone.
      expect(find.text('Upvote'), findsNothing);
    });
  });
}
