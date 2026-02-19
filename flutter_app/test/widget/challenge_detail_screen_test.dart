import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mockito/annotations.dart';

import 'package:thirty_sec_challenge/features/challenge/data/challenge_repository.dart';
import 'package:thirty_sec_challenge/features/challenge/domain/challenge.dart';
import 'package:thirty_sec_challenge/features/challenge/domain/submission.dart';
import 'package:thirty_sec_challenge/features/challenge/presentation/providers/challenge_provider.dart';
import 'package:thirty_sec_challenge/features/challenge/presentation/screens/challenge_detail_screen.dart';
import 'package:thirty_sec_challenge/l10n/generated/app_localizations.dart';

@GenerateMocks([ChallengeRepository])
import 'challenge_detail_screen_test.mocks.dart';

// =============================================================================
// Test helpers
// =============================================================================

/// Creates a [Challenge] with sensible defaults for testing.
Challenge _createTestChallenge({
  String id = 'challenge-1',
  String title = 'Best Dance Move',
  String description = 'Show us your best 30-second dance move!',
  String category = 'Dance',
  String difficulty = 'medium',
  String status = 'active',
  int submissionCount = 128,
  int totalVotes = 2450,
  String? sponsorName,
  String? sponsorLogoUrl,
  DateTime? startsAt,
  DateTime? endsAt,
  DateTime? votingEndsAt,
}) {
  final now = DateTime.now();
  return Challenge(
    id: id,
    title: title,
    description: description,
    category: category,
    difficulty: difficulty,
    status: status,
    startsAt: startsAt ?? now.subtract(const Duration(hours: 6)),
    endsAt: endsAt ?? now.add(const Duration(hours: 18)),
    votingEndsAt: votingEndsAt ?? now.add(const Duration(hours: 42)),
    submissionCount: submissionCount,
    totalVotes: totalVotes,
    sponsorName: sponsorName,
    sponsorLogoUrl: sponsorLogoUrl,
    createdAt: now.subtract(const Duration(days: 2)),
  );
}

/// Creates a [Submission] for results display.
Submission _createTestSubmission({
  required String id,
  String userId = 'user-1',
  String challengeId = 'challenge-1',
  String? caption,
  int voteCount = 0,
  int rank = 1,
  String? username,
  String? displayName,
}) {
  return Submission(
    id: id,
    userId: userId,
    challengeId: challengeId,
    caption: caption,
    voteCount: voteCount,
    rank: rank,
    username: username,
    displayName: displayName,
    createdAt: DateTime(2024, 6, 1),
  );
}

/// A [ChallengeResultsNotifier] that seeds state without making API calls.
class _TestResultsNotifier extends ChallengeResultsNotifier {
  final ChallengeResultsState _initialState;

  _TestResultsNotifier(this._initialState, {required super.repository, required super.challengeId}) {
    state = _initialState;
  }

  @override
  Future<void> loadInitial() async {
    // No-op.
  }

  @override
  Future<void> loadMore() async {
    // No-op.
  }
}

late MockChallengeRepository _mockRepository;

