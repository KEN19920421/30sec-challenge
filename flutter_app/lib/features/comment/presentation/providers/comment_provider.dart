import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../data/comment_repository.dart';
import '../../domain/comment.dart';

// =============================================================================
// Comments State
// =============================================================================

/// Immutable state snapshot for a submission's comment list.
class CommentsState {
  final List<Comment> comments;
  final bool isLoading;
  final bool hasMore;
  final int currentPage;
  final bool isSubmitting;
  final String? errorMessage;

  const CommentsState({
    this.comments = const [],
    this.isLoading = false,
    this.hasMore = true,
    this.currentPage = 0,
    this.isSubmitting = false,
    this.errorMessage,
  });

  CommentsState copyWith({
    List<Comment>? comments,
    bool? isLoading,
    bool? hasMore,
    int? currentPage,
    bool? isSubmitting,
    String? errorMessage,
  }) {
    return CommentsState(
      comments: comments ?? this.comments,
      isLoading: isLoading ?? this.isLoading,
      hasMore: hasMore ?? this.hasMore,
      currentPage: currentPage ?? this.currentPage,
      isSubmitting: isSubmitting ?? this.isSubmitting,
      errorMessage: errorMessage,
    );
  }
}

// =============================================================================
// Comments Notifier
// =============================================================================

/// Manages the comment list state for a specific submission.
class CommentsNotifier extends StateNotifier<CommentsState> {
  final CommentRepository _repository;
  final String submissionId;

  CommentsNotifier({
    required CommentRepository repository,
    required this.submissionId,
  })  : _repository = repository,
        super(const CommentsState());

  /// Load the first page of comments.
  Future<void> loadInitial() async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      final result = await _repository.getComments(submissionId, page: 1);
      state = state.copyWith(
        comments: result.data,
        isLoading: false,
        hasMore: result.hasNextPage,
        currentPage: 1,
      );
    } catch (e) {
      state = state.copyWith(isLoading: false, errorMessage: e.toString());
    }
  }

  /// Load the next page of comments (pagination).
  Future<void> loadMore() async {
    if (!state.hasMore || state.isLoading) return;
    try {
      final nextPage = state.currentPage + 1;
      final result = await _repository.getComments(
        submissionId,
        page: nextPage,
      );
      state = state.copyWith(
        comments: [...state.comments, ...result.data],
        hasMore: result.hasNextPage,
        currentPage: nextPage,
      );
    } catch (_) {
      // Silently fail — user can scroll again to retry.
    }
  }

  /// Post a new comment (or reply if [parentId] is provided).
  Future<void> addComment(String content, {String? parentId}) async {
    state = state.copyWith(isSubmitting: true, errorMessage: null);
    try {
      final comment = await _repository.createComment(
        submissionId,
        content,
        parentId: parentId,
      );
      state = state.copyWith(
        comments: [comment, ...state.comments],
        isSubmitting: false,
      );
    } catch (e) {
      state = state.copyWith(isSubmitting: false, errorMessage: e.toString());
    }
  }

  /// Delete a comment by its ID.
  Future<void> deleteComment(String commentId) async {
    try {
      await _repository.deleteComment(commentId);
      state = state.copyWith(
        comments: state.comments.where((c) => c.id != commentId).toList(),
      );
    } catch (_) {
      // Silently fail — comment remains visible.
    }
  }
}

// =============================================================================
// Riverpod Provider
// =============================================================================

/// Family provider keyed by submission ID, creating a separate notifier
/// for each submission's comments.
final commentsProvider =
    StateNotifierProvider.family<CommentsNotifier, CommentsState, String>(
  (ref, submissionId) {
    return CommentsNotifier(
      repository: ref.watch(commentRepositoryProvider),
      submissionId: submissionId,
    );
  },
);
