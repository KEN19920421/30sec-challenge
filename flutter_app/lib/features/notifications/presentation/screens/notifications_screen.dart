import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:timeago/timeago.dart' as timeago;

import '../../../../core/router/route_names.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../l10n/l10n.dart';
import '../../domain/app_notification.dart';
import '../providers/notification_provider.dart';

/// Notifications list screen with grouping, swipe-to-delete, and pull-to-refresh.
class NotificationsScreen extends ConsumerStatefulWidget {
  const NotificationsScreen({super.key});

  @override
  ConsumerState<NotificationsScreen> createState() =>
      _NotificationsScreenState();
}

class _NotificationsScreenState extends ConsumerState<NotificationsScreen> {
  @override
  void initState() {
    super.initState();
    Future.microtask(
      () => ref.read(notificationProvider.notifier).loadNotifications(),
    );
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(notificationProvider);
    final unreadCount = ref.watch(unreadCountProvider);

    return Scaffold(
      appBar: AppBar(
        title: Text(context.l10n.notifications),
        actions: [
          if (unreadCount > 0)
            TextButton(
              onPressed: () {
                ref.read(notificationProvider.notifier).markAllAsRead();
                ref.read(unreadCountProvider.notifier).reset();
              },
              child: Text(context.l10n.markAllRead),
            ),
        ],
      ),
      body: _buildBody(state),
    );
  }

  Widget _buildBody(NotificationState state) {
    if (state.isLoading && state.notifications.isEmpty) {
      return const Center(
        child: CircularProgressIndicator(color: AppColors.primary),
      );
    }

    if (state.notifications.isEmpty) {
      return _buildEmptyState();
    }

    final grouped = _groupNotifications(state.notifications);

    return RefreshIndicator(
      color: AppColors.primary,
      onRefresh: () =>
          ref.read(notificationProvider.notifier).loadNotifications(),
      child: NotificationListener<ScrollNotification>(
        onNotification: (notification) {
          if (notification is ScrollEndNotification &&
              notification.metrics.extentAfter < 200 &&
              state.hasMore &&
              !state.isLoading) {
            ref.read(notificationProvider.notifier).loadMore();
          }
          return false;
        },
        child: ListView.builder(
          itemCount: grouped.length,
          itemBuilder: (context, index) {
            final item = grouped[index];
            if (item is String) {
              return _GroupHeader(title: item);
            }
            final notification = item as AppNotification;
            return _NotificationTile(
              notification: notification,
              onTap: () => _onNotificationTap(notification),
              onDismissed: () {
                ref
                    .read(notificationProvider.notifier)
                    .deleteNotification(notification.id);
              },
            );
          },
        ),
      ),
    );
  }

  Widget _buildEmptyState() {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            Icons.notifications_none_outlined,
            size: 80,
            color: isDark
                ? AppColors.darkOnSurfaceVariant
                : AppColors.lightOnSurfaceVariant,
          ),
          const SizedBox(height: 16),
          Text(
            'No notifications yet',
            style: AppTextStyles.heading4.copyWith(
              color: isDark
                  ? AppColors.darkOnSurfaceVariant
                  : AppColors.lightOnSurfaceVariant,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'We\'ll notify you when something happens.',
            style: AppTextStyles.bodyMedium.copyWith(
              color: isDark
                  ? AppColors.darkOnSurfaceVariant
                  : AppColors.lightOnSurfaceVariant,
            ),
          ),
        ],
      ),
    );
  }

  /// Groups notifications by date: Today, Yesterday, This Week, Earlier.
  List<dynamic> _groupNotifications(List<AppNotification> notifications) {
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final yesterday = today.subtract(const Duration(days: 1));
    final weekAgo = today.subtract(const Duration(days: 7));

    final result = <dynamic>[];
    String? lastGroup;

    for (final n in notifications) {
      final date = DateTime(n.createdAt.year, n.createdAt.month, n.createdAt.day);
      String group;
      if (date.isAtSameMomentAs(today) || date.isAfter(today)) {
        group = 'Today';
      } else if (date.isAtSameMomentAs(yesterday)) {
        group = 'Yesterday';
      } else if (date.isAfter(weekAgo)) {
        group = 'This Week';
      } else {
        group = 'Earlier';
      }

      if (group != lastGroup) {
        result.add(group);
        lastGroup = group;
      }
      result.add(n);
    }

    return result;
  }

  void _onNotificationTap(AppNotification notification) {
    // Mark as read.
    if (!notification.isRead) {
      ref.read(notificationProvider.notifier).markAsRead(notification.id);
      ref.read(unreadCountProvider.notifier).decrement();
    }

    // Deep link based on type.
    final data = notification.data;
    switch (notification.type) {
      case 'new_follower':
        if (data['userId'] != null) {
          context.pushNamed(
            RouteNames.userProfile,
            pathParameters: {'userId': data['userId'] as String},
          );
        }
        break;
      case 'vote_received':
      case 'gift_received':
      case 'submission_status':
        if (data['submissionId'] != null) {
          context.pushNamed(
            RouteNames.challengeDetail,
            pathParameters: {'id': data['challengeId'] as String? ?? ''},
          );
        }
        break;
      case 'challenge_start':
        if (data['challengeId'] != null) {
          context.pushNamed(
            RouteNames.challengeDetail,
            pathParameters: {'id': data['challengeId'] as String},
          );
        }
        break;
      case 'rank_achieved':
      case 'achievement_earned':
        context.pushNamed(RouteNames.profile);
        break;
      default:
        break;
    }
  }
}

