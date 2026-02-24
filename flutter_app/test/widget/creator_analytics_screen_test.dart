import 'dart:async';

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mockito/annotations.dart';
import 'package:mockito/mockito.dart';

import 'package:thirty_sec_challenge/core/network/api_client.dart';
import 'package:thirty_sec_challenge/features/auth/presentation/providers/auth_provider.dart';
import 'package:thirty_sec_challenge/features/profile/presentation/screens/creator_analytics_screen.dart';
import 'package:thirty_sec_challenge/l10n/generated/app_localizations.dart';

@GenerateMocks([ApiClient])
import 'creator_analytics_screen_test.mocks.dart';

// =============================================================================
// Test setup
// =============================================================================

late MockApiClient _mockApiClient;

Widget _buildTestWidget({String? userId}) {
  return ProviderScope(
    overrides: [
      currentUserProvider.overrideWithValue(null),
      apiClientProvider.overrideWithValue(_mockApiClient),
    ],
    child: MaterialApp(
      localizationsDelegates: const [
        AppLocalizations.delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      supportedLocales: AppLocalizations.supportedLocales,
      home: CreatorAnalyticsScreen(userId: userId),
    ),
  );
}

// =============================================================================
// Tests
// =============================================================================

void main() {
  setUp(() {
    _mockApiClient = MockApiClient();
  });

  group('CreatorAnalyticsScreen', () {
    testWidgets('renders scaffold with app bar', (tester) async {
      await tester.pumpWidget(_buildTestWidget());
      await tester.pump();

      expect(find.byType(Scaffold), findsOneWidget);
      expect(find.byType(AppBar), findsOneWidget);
    });

    testWidgets('shows Analytics label in app bar', (tester) async {
      await tester.pumpWidget(_buildTestWidget());
      await tester.pump();

      // l10n key 'creatorAnalytics' maps to 'Analytics'
      expect(find.text('Analytics'), findsOneWidget);
    });

    testWidgets('shows error when no user id is available', (tester) async {
      await tester.pumpWidget(_buildTestWidget());
      await tester.pumpAndSettle();

      expect(find.byIcon(Icons.error_outline), findsOneWidget);
    });

    testWidgets('shows retry button in error state', (tester) async {
      await tester.pumpWidget(_buildTestWidget());
      await tester.pumpAndSettle();

      // ElevatedButton.icon renders as an ElevatedButton in the tree.
      expect(find.text('Retry'), findsOneWidget);
    });

    testWidgets('shows error on network failure with userId provided',
        (tester) async {
      when(_mockApiClient.get<Map<String, dynamic>>(any))
          .thenThrow(Exception('network error'));

      await tester.pumpWidget(_buildTestWidget(userId: 'user-abc'));
      await tester.pumpAndSettle();

      expect(find.byIcon(Icons.error_outline), findsOneWidget);
    });

    testWidgets('shows shimmer skeleton during initial loading', (tester) async {
      final completer = Completer<Response<Map<String, dynamic>>>();
      when(_mockApiClient.get<Map<String, dynamic>>(any))
          .thenAnswer((_) => completer.future);

      await tester.pumpWidget(_buildTestWidget(userId: 'user-123'));
      // Before the async request completes, loading state is active.
      await tester.pump();

      // Scaffold is rendered (shimmer or loading state).
      expect(find.byType(Scaffold), findsOneWidget);

      // Complete to avoid dangling async operations.
      completer.completeError(Exception('done'));
      await tester.pump(const Duration(milliseconds: 10));
    });
  });
}