/// Wraps [ChallengeDetailScreen] with necessary providers.
Widget _buildTestWidget({
  required String challengeId,
  required AsyncValue<Challenge> challengeAsync,
  ChallengeResultsState? resultsState,
}) {
  return ProviderScope(
    overrides: [
      // Override the FutureProvider.family to return our test challenge.
      challengeDetailProvider(challengeId).overrideWith(
        (ref) {
          return challengeAsync.when(
            data: (c) => Future.value(c),
            // Return a future that never completes for loading state.
            loading: () => Future<Challenge>.delayed(const Duration(days: 365)),
            error: (e, _) => Future<Challenge>.error(e, StackTrace.empty),
          );
        },
      ),
      // Override the results notifier.
      challengeResultsProvider(challengeId).overrideWith(
        (_) => _TestResultsNotifier(
          resultsState ?? ChallengeResultsState(challengeId: challengeId),
          repository: _mockRepository,
          challengeId: challengeId,
        ),
      ),
    ],
    child: MaterialApp(
      localizationsDelegates: const [
        AppLocalizations.delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      supportedLocales: AppLocalizations.supportedLocales,
      home: ChallengeDetailScreen(challengeId: challengeId),
    ),
  );
}

// =============================================================================
// Tests
// =============================================================================

void main() {
  setUp(() {
    _mockRepository = MockChallengeRepository();
  });

  group('ChallengeDetailScreen', () {
    // -------------------------------------------------------------------------
    // Loading state
    // -------------------------------------------------------------------------

    testWidgets('shows loading indicator while challenge loads', (tester) async {
      // Use a Completer that never completes to keep the provider in loading.
      final completer = Completer<Challenge>();

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            challengeDetailProvider('challenge-1').overrideWith(
              (ref) => completer.future,
            ),
            challengeResultsProvider('challenge-1').overrideWith(
              (_) => _TestResultsNotifier(
                ChallengeResultsState(challengeId: 'challenge-1'),
                repository: _mockRepository,
                challengeId: 'challenge-1',
              ),
            ),
          ],
          child: MaterialApp(
            localizationsDelegates: const [
              AppLocalizations.delegate,
              GlobalMaterialLocalizations.delegate,
              GlobalWidgetsLocalizations.delegate,
              GlobalCupertinoLocalizations.delegate,
            ],
            supportedLocales: AppLocalizations.supportedLocales,
            home: const ChallengeDetailScreen(challengeId: 'challenge-1'),
          ),
        ),
      );
      await tester.pump();

      expect(find.byType(CircularProgressIndicator), findsOneWidget);
    });

    // -------------------------------------------------------------------------
    // Error state
    // -------------------------------------------------------------------------

    testWidgets('shows error body with retry button on error', (tester) async {
      await tester.pumpWidget(
        _buildTestWidget(
          challengeId: 'challenge-1',
          challengeAsync: AsyncValue<Challenge>.error(
            Exception('Connection failed'),
            StackTrace.empty,
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Failed to load challenge'), findsOneWidget);
      expect(find.text('Retry'), findsOneWidget);
      expect(find.byIcon(Icons.error_outline_rounded), findsOneWidget);
    });

    // -------------------------------------------------------------------------
    // Loaded state — basic rendering
    // -------------------------------------------------------------------------

    testWidgets('renders challenge title and description', (tester) async {
      final challenge = _createTestChallenge(
        title: 'Epic Dance Battle',
        description: 'Show us your best 30-second dance move!',
      );

      await tester.pumpWidget(
        _buildTestWidget(
          challengeId: challenge.id,
          challengeAsync: AsyncValue<Challenge>.data(challenge),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Epic Dance Battle'), findsOneWidget);
      expect(
          find.text('Show us your best 30-second dance move!'), findsOneWidget);
    });

    testWidgets('renders category chip in uppercase', (tester) async {
      final challenge = _createTestChallenge(category: 'Comedy');

      await tester.pumpWidget(
        _buildTestWidget(
          challengeId: challenge.id,
          challengeAsync: AsyncValue<Challenge>.data(challenge),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('COMEDY'), findsOneWidget);
    });

    testWidgets('renders LIVE status label for active challenge',
        (tester) async {
      final challenge = _createTestChallenge(status: 'active');

      await tester.pumpWidget(
        _buildTestWidget(
          challengeId: challenge.id,
          challengeAsync: AsyncValue<Challenge>.data(challenge),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('LIVE'), findsOneWidget);
    });

    testWidgets('renders VOTING status label for voting challenge',
        (tester) async {
      final challenge = _createTestChallenge(status: 'voting');

      await tester.pumpWidget(
        _buildTestWidget(
          challengeId: challenge.id,
          challengeAsync: AsyncValue<Challenge>.data(challenge),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('VOTING'), findsOneWidget);
    });

    testWidgets('renders COMPLETED status label for completed challenge',
        (tester) async {
      final challenge = _createTestChallenge(status: 'completed');

      await tester.pumpWidget(
        _buildTestWidget(
          challengeId: challenge.id,
          challengeAsync: AsyncValue<Challenge>.data(challenge),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('COMPLETED'), findsOneWidget);
    });

    // -------------------------------------------------------------------------
    // Stats row
    // -------------------------------------------------------------------------

    testWidgets('renders stats row with entries, votes, and remaining',
        (tester) async {
      final challenge = _createTestChallenge(
        submissionCount: 128,
        totalVotes: 2450,
      );

      await tester.pumpWidget(
        _buildTestWidget(
          challengeId: challenge.id,
          challengeAsync: AsyncValue<Challenge>.data(challenge),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('128'), findsOneWidget); // Entries count.
      expect(find.text('2.5K'), findsOneWidget); // Votes formatted.
      expect(find.text('Entries'), findsOneWidget);
      expect(find.text('Votes'), findsOneWidget);
      expect(find.text('Remaining'), findsOneWidget);
    });

    // -------------------------------------------------------------------------
    // Action buttons
    // -------------------------------------------------------------------------

    testWidgets('shows record button icon for active challenges',
        (tester) async {
      final challenge = _createTestChallenge(status: 'active');

      await tester.pumpWidget(
        _buildTestWidget(
          challengeId: challenge.id,
          challengeAsync: AsyncValue<Challenge>.data(challenge),
        ),
      );
      await tester.pumpAndSettle();

      // The record button has a fiber_manual_record icon.
      expect(find.byIcon(Icons.fiber_manual_record), findsOneWidget);
    });

    testWidgets('shows results button icon for voting challenges',
        (tester) async {
      final challenge = _createTestChallenge(status: 'voting');

      await tester.pumpWidget(
        _buildTestWidget(
          challengeId: challenge.id,
          challengeAsync: AsyncValue<Challenge>.data(challenge),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.byIcon(Icons.emoji_events_outlined), findsOneWidget);
    });

    testWidgets('shows results button icon for completed challenges',
        (tester) async {
      final challenge = _createTestChallenge(status: 'completed');

      await tester.pumpWidget(
        _buildTestWidget(
          challengeId: challenge.id,
          challengeAsync: AsyncValue<Challenge>.data(challenge),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.byIcon(Icons.emoji_events_outlined), findsOneWidget);
    });

    testWidgets('does not show record or results button for scheduled challenge',
        (tester) async {
      final challenge = _createTestChallenge(status: 'scheduled');

      await tester.pumpWidget(
        _buildTestWidget(
          challengeId: challenge.id,
          challengeAsync: AsyncValue<Challenge>.data(challenge),
        ),
      );
      await tester.pumpAndSettle();

      // Scheduled challenges show neither the record nor the results button.
      expect(find.byIcon(Icons.fiber_manual_record), findsNothing);
      expect(find.byIcon(Icons.emoji_events_outlined), findsNothing);
    });

    // -------------------------------------------------------------------------
    // Sponsor section
    // -------------------------------------------------------------------------

    testWidgets('renders sponsor badge when challenge is sponsored',
        (tester) async {
      final challenge = _createTestChallenge(
        sponsorName: 'BrandCo',
        sponsorLogoUrl: 'https://example.com/logo.png',
      );

      await tester.pumpWidget(
        _buildTestWidget(
          challengeId: challenge.id,
          challengeAsync: AsyncValue<Challenge>.data(challenge),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('BrandCo'), findsOneWidget);
    });

    testWidgets('does not render sponsor badge when not sponsored',
        (tester) async {
      final challenge = _createTestChallenge(sponsorName: null);

      await tester.pumpWidget(
        _buildTestWidget(
          challengeId: challenge.id,
          challengeAsync: AsyncValue<Challenge>.data(challenge),
        ),
      );
      await tester.pumpAndSettle();

      // No sponsor text should appear.
      expect(find.text('BrandCo'), findsNothing);
    });

    // -------------------------------------------------------------------------
    // Top submissions
    // -------------------------------------------------------------------------

    testWidgets('renders top submissions heading when results exist',
        (tester) async {
      final challenge = _createTestChallenge();
      final submissions = [
        _createTestSubmission(
          id: 'sub-1',
          rank: 1,
          voteCount: 100,
          displayName: 'Alice',
          caption: 'My entry',
        ),
        _createTestSubmission(
          id: 'sub-2',
          rank: 2,
          voteCount: 80,
          displayName: 'Bob',
          caption: 'Watch this',
        ),
      ];

      await tester.pumpWidget(
        _buildTestWidget(
          challengeId: challenge.id,
          challengeAsync: AsyncValue<Challenge>.data(challenge),
          resultsState: ChallengeResultsState(
            challengeId: challenge.id,
            submissions: submissions,
          ),
        ),
      );
      await tester.pumpAndSettle();

      // Scroll down to reveal the submissions section below the fold.
      await tester.drag(find.byType(CustomScrollView), const Offset(0, -500));
      await tester.pumpAndSettle();

      expect(find.text('Top Submissions'), findsOneWidget);
      expect(find.text('Alice'), findsOneWidget);
      expect(find.text('Bob'), findsOneWidget);
      expect(find.text('#1'), findsOneWidget);
      expect(find.text('#2'), findsOneWidget);
    });

    testWidgets('does not render top submissions when results are empty',
        (tester) async {
      final challenge = _createTestChallenge();

      await tester.pumpWidget(
        _buildTestWidget(
          challengeId: challenge.id,
          challengeAsync: AsyncValue<Challenge>.data(challenge),
          resultsState: ChallengeResultsState(
            challengeId: challenge.id,
            submissions: const [],
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Top Submissions'), findsNothing);
    });

    // -------------------------------------------------------------------------
    // App bar
    // -------------------------------------------------------------------------

    testWidgets('renders back button and share button in app bar',
        (tester) async {
      final challenge = _createTestChallenge();

      await tester.pumpWidget(
        _buildTestWidget(
          challengeId: challenge.id,
          challengeAsync: AsyncValue<Challenge>.data(challenge),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.byIcon(Icons.arrow_back_rounded), findsOneWidget);
      expect(find.byIcon(Icons.share_rounded), findsOneWidget);
    });
  });
}
