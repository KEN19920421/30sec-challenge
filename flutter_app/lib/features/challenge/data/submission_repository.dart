import 'dart:io';

import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../../../core/network/api_response.dart';
import '../domain/submission.dart';

/// Data class returned by [SubmissionRepository.initiateUpload].
///
/// Contains the presigned upload URL and the server-generated submission ID.
class UploadInitiation {
  final String uploadUrl;
  final String submissionId;

  const UploadInitiation({
    required this.uploadUrl,
    required this.submissionId,
  });

  factory UploadInitiation.fromJson(Map<String, dynamic> json) {
    return UploadInitiation(
      uploadUrl: json['upload_url'] as String? ?? json['uploadUrl'] as String,
      submissionId:
          json['submission_id'] as String? ?? json['submissionId'] as String,
    );
  }
}

/// Repository handling all submission-related API communication.
///
/// The upload flow is:
/// 1. [initiateUpload] -> receive presigned URL + submission ID.
/// 2. Upload the video file directly to the presigned URL (S3/GCS).
/// 3. [completeUpload] -> notify the server that the upload is done.
class SubmissionRepository {
  final ApiClient _apiClient;

  SubmissionRepository({required ApiClient apiClient})
      : _apiClient = apiClient;

  // ---------------------------------------------------------------------------
  // Upload flow
  // ---------------------------------------------------------------------------

  /// Step 1: Initiate the upload to get a presigned URL and submission ID.
  Future<UploadInitiation> initiateUpload({
    required String challengeId,
    String? caption,
    double? videoDuration,
  }) async {
    final response = await _apiClient.post<Map<String, dynamic>>(
      '/api/v1/submissions/initiate',
      data: {
        'challengeId': challengeId,
        if (caption != null) 'caption': caption,
        if (videoDuration != null) 'videoDuration': videoDuration,
      },
    );

    final body = response.data!;
    final apiResp = ApiResponse<UploadInitiation>.fromJson(
      body,
      (data) => UploadInitiation.fromJson(data as Map<String, dynamic>),
    );
    return apiResp.data!;
  }

  /// Step 2: Upload the video file to the presigned URL.
  ///
  /// Uses a separate [Dio] instance since the presigned URL is external
  /// (e.g., S3 or GCS) and should not carry the app's auth headers.
  Future<void> uploadToPresignedUrl({
    required String uploadUrl,
    required String filePath,
    void Function(int sent, int total)? onProgress,
    CancelToken? cancelToken,
  }) async {
    final file = File(filePath);
    final fileLength = await file.length();

    // Use a clean Dio instance (no auth interceptors).
    final uploadDio = Dio(
      BaseOptions(
        connectTimeout: const Duration(seconds: 30),
        receiveTimeout: const Duration(minutes: 5),
        sendTimeout: const Duration(minutes: 5),
      ),
    );

    await uploadDio.put(
      uploadUrl,
      data: file.openRead(),
      options: Options(
        contentType: 'video/mp4',
        headers: {
          Headers.contentLengthHeader: fileLength,
        },
      ),
      onSendProgress: onProgress,
      cancelToken: cancelToken,
    );
  }

  /// Step 3: Notify the server that the upload is complete.
  Future<Submission> completeUpload(String submissionId) async {
    final response = await _apiClient.post<Map<String, dynamic>>(
      '/api/v1/submissions/$submissionId/complete',
    );

    final body = response.data!;
    final apiResp = ApiResponse<Submission>.fromJson(
      body,
      (data) => Submission.fromJson(data as Map<String, dynamic>),
    );
    return apiResp.data!;
  }

  // ---------------------------------------------------------------------------
  // CRUD
  // ---------------------------------------------------------------------------

  /// Fetches a single submission by its [id].
  Future<Submission> getById(String id) async {
    final response = await _apiClient.get<Map<String, dynamic>>(
      '/api/v1/submissions/$id',
    );
    final body = response.data!;
    final apiResp = ApiResponse<Submission>.fromJson(
      body,
      (data) => Submission.fromJson(data as Map<String, dynamic>),
    );
    return apiResp.data!;
  }

  /// Fetches all submissions by the current user, optionally filtered by
  /// [challengeId].
  Future<List<Submission>> getUserSubmissions({String? challengeId}) async {
    final queryParams = <String, dynamic>{};
    if (challengeId != null) {
      queryParams['challengeId'] = challengeId;
    }

    final response = await _apiClient.get<Map<String, dynamic>>(
      '/api/v1/submissions/mine',
      queryParameters: queryParams,
    );
    final body = response.data;
    if (body == null) return [];

    final list = body['data'] as List<dynamic>? ?? [];
    return list
        .map((item) => Submission.fromJson(item as Map<String, dynamic>))
        .toList();
  }

  /// Deletes a submission. Only allowed if the user owns it and the challenge
  /// is still active.
  Future<void> delete(String id) async {
    await _apiClient.delete('/api/v1/submissions/$id');
  }
}

// ---------------------------------------------------------------------------
// Riverpod provider
// ---------------------------------------------------------------------------

final submissionRepositoryProvider = Provider<SubmissionRepository>((ref) {
  final apiClient = ref.watch(apiClientProvider);
  return SubmissionRepository(apiClient: apiClient);
});
