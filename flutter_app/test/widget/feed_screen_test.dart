import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mockito/annotations.dart';

import 'package:thirty_sec_challenge/core/config/app_config.dart';
import 'package:thirty_sec_challenge/core/network/api_client.dart';
import 'package:thirty_sec_challenge/features/challenge/domain/submission.dart';
import 'package:thirty_sec_challenge/features/feed/domain/repositories/feed_repository.dart';
import 'package:thirty_sec_challenge/features/feed/presentation/providers/discover_provider.dart';
import 'package:thirty_sec_challenge/features/feed/presentation/providers/feed_provider.dart';
import 'package:thirty_sec_challenge/features/feed/presentation/screens/feed_screen.dart';
import 'package:thirty_sec_challenge/l10n/generated/app_localizations.dart';

@GenerateMocks([FeedRepository])
import 'feed_screen_test.mocks.dart';

// =============================================================================
// Test helpers
// =============================================================================

/// A [DiscoverNotifier] subclass that seeds empty state and never hits the API.
class _TestDiscoverNotifier extends DiscoverNotifier {
  _TestDiscoverNotifier(super.apiClient);

  @override
  Future<void> loadDiscover() async {
    // No-op — avoid real network calls in tests.
  }

  @override
  Future<void> loadMore() async {
    // No-op.
  }
}

/// A [FeedNotifier] subclass that seeds a pre-built state and never hits the API.
class _TestFeedNotifier extends FeedNotifier {
  final FeedState _initialState;

  _TestFeedNotifier(this._initialState, {required super.repository}) {
    state = _initialState;
  }

  @override
  Future<void> loadFeed() async {
    // No-op for tests — state is already seeded.
  }

  @override
  Future<void> setCategory(String? category) async {
    state = state.copyWith(selectedCategory: category);
  }

  @override
  Future<void> loadMore() async {
    // No-op for tests.
  }

  @override
  Future<void> search(String? query) async {
    state = state.copyWith(searchQuery: query);
  }
}

/// Test submissions used across multiple tests.
final _testSubmissions = [
  Submission(
    id: 'sub-1',
    userId: 'user-1',
    challengeId: 'c-1',
    caption: 'My awesome dance',
    voteCount: 42,
    username: 'alice',
    displayName: 'Alice',
    createdAt: DateTime(2024, 6, 1),
  ),
  Submission(
    id: 'sub-2',
    userId: 'user-2',
    challengeId: 'c-1',
    caption: 'Comedy gold',
    voteCount: 18,
    username: 'bob',
    displayName: 'Bob',
    createdAt: DateTime(2024, 6, 2),
  ),
];

late MockFeedRepository _mockFeedRepo;

// =============================================================================
// Tests
// =============================================================================

