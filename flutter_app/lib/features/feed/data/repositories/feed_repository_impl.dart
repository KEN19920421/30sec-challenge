import '../../../../core/constants/api_constants.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/network/api_response.dart';
import '../../../challenge/domain/submission.dart';
import '../../domain/repositories/feed_repository.dart';

/// Concrete implementation of [FeedRepository].
///
/// Uses [ApiClient] to fetch feed data from the backend API.
class FeedRepositoryImpl implements FeedRepository {
  final ApiClient _apiClient;

  const FeedRepositoryImpl({required ApiClient apiClient})
      : _apiClient = apiClient;

  @override
  Future<List<Submission>> getTrending({int limit = 10}) async {
    final response = await _apiClient.get<Map<String, dynamic>>(
      ApiConstants.feedTrending,
      queryParameters: {'limit': limit},
    );

    final body = response.data;
    if (body == null) return [];

    final list = body['data'] as List<dynamic>? ?? [];
    return list
        .map((item) => Submission.fromJson(item as Map<String, dynamic>))
        .toList();
  }

  @override
  Future<PaginatedResponse<Submission>> getSubmissions({
    int page = 1,
    int limit = 20,
    String? category,
    String? search,
  }) async {
    final queryParams = <String, dynamic>{
      'page': page,
      'limit': limit,
    };

    if (category != null) {
      queryParams['category'] = category;
    }
    if (search != null && search.isNotEmpty) {
      queryParams['search'] = search;
    }

    final response = await _apiClient.get<Map<String, dynamic>>(
      ApiConstants.feedForYou,
      queryParameters: queryParams,
    );

    final body = response.data;
    if (body == null) {
      return PaginatedResponse<Submission>(
        data: const [],
        total: 0,
        page: page,
        limit: limit,
        totalPages: 1,
      );
    }

    return PaginatedResponse<Submission>.fromJson(
      body,
      (json) => Submission.fromJson(json),
    );
  }
}
