import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../../../core/network/api_response.dart';
import '../domain/comment.dart';

/// Repository handling all comment-related API communication.
class CommentRepository {
  final ApiClient _apiClient;

  CommentRepository({required ApiClient apiClient}) : _apiClient = apiClient;

  /// Fetch paginated comments for a submission.
  Future<PaginatedResponse<Comment>> getComments(
    String submissionId, {
    int page = 1,
  }) async {
    final response = await _apiClient.get<Map<String, dynamic>>(
      '/api/v1/comments/submission/$submissionId',
      queryParameters: {'page': page, 'limit': 20},
    );

    final body = response.data;
    if (body == null) {
      return const PaginatedResponse<Comment>(
        data: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 1,
      );
    }

    return PaginatedResponse<Comment>.fromJson(
      body,
      (json) => Comment.fromJson(json),
    );
  }

  /// Create a new comment (optionally a reply to another comment).
  Future<Comment> createComment(
    String submissionId,
    String content, {
    String? parentId,
  }) async {
    final response = await _apiClient.post<Map<String, dynamic>>(
      '/api/v1/comments',
      data: {
        'submission_id': submissionId,
        'content': content,
        if (parentId != null) 'parent_id': parentId,
      },
    );

    final body = response.data!;
    return Comment.fromJson(body['data'] as Map<String, dynamic>);
  }

  /// Delete a comment by its ID.
  Future<void> deleteComment(String id) async {
    await _apiClient.delete('/api/v1/comments/$id');
  }

  /// Fetch paginated replies for a given comment.
  Future<PaginatedResponse<Comment>> getReplies(
    String commentId, {
    int page = 1,
  }) async {
    final response = await _apiClient.get<Map<String, dynamic>>(
      '/api/v1/comments/$commentId/replies',
      queryParameters: {'page': page, 'limit': 20},
    );

    final body = response.data;
    if (body == null) {
      return const PaginatedResponse<Comment>(
        data: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 1,
      );
    }

    return PaginatedResponse<Comment>.fromJson(
      body,
      (json) => Comment.fromJson(json),
    );
  }
}

/// Provides the [CommentRepository] singleton.
final commentRepositoryProvider = Provider<CommentRepository>((ref) {
  return CommentRepository(apiClient: ref.watch(apiClientProvider));
});