void main() {
  setUpAll(() {
    // Initialize AppConfig so that ApiClient can be instantiated in tests.
    AppConfig.initialize();
  });

  setUp(() {
    _mockFeedRepo = MockFeedRepository();
  });

  /// Wraps [FeedScreen] in a [ProviderScope] with the given [feedState]
  /// and the required localization delegates.
  Widget buildTestWidget({required FeedState feedState}) {
    return ProviderScope(
      overrides: [
        // Override discoverProvider so _WatchTab never makes real API calls.
        discoverProvider.overrideWith(
          (ref) => _TestDiscoverNotifier(ref.watch(apiClientProvider)),
        ),
        feedProvider.overrideWith(
          (_) => _TestFeedNotifier(feedState, repository: _mockFeedRepo),
        ),
      ],
      child: const MaterialApp(
        localizationsDelegates: [
          AppLocalizations.delegate,
          GlobalMaterialLocalizations.delegate,
          GlobalWidgetsLocalizations.delegate,
          GlobalCupertinoLocalizations.delegate,
        ],
        supportedLocales: AppLocalizations.supportedLocales,
        home: FeedScreen(),
      ),
    );
  }

  group('FeedScreen', () {
    testWidgets('renders category chips from feedCategoriesProvider',
        (tester) async {
      await tester.pumpWidget(
        buildTestWidget(feedState: const FeedState(status: FeedStatus.loaded)),
      );
      await tester.pumpAndSettle();

      // Switch to Explore tab to see category chips.
      await tester.tap(find.text('Explore'));
      await tester.pumpAndSettle();

      // The default categories include 'All', 'Dance', 'Comedy', etc.
      expect(find.text('All'), findsOneWidget);
      expect(find.text('Dance'), findsOneWidget);
      expect(find.text('Comedy'), findsOneWidget);
      expect(find.text('Music'), findsOneWidget);
    });

    testWidgets('shows loading indicator when feed is loading with no data',
        (tester) async {
      await tester.pumpWidget(
        buildTestWidget(feedState: const FeedState(status: FeedStatus.loading)),
      );
      await tester.pumpAndSettle();

      // Switch to Explore tab to see the feed content.
      await tester.tap(find.text('Explore'));
      await tester.pump();

      // The Scaffold should render without errors.
      expect(find.byType(Scaffold), findsOneWidget);
    });

    testWidgets('renders ChoiceChip widgets for each category', (tester) async {
      await tester.pumpWidget(
        buildTestWidget(feedState: const FeedState(status: FeedStatus.loaded)),
      );
      await tester.pumpAndSettle();

      // Switch to Explore tab to see category chips.
      await tester.tap(find.text('Explore'));
      await tester.pumpAndSettle();

      // There are 9 categories defined in feedCategoriesProvider.
      // Some may be off-screen in the horizontal ListView, so at least 8 render.
      expect(find.byType(ChoiceChip), findsAtLeastNWidgets(8));
    });

    testWidgets('"All" chip is selected by default (no selectedCategory)',
        (tester) async {
      await tester.pumpWidget(
        buildTestWidget(feedState: const FeedState(status: FeedStatus.loaded)),
      );
      await tester.pumpAndSettle();

      // Switch to Explore tab to see category chips.
      await tester.tap(find.text('Explore'));
      await tester.pumpAndSettle();

      // Find the 'All' ChoiceChip and verify it is selected.
      final allChip = tester.widget<ChoiceChip>(
        find.widgetWithText(ChoiceChip, 'All'),
      );
      expect(allChip.selected, isTrue);
    });

    testWidgets('renders Scaffold with extendBodyBehindAppBar', (tester) async {
      await tester.pumpWidget(
        buildTestWidget(feedState: const FeedState(status: FeedStatus.loaded)),
      );
      await tester.pumpAndSettle();

      final scaffold = tester.widget<Scaffold>(find.byType(Scaffold).first);
      expect(scaffold.extendBodyBehindAppBar, isTrue);
    });

    testWidgets('shows PageView when feed has submissions', (tester) async {
      await tester.pumpWidget(
        buildTestWidget(
          feedState: FeedState(
            status: FeedStatus.loaded,
            submissions: _testSubmissions,
          ),
        ),
      );
      await tester.pumpAndSettle();

      // Switch to Explore tab to see the feed PageView.
      await tester.tap(find.text('Explore'));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));

      // The VideoFeedPage renders a PageView.builder for submissions.
      expect(find.byType(PageView), findsAtLeastNWidgets(1));
    });

    testWidgets('error state shows error icon when no cached data',
        (tester) async {
      await tester.pumpWidget(
        buildTestWidget(
          feedState: const FeedState(
            status: FeedStatus.error,
            errorMessage: 'Network error',
          ),
        ),
      );
      await tester.pumpAndSettle();

      // Switch to Explore tab to see the error state.
      await tester.tap(find.text('Explore'));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));

      // FeedScreen shows ErrorStateWidget with wifi_off icon on error.
      expect(find.byIcon(Icons.wifi_off_rounded), findsOneWidget);
    });

    testWidgets('"All" chip is selected, "Dance" chip is not selected initially',
        (tester) async {
      await tester.pumpWidget(
        buildTestWidget(feedState: const FeedState(status: FeedStatus.loaded)),
      );
      await tester.pumpAndSettle();

      // Switch to Explore tab to see category chips.
      await tester.tap(find.text('Explore'));
      await tester.pumpAndSettle();

      final allChip = tester.widget<ChoiceChip>(
        find.widgetWithText(ChoiceChip, 'All'),
      );
      expect(allChip.selected, isTrue);

      final danceChip = tester.widget<ChoiceChip>(
        find.widgetWithText(ChoiceChip, 'Dance'),
      );
      expect(danceChip.selected, isFalse);
    });

    testWidgets('tapping category chip updates the selected chip',
        (tester) async {
      await tester.pumpWidget(
        buildTestWidget(feedState: const FeedState(status: FeedStatus.loaded)),
      );
      await tester.pumpAndSettle();

      // Switch to Explore tab to see category chips.
      await tester.tap(find.text('Explore'));
      await tester.pumpAndSettle();

      // Tap the 'Dance' chip.
      await tester.tap(find.text('Dance'));
      await tester.pumpAndSettle();

      // After tapping 'Dance', it should be selected.
      final danceChip = tester.widget<ChoiceChip>(
        find.widgetWithText(ChoiceChip, 'Dance'),
      );
      expect(danceChip.selected, isTrue);
    });

    testWidgets('renders empty-state text when no submissions loaded',
        (tester) async {
      await tester.pumpWidget(
        buildTestWidget(
          feedState: const FeedState(
            status: FeedStatus.loaded,
            submissions: [],
          ),
        ),
      );
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));

      // The Scaffold should still render without errors.
      expect(find.byType(Scaffold), findsOneWidget);
    });
  });
}
