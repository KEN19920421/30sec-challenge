/// Domain entity representing a comment on a submission.
class Comment {
  final String id;
  final String userId;
  final String submissionId;
  final String content;
  final String? parentId;
  final DateTime createdAt;
  final String? username;
  final String? displayName;
  final String? avatarUrl;
  final int replyCount;
  final bool isDeleted;

  const Comment({
    required this.id,
    required this.userId,
    required this.submissionId,
    required this.content,
    this.parentId,
    required this.createdAt,
    this.username,
    this.displayName,
    this.avatarUrl,
    this.replyCount = 0,
    this.isDeleted = false,
  });

  /// Parse from JSON, handling both snake_case and camelCase keys.
  factory Comment.fromJson(Map<String, dynamic> json) {
    return Comment(
      id: json['id'] as String,
      userId: (json['user_id'] ?? json['userId']) as String,
      submissionId: (json['submission_id'] ?? json['submissionId']) as String,
      content: json['content'] as String,
      parentId: (json['parent_id'] ?? json['parentId']) as String?,
      createdAt: DateTime.parse(
        (json['created_at'] ?? json['createdAt']) as String,
      ),
      username: json['username'] as String?,
      displayName: (json['display_name'] ?? json['displayName']) as String?,
      avatarUrl: (json['avatar_url'] ?? json['avatarUrl']) as String?,
      replyCount:
          (json['reply_count'] ?? json['replyCount']) as int? ?? 0,
      isDeleted:
          (json['is_deleted'] ?? json['isDeleted'] ?? json['deleted_at'] != null)
              as bool? ??
          false,
    );
  }

  /// Serialize to JSON using snake_case keys.
  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'user_id': userId,
      'submission_id': submissionId,
      'content': content,
      'parent_id': parentId,
      'created_at': createdAt.toIso8601String(),
      'username': username,
      'display_name': displayName,
      'avatar_url': avatarUrl,
      'reply_count': replyCount,
      'is_deleted': isDeleted,
    };
  }

  /// Creates a copy of this comment with the given fields replaced.
  Comment copyWith({
    String? id,
    String? userId,
    String? submissionId,
    String? content,
    String? parentId,
    DateTime? createdAt,
    String? username,
    String? displayName,
    String? avatarUrl,
    int? replyCount,
    bool? isDeleted,
  }) {
    return Comment(
      id: id ?? this.id,
      userId: userId ?? this.userId,
      submissionId: submissionId ?? this.submissionId,
      content: content ?? this.content,
      parentId: parentId ?? this.parentId,
      createdAt: createdAt ?? this.createdAt,
      username: username ?? this.username,
      displayName: displayName ?? this.displayName,
      avatarUrl: avatarUrl ?? this.avatarUrl,
      replyCount: replyCount ?? this.replyCount,
      isDeleted: isDeleted ?? this.isDeleted,
    );
  }

  /// Returns the display name, falling back to username, then 'Anonymous'.
  String get displayNameOrUsername => displayName ?? username ?? 'Anonymous';

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is Comment && runtimeType == other.runtimeType && id == other.id;

  @override
  int get hashCode => id.hashCode;

  @override
  String toString() => 'Comment(id: $id, userId: $userId, content: $content)';
}
