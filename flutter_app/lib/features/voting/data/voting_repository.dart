import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../../../core/network/api_response.dart';
import '../../challenge/domain/submission.dart';
import '../domain/vote.dart';

/// Repository for all voting-related API operations.
///
/// Handles fetching the vote queue, casting votes, and managing super vote
/// balance. All methods throw [AppException] subclasses on failure.
class VotingRepository {
  final ApiClient _apiClient;

  VotingRepository({required ApiClient apiClient}) : _apiClient = apiClient;

  // ---------------------------------------------------------------------------
  // Vote Queue
  // ---------------------------------------------------------------------------

  /// Fetches the next batch of submissions for the user to vote on.
  ///
  /// Returns a list of [Submission] objects with video URLs ready for playback.
  /// The backend ensures the user has not already voted on these submissions.
  Future<List<Submission>> getVoteQueue({
    required String challengeId,
    int limit = 10,
  }) async {
    final response = await _apiClient.get<Map<String, dynamic>>(
      '/api/v1/voting/queue',
      queryParameters: {
        'challenge_id': challengeId,
        'limit': limit,
      },
    );

    final apiResponse = ApiResponse<List<Submission>>.fromJson(
      response.data!,
      (data) {
        final list = data as List<dynamic>;
        return list
            .map((item) => Submission.fromJson(item as Map<String, dynamic>))
            .toList();
      },
    );

    return apiResponse.data ?? [];
  }

  // ---------------------------------------------------------------------------
  // Cast Vote
  // ---------------------------------------------------------------------------

  /// Casts a vote on a submission.
  ///
  /// [submissionId] is the ID of the submission being voted on.
  /// [value] is 1 for upvote or -1 for downvote.
  /// [isSuperVote] marks this as a super vote (counts 3x in rankings).
  ///
  /// Returns the created [Vote] object.
  Future<Vote> castVote({
    required String submissionId,
    required int value,
    bool isSuperVote = false,
  }) async {
    final response = await _apiClient.post<Map<String, dynamic>>(
      '/api/v1/voting',
      data: {
        'submission_id': submissionId,
        'value': value,
        if (isSuperVote) 'is_super_vote': true,
      },
    );

    final apiResponse = ApiResponse<Vote>.fromJson(
      response.data!,
      (data) => Vote.fromJson(data as Map<String, dynamic>),
    );

    return apiResponse.data!;
  }

  // ---------------------------------------------------------------------------
  // Super Vote Balance
  // ---------------------------------------------------------------------------

  /// Retrieves the user's current super vote balance.
  ///
  /// Returns [SuperVoteBalance] with remaining count and daily maximum.
  Future<SuperVoteBalance> getSuperVoteBalance() async {
    final response = await _apiClient.get<Map<String, dynamic>>(
      '/api/v1/voting/super-votes/balance',
    );

    final apiResponse = ApiResponse<SuperVoteBalance>.fromJson(
      response.data!,
      (data) => SuperVoteBalance.fromJson(data as Map<String, dynamic>),
    );

    return apiResponse.data!;
  }
}

// ---------------------------------------------------------------------------
// Riverpod provider
// ---------------------------------------------------------------------------

/// Provides the singleton [VotingRepository].
final votingRepositoryProvider = Provider<VotingRepository>((ref) {
  final apiClient = ref.watch(apiClientProvider);
  return VotingRepository(apiClient: apiClient);
});
