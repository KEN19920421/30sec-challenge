import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';

import '../constants/app_constants.dart';

/// Parsed deep link result containing the target route and any parameters.
class DeepLinkResult {
  /// The GoRouter path to navigate to (e.g. "/voting/abc123").
  final String path;

  /// Optional extra parameters that don't fit in the path.
  final Map<String, String> queryParams;

  const DeepLinkResult({
    required this.path,
    this.queryParams = const {},
  });

  @override
  String toString() => 'DeepLinkResult(path: $path, queryParams: $queryParams)';
}

/// Handles deep links and notification-based navigation.
///
/// Supports two categories of inbound links:
///
/// 1. **Share URLs** -- Universal links or custom-scheme links that a user
///    taps outside the app (e.g. `https://30secchallenge.com/s/abc123` or
///    `thirtySecChallenge://submission/abc123`).
///
/// 2. **Notification data** -- The `data` payload from an FCM notification
///    tap that contains a `type` and relevant IDs.
///
/// The service exposes a [Stream] of [DeepLinkResult]s that the router or
/// any navigation controller can listen to.
class DeepLinkService {
  final GoRouter _router;

  /// Stream controller for deep link events.
  final StreamController<DeepLinkResult> _deepLinkController =
      StreamController<DeepLinkResult>.broadcast();

  /// Public stream of parsed deep link results.
  Stream<DeepLinkResult> get onDeepLink => _deepLinkController.stream;

  /// Platform channel for receiving initial and subsequent deep links from
  /// the native layer.
  static const _methodChannel =
      MethodChannel('${AppConstants.deepLinkScheme}/deeplinks');

  DeepLinkService({required GoRouter router}) : _router = router;

  // ---------------------------------------------------------------------------
  // Initialization
  // ---------------------------------------------------------------------------

  /// Start listening for deep links from the platform and process any initial
  /// link that launched the app.
  Future<void> initialize() async {
    // Handle the initial link (app launched from a deep link in terminated
    // state).
    try {
      final initialLink = await _methodChannel.invokeMethod<String>(
        'getInitialLink',
      );
      if (initialLink != null && initialLink.isNotEmpty) {
        _handleUri(Uri.parse(initialLink));
      }
    } on MissingPluginException {
      // Method channel not implemented on this platform -- that's fine.
      debugPrint('[DeepLink] No native deep link handler registered.');
    } catch (e) {
      debugPrint('[DeepLink] Error getting initial link: $e');
    }

    // Listen for subsequent deep links while the app is running.
    _methodChannel.setMethodCallHandler((call) async {
      if (call.method == 'onDeepLink') {
        final link = call.arguments as String?;
        if (link != null && link.isNotEmpty) {
          _handleUri(Uri.parse(link));
        }
      }
    });
  }

  // ---------------------------------------------------------------------------
  // URL Parsing
  // ---------------------------------------------------------------------------

  /// Parse a URI (universal link or custom scheme) and navigate accordingly.
  void _handleUri(Uri uri) {
    debugPrint('[DeepLink] Received URI: $uri');

    final result = parseUri(uri);
    if (result != null) {
      _deepLinkController.add(result);
      navigateTo(result);
    }
  }

  /// Parse a [Uri] into a [DeepLinkResult], or null if the URI is not
  /// recognized.
  ///
  /// Supported paths:
  /// - `/s/{submissionId}` or `/submission/{submissionId}` -- navigate to the
  ///   submission detail / voting screen.
  /// - `/c/{challengeId}` or `/challenge/{challengeId}` -- navigate to the
  ///   challenge detail screen.
  /// - `/u/{userId}` or `/user/{userId}` -- navigate to a user profile.
  /// - `/voting/{challengeId}` -- navigate to the voting screen.
  /// - `/leaderboard` -- navigate to the leaderboard tab.
  DeepLinkResult? parseUri(Uri uri) {
    final segments = uri.pathSegments;

    if (segments.isEmpty) return null;

    switch (segments[0]) {
      case 's':
      case 'submission':
        if (segments.length >= 2) {
          final submissionId = segments[1];
          return DeepLinkResult(
            path: '/voting/$submissionId',
            queryParams: {'source': 'deeplink'},
          );
        }
        break;

      case 'c':
      case 'challenge':
        if (segments.length >= 2) {
          final challengeId = segments[1];
          return DeepLinkResult(path: '/challenge/$challengeId');
        }
        break;

      case 'u':
      case 'user':
        if (segments.length >= 2) {
          final userId = segments[1];
          return DeepLinkResult(path: '/user/$userId');
        }
        break;

      case 'voting':
        if (segments.length >= 2) {
          final challengeId = segments[1];
          return DeepLinkResult(path: '/voting/$challengeId');
        }
        break;

      case 'leaderboard':
        return const DeepLinkResult(path: '/leaderboard');

      case 'profile':
        return const DeepLinkResult(path: '/profile');

      case 'settings':
        return const DeepLinkResult(path: '/settings');
    }

    return null;
  }

