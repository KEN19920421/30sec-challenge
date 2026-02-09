import 'dart:async';
import 'dart:io';

import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../constants/app_constants.dart';
import 'storage_service.dart';

/// Top-level handler for background messages. Must be a top-level function
/// (not a class method) as required by firebase_messaging.
@pragma('vm:entry-point')
Future<void> firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  // Firebase must already be initialized before this is called.
  debugPrint('[FCM] Background message: ${message.messageId}');
  // Additional background processing (e.g. local notification display)
  // can be added here.
}

/// Service responsible for initializing Firebase Cloud Messaging,
/// requesting permissions, handling foreground/background messages,
/// and managing the device token.
class PushNotificationService {
  final FirebaseMessaging _messaging;
  final StorageService _storage;

  /// Stream controller that emits notification payloads when a user taps
  /// a notification. Consumers (e.g. the router) can listen to this stream
  /// to perform deep-link navigation.
  final StreamController<Map<String, dynamic>> _notificationTapController =
      StreamController<Map<String, dynamic>>.broadcast();

  /// Public stream of notification tap events containing the message data.
  Stream<Map<String, dynamic>> get onNotificationTap =>
      _notificationTapController.stream;

  PushNotificationService({
    FirebaseMessaging? messaging,
    required StorageService storage,
  })  : _messaging = messaging ?? FirebaseMessaging.instance,
        _storage = storage;

  // ---------------------------------------------------------------------------
  // Initialization
  // ---------------------------------------------------------------------------

  /// Initialize the push notification service.
  ///
  /// This should be called once during app startup, after Firebase is
  /// initialized and the user is authenticated.
  Future<void> initialize() async {
    // Register the background handler.
    FirebaseMessaging.onBackgroundMessage(firebaseMessagingBackgroundHandler);

    // Request permissions (iOS / web).
    await _requestPermission();

    // Obtain and persist the device token.
    await _getAndSaveToken();

    // Listen for token refresh events.
    _messaging.onTokenRefresh.listen(_saveToken);

    // Configure foreground message handling.
    _configureForegroundMessages();

    // Handle the case where the app was launched from a terminated state
    // by tapping a notification.
    await _handleInitialMessage();

    // Handle notification taps when the app is in the background (but not
    // terminated).
    FirebaseMessaging.onMessageOpenedApp.listen(_handleMessageTap);
  }

  // ---------------------------------------------------------------------------
  // Permissions
  // ---------------------------------------------------------------------------

  /// Request notification permissions from the user.
  ///
  /// On Android 13+ this triggers the runtime permission dialog.
  /// On iOS this triggers the standard notification permission dialog.
  /// Returns the resulting [NotificationSettings].
  Future<NotificationSettings> _requestPermission() async {
    final settings = await _messaging.requestPermission(
      alert: true,
      announcement: false,
      badge: true,
      carPlay: false,
      criticalAlert: false,
      provisional: false,
      sound: true,
    );

    debugPrint(
      '[FCM] Permission status: ${settings.authorizationStatus}',
    );

    return settings;
  }

  // ---------------------------------------------------------------------------
  // Device Token
  // ---------------------------------------------------------------------------

  /// Retrieve the current FCM token and persist it locally.
  ///
  /// The token should also be sent to the backend so the server can target
  /// this device for push notifications.
  Future<String?> _getAndSaveToken() async {
    try {
      // On iOS, the APNS token must be available before requesting the FCM
      // token.
      if (Platform.isIOS) {
        final apnsToken = await _messaging.getAPNSToken();
        if (apnsToken == null) {
          debugPrint('[FCM] APNS token not yet available.');
          return null;
        }
      }

      final token = await _messaging.getToken();
      if (token != null) {
        await _saveToken(token);
      }
      return token;
    } catch (e) {
      debugPrint('[FCM] Error getting token: $e');
      return null;
    }
  }

  /// Persist the FCM token to local storage and optionally send it to the
  /// backend.
  Future<void> _saveToken(String token) async {
    debugPrint('[FCM] Token: $token');
    await _storage.setString(AppConstants.keyFcmToken, token);

    // TODO: Send the token to the backend API so the server can deliver
    // targeted push notifications to this device.
    // Example: await _apiClient.post('/devices', data: {'token': token});
  }

  /// Returns the currently stored FCM token, or null if not yet obtained.
  String? get currentToken {
    return _storage.getString(AppConstants.keyFcmToken);
  }

  // ---------------------------------------------------------------------------
  // Foreground Messages
  // ---------------------------------------------------------------------------

  /// Configure how messages are handled when the app is in the foreground.
  void _configureForegroundMessages() {
    // Show heads-up notifications on iOS even when the app is foregrounded.
    _messaging.setForegroundNotificationPresentationOptions(
      alert: true,
      badge: true,
      sound: true,
    );

    FirebaseMessaging.onMessage.listen((RemoteMessage message) {
      debugPrint(
        '[FCM] Foreground message: ${message.notification?.title}',
      );

      // TODO: Display an in-app banner / snackbar / local notification here.
      // The notification data is available in `message.data` and the display
      // payload in `message.notification`.
    });
  }

  // ---------------------------------------------------------------------------
  // Notification Tap Handling
  // ---------------------------------------------------------------------------

  /// Check whether the app was opened from a terminated state via a
  /// notification tap.
  Future<void> _handleInitialMessage() async {
    final initialMessage = await _messaging.getInitialMessage();
    if (initialMessage != null) {
      _handleMessageTap(initialMessage);
    }
  }

  /// Called when the user taps a notification (from background or terminated
  /// state). Parses the message data and emits it to [onNotificationTap] so
  /// the navigation layer can deep-link to the appropriate screen.
  void _handleMessageTap(RemoteMessage message) {
    debugPrint('[FCM] Notification tapped: ${message.data}');
    _notificationTapController.add(message.data);
  }

  // ---------------------------------------------------------------------------
  // Topic Subscription
  // ---------------------------------------------------------------------------

  /// Subscribe to a named FCM topic (e.g. "daily_challenge", "announcements").
  Future<void> subscribeToTopic(String topic) async {
    await _messaging.subscribeToTopic(topic);
    debugPrint('[FCM] Subscribed to topic: $topic');
  }

  /// Unsubscribe from a named FCM topic.
  Future<void> unsubscribeFromTopic(String topic) async {
    await _messaging.unsubscribeFromTopic(topic);
    debugPrint('[FCM] Unsubscribed from topic: $topic');
  }

  // ---------------------------------------------------------------------------
  // Cleanup
  // ---------------------------------------------------------------------------

  /// Delete the FCM token and unregister this device from push notifications.
  ///
  /// Call this on logout or account deletion.
  Future<void> deleteToken() async {
    await _messaging.deleteToken();
    await _storage.remove(AppConstants.keyFcmToken);
    debugPrint('[FCM] Token deleted.');
  }

  /// Dispose the service and close streams.
  void dispose() {
    _notificationTapController.close();
  }
}

// =============================================================================
// Riverpod provider
// =============================================================================

/// Provides the singleton [PushNotificationService].
///
/// Requires [storageServiceProvider] to be initialized.
final pushNotificationServiceProvider =
    Provider<PushNotificationService>((ref) {
  final storage = ref.watch(storageServiceProvider);
  return PushNotificationService(storage: storage);
});
