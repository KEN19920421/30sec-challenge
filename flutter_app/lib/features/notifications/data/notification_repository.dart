import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../../../core/network/api_response.dart';
import '../domain/app_notification.dart';

/// Repository handling all notification-related API communication.
class NotificationRepository {
  final ApiClient _apiClient;

  NotificationRepository({required ApiClient apiClient})
      : _apiClient = apiClient;

  // ---------------------------------------------------------------------------
  // Fetch
  // ---------------------------------------------------------------------------

  /// Fetches paginated notifications for the authenticated user.
  Future<PaginatedResponse<AppNotification>> getNotifications({
    int page = 1,
    int limit = 20,
  }) async {
    final response = await _apiClient.get<Map<String, dynamic>>(
      '/api/v1/notifications',
      queryParameters: {'page': page, 'limit': limit},
    );
    final body = response.data;
    if (body == null) {
      return const PaginatedResponse<AppNotification>(
        data: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 1,
      );
    }
    return PaginatedResponse<AppNotification>.fromJson(
      body,
      (json) => AppNotification.fromJson(json),
    );
  }

  /// Fetches the count of unread notifications.
  Future<int> getUnreadCount() async {
    final response = await _apiClient.get<Map<String, dynamic>>(
      '/api/v1/notifications/unread-count',
    );
    final body = response.data;
    return body?['data']?['count'] as int? ?? 0;
  }

  // ---------------------------------------------------------------------------
  // Mark as read
  // ---------------------------------------------------------------------------

  /// Marks a single notification as read.
  Future<void> markAsRead(String notificationId) async {
    await _apiClient.put('/api/v1/notifications/$notificationId/read');
  }

  /// Marks all notifications as read.
  Future<void> markAllAsRead() async {
    await _apiClient.put('/api/v1/notifications/read-all');
  }

  // ---------------------------------------------------------------------------
  // Delete
  // ---------------------------------------------------------------------------

  /// Deletes a notification.
  Future<void> deleteNotification(String notificationId) async {
    await _apiClient.delete('/api/v1/notifications/$notificationId');
  }

  // ---------------------------------------------------------------------------
  // Settings
  // ---------------------------------------------------------------------------

  /// Fetches the user's notification preferences.
  Future<Map<String, bool>> getSettings() async {
    final response = await _apiClient.get<Map<String, dynamic>>(
      '/api/v1/notifications/settings',
    );
    final body = response.data;
    final data = body?['data'] as Map<String, dynamic>? ?? {};
    return data.map((k, v) => MapEntry(k, v as bool? ?? true));
  }

  /// Updates the user's notification preferences.
  Future<void> updateSettings(Map<String, bool> settings) async {
    await _apiClient.put(
      '/api/v1/notifications/settings',
      data: settings,
    );
  }
}

// ---------------------------------------------------------------------------
// Riverpod provider
// ---------------------------------------------------------------------------

final notificationRepositoryProvider = Provider<NotificationRepository>((ref) {
  final apiClient = ref.watch(apiClientProvider);
  return NotificationRepository(apiClient: apiClient);
});
