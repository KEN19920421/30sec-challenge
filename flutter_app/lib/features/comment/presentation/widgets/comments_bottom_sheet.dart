import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../l10n/l10n.dart';
import '../../domain/comment.dart';
import '../providers/comment_provider.dart';
import 'comment_card.dart';
import 'comment_input.dart';

/// A draggable bottom sheet that displays and manages comments for a submission.
///
/// Use [CommentsBottomSheet.show] to present it modally.
class CommentsBottomSheet extends ConsumerStatefulWidget {
  final String submissionId;

  const CommentsBottomSheet({super.key, required this.submissionId});

  /// Convenience method to present the comments sheet.
  static void show(BuildContext context, String submissionId) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.transparent,
      builder: (_) => CommentsBottomSheet(submissionId: submissionId),
    );
  }

  @override
  ConsumerState<CommentsBottomSheet> createState() =>
      _CommentsBottomSheetState();
}

class _CommentsBottomSheetState extends ConsumerState<CommentsBottomSheet> {
  final _scrollController = ScrollController();

  /// The comment being replied to (null = top-level comment).
  Comment? _replyingTo;

  @override
  void initState() {
    super.initState();
    _scrollController.addListener(_onScroll);
    // Load the initial page of comments.
    Future.microtask(() {
      ref.read(commentsProvider(widget.submissionId).notifier).loadInitial();
    });
  }

  @override
  void dispose() {
    _scrollController.removeListener(_onScroll);
    _scrollController.dispose();
    super.dispose();
  }

  void _onScroll() {
    if (_scrollController.position.pixels >=
        _scrollController.position.maxScrollExtent - 200) {
      ref.read(commentsProvider(widget.submissionId).notifier).loadMore();
    }
  }

  void _handleSubmit(String content) {
    ref.read(commentsProvider(widget.submissionId).notifier).addComment(
          content,
          parentId: _replyingTo?.id,
        );
    setState(() => _replyingTo = null);
  }

  void _handleReply(Comment comment) {
    setState(() => _replyingTo = comment);
  }

  void _cancelReply() {
    setState(() => _replyingTo = null);
  }

  void _handleDelete(String commentId) {
    ref.read(commentsProvider(widget.submissionId).notifier).deleteComment(
          commentId,
        );
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(commentsProvider(widget.submissionId));
    final bottomInset = MediaQuery.of(context).viewInsets.bottom;
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return DraggableScrollableSheet(
      initialChildSize: 0.6,
      maxChildSize: 0.9,
      minChildSize: 0.3,
      builder: (context, sheetScrollController) {
        return Container(
          decoration: BoxDecoration(
            color: isDark ? AppColors.darkBackground : AppColors.lightBackground,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
          ),
          child: Column(
            children: [
              // Header: drag handle + title + close
              _buildHeader(context, isDark),

              // Divider
              Divider(
                height: 1,
                color: isDark ? AppColors.darkDivider : AppColors.lightDivider,
              ),

              // Comments list
              Expanded(
                child: state.isLoading && state.comments.isEmpty
                    ? _buildLoading()
                    : state.comments.isEmpty
                        ? _buildEmpty(context, isDark)
                        : _buildCommentList(state, sheetScrollController),
              ),

              // Comment input
              Padding(
                padding: EdgeInsets.only(bottom: bottomInset),
                child: CommentInput(
                  onSubmit: _handleSubmit,
                  replyingToUsername: _replyingTo?.displayNameOrUsername,
                  onCancelReply: _cancelReply,
                  isSubmitting: state.isSubmitting,
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildHeader(BuildContext context, bool isDark) {
    return Column(
      children: [
        // Drag handle
        Center(
          child: Container(
            margin: const EdgeInsets.only(top: 8),
            width: 40,
            height: 4,
            decoration: BoxDecoration(
              color: isDark ? AppColors.darkDisabled : AppColors.lightDisabled,
              borderRadius: BorderRadius.circular(2),
            ),
          ),
        ),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          child: Row(
            children: [
              Text(
                context.l10n.comments,
                style: AppTextStyles.heading4.copyWith(
                  color: isDark
                      ? AppColors.darkOnBackground
                      : AppColors.lightOnBackground,
                ),
              ),
              const Spacer(),
              GestureDetector(
                onTap: () => Navigator.of(context).pop(),
                child: Icon(
                  Icons.close,
                  color: isDark
                      ? AppColors.darkOnSurfaceVariant
                      : AppColors.lightOnSurfaceVariant,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildLoading() {
    return const Center(
      child: CircularProgressIndicator(color: AppColors.primary),
    );
  }

  Widget _buildEmpty(BuildContext context, bool isDark) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            Icons.chat_bubble_outline_rounded,
            size: 48,
            color: isDark ? AppColors.darkDisabled : AppColors.lightDisabled,
          ),
          const SizedBox(height: 12),
          Text(
            context.l10n.noCommentsYet,
            style: AppTextStyles.bodyLargeBold.copyWith(
              color: isDark
                  ? AppColors.darkOnSurfaceVariant
                  : AppColors.lightOnSurfaceVariant,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            context.l10n.beFirstToComment,
            style: AppTextStyles.bodyMedium.copyWith(
              color: isDark ? AppColors.darkDisabled : AppColors.lightDisabled,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCommentList(
    CommentsState state,
    ScrollController sheetScrollController,
  ) {
    return ListView.builder(
      controller: sheetScrollController,
      padding: const EdgeInsets.only(top: 8),
      itemCount: state.comments.length + (state.hasMore ? 1 : 0),
      itemBuilder: (context, index) {
        // Loading indicator at the bottom for pagination
        if (index >= state.comments.length) {
          // Trigger load-more when reaching this item
          Future.microtask(() {
            ref
                .read(commentsProvider(widget.submissionId).notifier)
                .loadMore();
          });
          return const Padding(
            padding: EdgeInsets.all(16),
            child: Center(
              child: SizedBox(
                width: 24,
                height: 24,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  color: AppColors.primary,
                ),
              ),
            ),
          );
        }

        final comment = state.comments[index];
        return CommentCard(
          comment: comment,
          onReply: () => _handleReply(comment),
          onDelete: () => _handleDelete(comment.id),
        );
      },
    );
  }
}
