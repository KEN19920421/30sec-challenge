import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../data/notification_repository.dart';
import '../../domain/app_notification.dart';

// =============================================================================
// Notification State
// =============================================================================

enum NotificationStatus { initial, loading, loaded, error }

class NotificationState {
  final NotificationStatus status;
  final List<AppNotification> notifications;
  final bool hasMore;
  final int currentPage;
  final String? errorMessage;

  const NotificationState({
    this.status = NotificationStatus.initial,
    this.notifications = const [],
    this.hasMore = true,
    this.currentPage = 0,
    this.errorMessage,
  });

  bool get isLoading => status == NotificationStatus.loading;

  NotificationState copyWith({
    NotificationStatus? status,
    List<AppNotification>? notifications,
    bool? hasMore,
    int? currentPage,
    String? errorMessage,
  }) {
    return NotificationState(
      status: status ?? this.status,
      notifications: notifications ?? this.notifications,
      hasMore: hasMore ?? this.hasMore,
      currentPage: currentPage ?? this.currentPage,
      errorMessage: errorMessage ?? this.errorMessage,
    );
  }
}

// =============================================================================
// Notification Notifier
// =============================================================================

class NotificationNotifier extends StateNotifier<NotificationState> {
  final NotificationRepository _repository;

  NotificationNotifier({required NotificationRepository repository})
      : _repository = repository,
        super(const NotificationState());

  /// Loads the first page of notifications.
  Future<void> loadNotifications() async {
    state = state.copyWith(status: NotificationStatus.loading);
    try {
      final page = await _repository.getNotifications(page: 1);
      state = state.copyWith(
        status: NotificationStatus.loaded,
        notifications: page.data,
        hasMore: page.hasNextPage,
        currentPage: 1,
      );
    } catch (e) {
      state = state.copyWith(
        status: NotificationStatus.error,
        errorMessage: e.toString(),
      );
    }
  }

  /// Loads the next page.
  Future<void> loadMore() async {
    if (!state.hasMore || state.isLoading) return;
    try {
      final nextPage = state.currentPage + 1;
      final page = await _repository.getNotifications(page: nextPage);
      state = state.copyWith(
        notifications: [...state.notifications, ...page.data],
        hasMore: page.hasNextPage,
        currentPage: nextPage,
      );
    } catch (_) {}
  }

  /// Marks a single notification as read.
  Future<void> markAsRead(String notificationId) async {
    try {
      await _repository.markAsRead(notificationId);
      final updated = state.notifications.map((n) {
        if (n.id == notificationId) return n.copyWith(isRead: true);
        return n;
      }).toList();
      state = state.copyWith(notifications: updated);
    } catch (_) {}
  }

  /// Marks all notifications as read.
  Future<void> markAllAsRead() async {
    try {
      await _repository.markAllAsRead();
      final updated = state.notifications
          .map((n) => n.copyWith(isRead: true))
          .toList();
      state = state.copyWith(notifications: updated);
    } catch (_) {}
  }

  /// Deletes a notification.
  Future<void> deleteNotification(String notificationId) async {
    try {
      await _repository.deleteNotification(notificationId);
      final updated =
          state.notifications.where((n) => n.id != notificationId).toList();
      state = state.copyWith(notifications: updated);
    } catch (_) {}
  }
}

// =============================================================================
// Riverpod Providers
// =============================================================================

final notificationProvider =
    StateNotifierProvider<NotificationNotifier, NotificationState>((ref) {
  return NotificationNotifier(
    repository: ref.watch(notificationRepositoryProvider),
  );
});

/// Provides the unread notification count with periodic refresh.
final unreadCountProvider = StateNotifierProvider<UnreadCountNotifier, int>(
  (ref) {
    final notifier = UnreadCountNotifier(
      repository: ref.watch(notificationRepositoryProvider),
    );
    notifier.refresh();
    return notifier;
  },
);

class UnreadCountNotifier extends StateNotifier<int> {
  final NotificationRepository _repository;
  Timer? _timer;

  UnreadCountNotifier({required NotificationRepository repository})
      : _repository = repository,
        super(0) {
    // Poll every 30 seconds.
    _timer = Timer.periodic(
      const Duration(seconds: 30),
      (_) => refresh(),
    );
  }

  Future<void> refresh() async {
    try {
      final count = await _repository.getUnreadCount();
      if (mounted) state = count;
    } catch (_) {}
  }

  void decrement() {
    if (state > 0) state = state - 1;
  }

  void reset() {
    state = 0;
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }
}
