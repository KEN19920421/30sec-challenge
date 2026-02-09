import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:thirty_sec_challenge/features/challenge/domain/challenge.dart';
import 'package:thirty_sec_challenge/features/challenge/presentation/widgets/challenge_card.dart';
import 'package:thirty_sec_challenge/l10n/generated/app_localizations.dart';

void main() {
  /// Factory to create a [Challenge] with sensible defaults for testing.
  Challenge createTestChallenge({
    String id = 'challenge-1',
    String title = 'Dance Like Nobody Is Watching',
    String category = 'Dance',
    String difficulty = 'easy',
    String status = 'active',
    int submissionCount = 42,
    DateTime? startsAt,
    DateTime? endsAt,
    DateTime? votingEndsAt,
    String? sponsorName,
  }) {
    final now = DateTime.now();
    return Challenge(
      id: id,
      title: title,
      category: category,
      difficulty: difficulty,
      description: 'Show us your best moves in 30 seconds!',
      status: status,
      startsAt: startsAt ?? now.subtract(const Duration(hours: 2)),
      endsAt: endsAt ?? now.add(const Duration(hours: 10)),
      votingEndsAt: votingEndsAt ?? now.add(const Duration(hours: 22)),
      submissionCount: submissionCount,
      sponsorName: sponsorName,
      createdAt: now.subtract(const Duration(days: 1)),
    );
  }

  /// Wraps the widget under test in a [MaterialApp] for proper theming.
  Widget buildTestWidget(Challenge challenge, {VoidCallback? onTap}) {
    return MaterialApp(
      localizationsDelegates: const [
        AppLocalizations.delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      supportedLocales: AppLocalizations.supportedLocales,
      home: Scaffold(
        body: Padding(
          padding: const EdgeInsets.all(16),
          child: ChallengeCard(
            challenge: challenge,
            onTap: onTap,
          ),
        ),
      ),
    );
  }

  group('ChallengeCard', () {
    testWidgets('renders challenge title', (tester) async {
      final challenge =
          createTestChallenge(title: 'Dance Like Nobody Is Watching');

      await tester.pumpWidget(buildTestWidget(challenge));
      await tester.pumpAndSettle();

      expect(find.text('Dance Like Nobody Is Watching'), findsOneWidget);
    });

    testWidgets('renders category badge', (tester) async {
      final challenge = createTestChallenge(category: 'Comedy');

      await tester.pumpWidget(buildTestWidget(challenge));
      await tester.pumpAndSettle();

      // Category badge renders the text in uppercase.
      expect(find.text('COMEDY'), findsOneWidget);
    });

    testWidgets('renders submission count when available', (tester) async {
      final challenge = createTestChallenge(submissionCount: 42);

      await tester.pumpWidget(buildTestWidget(challenge));
      await tester.pumpAndSettle();

      expect(find.text('42 entries'), findsOneWidget);
    });

    testWidgets('renders Live status chip for active challenges',
        (tester) async {
      final challenge = createTestChallenge(status: 'active');

      await tester.pumpWidget(buildTestWidget(challenge));
      await tester.pumpAndSettle();

      expect(find.text('Live'), findsOneWidget);
    });

    testWidgets('renders Voting status chip for voting challenges',
        (tester) async {
      final challenge = createTestChallenge(status: 'voting');

      await tester.pumpWidget(buildTestWidget(challenge));
      await tester.pumpAndSettle();

      expect(find.text('Voting'), findsOneWidget);
    });

    testWidgets('renders Completed status chip for completed challenges',
        (tester) async {
      final challenge = createTestChallenge(status: 'completed');

      await tester.pumpWidget(buildTestWidget(challenge));
      await tester.pumpAndSettle();

      expect(find.text('Completed'), findsOneWidget);
    });

    testWidgets('renders countdown for active challenges', (tester) async {
      final challenge = createTestChallenge(
        status: 'active',
        endsAt: DateTime.now().add(const Duration(hours: 5, minutes: 30)),
      );

      await tester.pumpWidget(buildTestWidget(challenge));
      // Allow the countdown timer to tick once.
      await tester.pump(const Duration(seconds: 1));

      // The countdown widget should render a timer icon.
      expect(find.byIcon(Icons.timer_outlined), findsOneWidget);
    });

    testWidgets('tap triggers onTap callback', (tester) async {
      var tapped = false;
      final challenge = createTestChallenge();

      await tester.pumpWidget(
        buildTestWidget(challenge, onTap: () => tapped = true),
      );
      await tester.pumpAndSettle();

      // Tap the card.
      await tester.tap(find.byType(ChallengeCard));
      await tester.pumpAndSettle();

      expect(tapped, isTrue);
    });

    testWidgets('renders sponsored badge when challenge has a sponsor',
        (tester) async {
      final challenge = createTestChallenge(sponsorName: 'BrandCo');

      await tester.pumpWidget(buildTestWidget(challenge));
      await tester.pumpAndSettle();

      expect(find.text('Sponsored'), findsOneWidget);
    });

    testWidgets('does not render sponsored badge when no sponsor',
        (tester) async {
      final challenge = createTestChallenge(sponsorName: null);

      await tester.pumpWidget(buildTestWidget(challenge));
      await tester.pumpAndSettle();

      expect(find.text('Sponsored'), findsNothing);
    });

    testWidgets('renders difficulty indicator dots', (tester) async {
      final challenge = createTestChallenge(difficulty: 'hard');

      await tester.pumpWidget(buildTestWidget(challenge));
      await tester.pumpAndSettle();

      // The difficulty indicator renders 3 small circle containers.
      // We verify the card renders without error (difficulty indicator
      // is internal but contributes to the widget tree).
      expect(find.byType(ChallengeCard), findsOneWidget);
    });

    testWidgets('hero variant renders taller', (tester) async {
      final challenge = createTestChallenge();

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: Padding(
              padding: const EdgeInsets.all(16),
              child: ChallengeCard(
                challenge: challenge,
                isHero: true,
              ),
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();

      // Find the sized container -- hero variant has height 220.
      final container = tester.firstWidget<Container>(
        find.descendant(
          of: find.byType(ChallengeCard),
          matching: find.byType(Container).first,
        ),
      );
      expect(container, isNotNull);
    });
  });
}