// =============================================================================
// Group Header
// =============================================================================

class _GroupHeader extends StatelessWidget {
  final String title;

  const _GroupHeader({required this.title});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 20, 16, 8),
      child: Text(
        title,
        style: AppTextStyles.bodySmallBold.copyWith(
          color: isDark
              ? AppColors.darkOnSurfaceVariant
              : AppColors.lightOnSurfaceVariant,
        ),
      ),
    );
  }
}

// =============================================================================
// Notification Tile
// =============================================================================

class _NotificationTile extends StatelessWidget {
  final AppNotification notification;
  final VoidCallback? onTap;
  final VoidCallback? onDismissed;

  const _NotificationTile({
    required this.notification,
    this.onTap,
    this.onDismissed,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Dismissible(
      key: Key(notification.id),
      direction: DismissDirection.endToStart,
      onDismissed: (_) => onDismissed?.call(),
      background: Container(
        alignment: Alignment.centerRight,
        padding: const EdgeInsets.only(right: 20),
        color: AppColors.error,
        child: const Icon(Icons.delete_outline, color: Colors.white),
      ),
      child: Material(
        color: notification.isRead
            ? Colors.transparent
            : (isDark
                ? AppColors.primary.withValues(alpha: 0.08)
                : AppColors.primary.withValues(alpha: 0.04)),
        child: InkWell(
          onTap: onTap,
          child: Padding(
            padding:
                const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Type icon
                _buildTypeIcon(),
                const SizedBox(width: 12),

                // Content
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        notification.title,
                        style: AppTextStyles.bodyMediumBold,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                      if (notification.body != null) ...[
                        const SizedBox(height: 4),
                        Text(
                          notification.body!,
                          style: AppTextStyles.bodySmall.copyWith(
                            color: isDark
                                ? AppColors.darkOnSurfaceVariant
                                : AppColors.lightOnSurfaceVariant,
                          ),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                      const SizedBox(height: 4),
                      Text(
                        timeago.format(notification.createdAt),
                        style: AppTextStyles.caption.copyWith(
                          color: isDark
                              ? AppColors.darkOnSurfaceVariant
                              : AppColors.lightOnSurfaceVariant,
                        ),
                      ),
                    ],
                  ),
                ),

                // Unread dot
                if (!notification.isRead) ...[
                  const SizedBox(width: 8),
                  Container(
                    width: 8,
                    height: 8,
                    margin: const EdgeInsets.only(top: 6),
                    decoration: const BoxDecoration(
                      color: AppColors.primary,
                      shape: BoxShape.circle,
                    ),
                  ),
                ],

                // Thumbnail
                if (notification.imageUrl != null) ...[
                  const SizedBox(width: 8),
                  ClipRRect(
                    borderRadius: BorderRadius.circular(8),
                    child: CachedNetworkImage(
                      imageUrl: notification.imageUrl!,
                      width: 48,
                      height: 48,
                      fit: BoxFit.cover,
                    ),
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildTypeIcon() {
    final iconMap = <String, (IconData, Color)>{
      'new_follower': (Icons.person_add, AppColors.info),
      'vote_received': (Icons.favorite, AppColors.error),
      'gift_received': (Icons.card_giftcard, AppColors.accent),
      'challenge_start': (Icons.flag, AppColors.primary),
      'rank_achieved': (Icons.emoji_events, AppColors.gold),
      'achievement_earned': (Icons.military_tech, AppColors.accent),
      'submission_status': (Icons.videocam, AppColors.success),
      'marketing': (Icons.campaign, AppColors.info),
    };

    final entry = iconMap[notification.type] ??
        (Icons.notifications, AppColors.lightOnSurfaceVariant);

    return Container(
      width: 40,
      height: 40,
      decoration: BoxDecoration(
        color: entry.$2.withValues(alpha: 0.15),
        shape: BoxShape.circle,
      ),
      child: Icon(entry.$1, color: entry.$2, size: 20),
    );
  }
}
