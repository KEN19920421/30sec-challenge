import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../l10n/l10n.dart';
import '../../../auth/presentation/providers/auth_provider.dart';
import '../../domain/comment.dart';

/// Displays a single comment with avatar, username, time, content,
/// reply count, and an optional delete action.
class CommentCard extends ConsumerWidget {
  final Comment comment;
  final VoidCallback? onReply;
  final VoidCallback? onDelete;

  const CommentCard({
    super.key,
    required this.comment,
    this.onReply,
    this.onDelete,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final currentUser = ref.watch(currentUserProvider);
    final isOwner = currentUser?.id == comment.userId;
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Avatar
          _buildAvatar(isDark),
          const SizedBox(width: 12),

          // Content column
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Username + time
                Row(
                  children: [
                    Text(
                      comment.displayNameOrUsername,
                      style: AppTextStyles.bodySmallBold.copyWith(
                        color: isDark
                            ? AppColors.darkOnSurface
                            : AppColors.lightOnSurface,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Text(
                      _timeAgo(comment.createdAt),
                      style: AppTextStyles.caption.copyWith(
                        color: isDark
                            ? AppColors.darkOnSurfaceVariant
                            : AppColors.lightOnSurfaceVariant,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 4),

                // Comment text
                Text(
                  comment.isDeleted
                      ? context.l10n.deletedComment
                      : comment.content,
                  style: AppTextStyles.bodyMedium.copyWith(
                    color: comment.isDeleted
                        ? (isDark
                            ? AppColors.darkDisabled
                            : AppColors.lightDisabled)
                        : (isDark
                            ? AppColors.darkOnSurface
                            : AppColors.lightOnSurface),
                    fontStyle:
                        comment.isDeleted ? FontStyle.italic : FontStyle.normal,
                  ),
                ),
                const SizedBox(height: 6),

                // Actions row: reply count + reply button + delete
                if (!comment.isDeleted)
                  Row(
                    children: [
                      // Reply count
                      if (comment.replyCount > 0) ...[
                        Text(
                          context.l10n.repliesCount(comment.replyCount),
                          style: AppTextStyles.caption.copyWith(
                            color: AppColors.primary,
                          ),
                        ),
                        const SizedBox(width: 16),
                      ],

                      // Reply button
                      if (onReply != null)
                        GestureDetector(
                          onTap: onReply,
                          child: Text(
                            context.l10n.reply,
                            style: AppTextStyles.caption.copyWith(
                              color: isDark
                                  ? AppColors.darkOnSurfaceVariant
                                  : AppColors.lightOnSurfaceVariant,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),

                      const Spacer(),

                      // Delete button (only for comment owner)
                      if (isOwner && onDelete != null)
                        GestureDetector(
                          onTap: onDelete,
                          child: Text(
                            context.l10n.deleteComment,
                            style: AppTextStyles.caption.copyWith(
                              color: AppColors.error,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                    ],
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildAvatar(bool isDark) {
    final name = comment.displayNameOrUsername;
    final firstLetter = name.isNotEmpty ? name[0].toUpperCase() : '?';

    if (comment.avatarUrl != null && comment.avatarUrl!.isNotEmpty) {
      return CircleAvatar(
        radius: 18,
        backgroundImage: NetworkImage(comment.avatarUrl!),
        backgroundColor:
            isDark ? AppColors.darkSurfaceVariant : AppColors.lightSurfaceVariant,
      );
    }

    return CircleAvatar(
      radius: 18,
      backgroundColor: AppColors.primaryLight.withValues(alpha: 0.3),
      child: Text(
        firstLetter,
        style: AppTextStyles.bodyMediumBold.copyWith(
          color: AppColors.primary,
        ),
      ),
    );
  }
}

/// Returns a human-readable relative time string.
String _timeAgo(DateTime dateTime) {
  final diff = DateTime.now().difference(dateTime);
  if (diff.inDays > 365) return '${diff.inDays ~/ 365}y';
  if (diff.inDays > 30) return '${diff.inDays ~/ 30}mo';
  if (diff.inDays > 0) return '${diff.inDays}d';
  if (diff.inHours > 0) return '${diff.inHours}h';
  if (diff.inMinutes > 0) return '${diff.inMinutes}m';
  return 'now';
}
