/// Generic wrapper for standard API JSON responses.
///
/// The backend is expected to return JSON in the shape:
/// ```json
/// {
///   "success": true,
///   "data": { ... },
///   "message": "OK"
/// }
/// ```
class ApiResponse<T> {
  final bool success;
  final T? data;
  final String? message;

  const ApiResponse({
    required this.success,
    this.data,
    this.message,
  });

  /// Parse a raw JSON map into an [ApiResponse].
  ///
  /// [fromJson] converts the `data` field into the desired type [T].
  factory ApiResponse.fromJson(
    Map<String, dynamic> json,
    T Function(dynamic json)? fromJson,
  ) {
    return ApiResponse<T>(
      success: json['success'] as bool? ?? true,
      data: json['data'] != null && fromJson != null
          ? fromJson(json['data'])
          : json['data'] as T?,
      message: json['message'] as String?,
    );
  }
}

/// Wrapper for paginated list responses.
///
/// Expected backend shape:
/// ```json
/// {
///   "success": true,
///   "data": [ ... ],
///   "meta": {
///     "total": 100,
///     "page": 1,
///     "limit": 20,
///     "totalPages": 5
///   }
/// }
/// ```
class PaginatedResponse<T> {
  final List<T> data;
  final int total;
  final int page;
  final int limit;
  final int totalPages;

  const PaginatedResponse({
    required this.data,
    required this.total,
    required this.page,
    required this.limit,
    required this.totalPages,
  });

  /// Whether more pages exist after the current one.
  bool get hasNextPage => page < totalPages;

  /// Whether there is a previous page.
  bool get hasPreviousPage => page > 1;

  /// The next page number, or null if this is the last page.
  int? get nextPage => hasNextPage ? page + 1 : null;

  /// Parse a raw JSON map into a [PaginatedResponse].
  ///
  /// [fromJson] converts each item in the `data` array into type [T].
  factory PaginatedResponse.fromJson(
    Map<String, dynamic> json,
    T Function(Map<String, dynamic> json) fromJson,
  ) {
    final meta = json['meta'] as Map<String, dynamic>? ?? {};
    final rawData = json['data'] as List<dynamic>? ?? [];

    return PaginatedResponse<T>(
      data: rawData
          .map((item) => fromJson(item as Map<String, dynamic>))
          .toList(),
      total: meta['total'] as int? ?? 0,
      page: meta['page'] as int? ?? 1,
      limit: meta['limit'] as int? ?? 20,
      totalPages: meta['totalPages'] as int? ?? 1,
    );
  }
}
