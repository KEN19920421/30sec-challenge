import '../../../../core/network/api_response.dart';
import '../../../challenge/domain/submission.dart';

/// Abstract contract for feed data operations.
///
/// The data layer provides [FeedRepositoryImpl] which handles API
/// communication via [ApiClient].
abstract class FeedRepository {
  /// Fetch the list of currently trending submissions.
  Future<List<Submission>> getTrending({int limit = 10});

  /// Fetch a paginated list of "For You" submissions with optional filters.
  Future<PaginatedResponse<Submission>> getSubmissions({
    int page = 1,
    int limit = 20,
    String? category,
    String? search,
  });
}