  // ---------------------------------------------------------------------------
  // Notification Data Parsing
  // ---------------------------------------------------------------------------

  /// Parse an FCM notification data payload and navigate to the appropriate
  /// screen.
  ///
  /// Expected data format:
  /// ```json
  /// {
  ///   "type": "new_vote" | "new_follower" | "challenge_reminder" | "submission_featured",
  ///   "challengeId": "abc123",
  ///   "userId": "user456",
  ///   "submissionId": "sub789"
  /// }
  /// ```
  void handleNotificationData(Map<String, dynamic> data) {
    debugPrint('[DeepLink] Notification data: $data');

    final result = parseNotificationData(data);
    if (result != null) {
      _deepLinkController.add(result);
      navigateTo(result);
    }
  }

  /// Parse notification data into a [DeepLinkResult], or null if the data
  /// does not contain a recognized navigation target.
  DeepLinkResult? parseNotificationData(Map<String, dynamic> data) {
    final type = data['type'] as String?;

    switch (type) {
      case 'new_vote':
      case 'submission_featured':
        final submissionId = data['submissionId'] as String?;
        final challengeId = data['challengeId'] as String?;
        if (challengeId != null) {
          return DeepLinkResult(path: '/voting/$challengeId');
        }
        if (submissionId != null) {
          return DeepLinkResult(path: '/voting/$submissionId');
        }
        break;

      case 'new_follower':
        final userId = data['userId'] as String?;
        if (userId != null) {
          return DeepLinkResult(path: '/user/$userId');
        }
        break;

      case 'challenge_reminder':
      case 'challenge_started':
        final challengeId = data['challengeId'] as String?;
        if (challengeId != null) {
          return DeepLinkResult(path: '/challenge/$challengeId');
        }
        break;

      case 'voting_started':
        final challengeId = data['challengeId'] as String?;
        if (challengeId != null) {
          return DeepLinkResult(path: '/voting/$challengeId');
        }
        break;

      case 'leaderboard_update':
        return const DeepLinkResult(path: '/leaderboard');

      default:
        debugPrint('[DeepLink] Unrecognized notification type: $type');
        return null;
    }

    return null;
  }

  // ---------------------------------------------------------------------------
  // Navigation
  // ---------------------------------------------------------------------------

  /// Navigate to the parsed deep link result using GoRouter.
  void navigateTo(DeepLinkResult result) {
    debugPrint('[DeepLink] Navigating to: ${result.path}');

    if (result.queryParams.isNotEmpty) {
      final uri = Uri(
        path: result.path,
        queryParameters: result.queryParams,
      );
      _router.go(uri.toString());
    } else {
      _router.go(result.path);
    }
  }

  // ---------------------------------------------------------------------------
  // Share URL Generation
  // ---------------------------------------------------------------------------

  /// Generate a share URL for a submission.
  static String submissionShareUrl(String submissionId) {
    return 'https://${AppConstants.universalLinkHost}/s/$submissionId';
  }

  /// Generate a share URL for a challenge.
  static String challengeShareUrl(String challengeId) {
    return 'https://${AppConstants.universalLinkHost}/c/$challengeId';
  }

  /// Generate a share URL for a user profile.
  static String userShareUrl(String userId) {
    return 'https://${AppConstants.universalLinkHost}/u/$userId';
  }

  // ---------------------------------------------------------------------------
  // Cleanup
  // ---------------------------------------------------------------------------

  /// Dispose the service and close streams.
  void dispose() {
    _deepLinkController.close();
  }
}
