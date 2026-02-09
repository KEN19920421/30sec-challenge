import 'dart:async';
import 'dart:io';

import 'package:camera/camera.dart';
import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/constants/app_constants.dart';
import '../../../challenge/data/submission_repository.dart';
import '../../../challenge/domain/submission.dart';

// =============================================================================
// Recording state
// =============================================================================

/// Sealed state hierarchy for the recording flow.
///
/// Transitions:
///   idle -> initializing -> ready -> recording -> recorded -> uploading -> uploaded
///   Any state can transition to error.
sealed class RecordingState {
  const RecordingState();
}

/// Camera has not been initialized yet.
class RecordingIdle extends RecordingState {
  const RecordingIdle();
}

/// Camera is being initialized.
class RecordingInitializing extends RecordingState {
  const RecordingInitializing();
}

/// Camera is initialized and ready to record.
class RecordingReady extends RecordingState {
  final CameraController controller;
  final bool isFlashOn;
  final bool isFrontCamera;

  const RecordingReady({
    required this.controller,
    this.isFlashOn = false,
    this.isFrontCamera = true,
  });
}

/// Actively recording video.
class RecordingInProgress extends RecordingState {
  final CameraController controller;
  final Duration elapsed;
  final int maxDurationSeconds;
  final bool isFlashOn;

  const RecordingInProgress({
    required this.controller,
    required this.elapsed,
    this.maxDurationSeconds = AppConstants.maxVideoDurationSeconds,
    this.isFlashOn = false,
  });

  /// Progress from 0.0 to 1.0.
  double get progress =>
      elapsed.inMilliseconds / (maxDurationSeconds * 1000);

  String get elapsedText {
    final secs = elapsed.inSeconds;
    final millis = ((elapsed.inMilliseconds % 1000) / 100).floor();
    return '${secs.toString().padLeft(2, '0')}.${millis}s';
  }
}

/// Recording is done; the video file is saved locally.
class RecordingCompleted extends RecordingState {
  final String filePath;
  final Duration duration;

  const RecordingCompleted({
    required this.filePath,
    required this.duration,
  });
}

/// The video is being uploaded.
class RecordingUploading extends RecordingState {
  final String filePath;
  final double progress; // 0.0 - 1.0
  final String? submissionId;

  const RecordingUploading({
    required this.filePath,
    this.progress = 0.0,
    this.submissionId,
  });

  int get progressPercent => (progress * 100).round();
}

/// Upload completed successfully.
class RecordingUploaded extends RecordingState {
  final Submission submission;

  const RecordingUploaded({required this.submission});
}

/// An error occurred at any point in the flow.
class RecordingError extends RecordingState {
  final String message;
  final RecordingState? previousState;

  const RecordingError({
    required this.message,
    this.previousState,
  });
}

// =============================================================================
// Recording notifier
// =============================================================================

class RecordingNotifier extends StateNotifier<RecordingState> {
  final SubmissionRepository _submissionRepo;
  final String challengeId;

  CameraController? _controller;
  List<CameraDescription> _cameras = [];
  Timer? _recordingTimer;
  DateTime? _recordingStartTime;
  bool _isFrontCamera = true;
  bool _isFlashOn = false;
  CancelToken? _uploadCancelToken;

  RecordingNotifier({
    required SubmissionRepository submissionRepository,
    required this.challengeId,
  })  : _submissionRepo = submissionRepository,
        super(const RecordingIdle());

  @override
  void dispose() {
    _recordingTimer?.cancel();
    _controller?.dispose();
    _uploadCancelToken?.cancel();
    super.dispose();
  }

  // ---------------------------------------------------------------------------
  // Camera initialization
  // ---------------------------------------------------------------------------

  Future<void> initCamera() async {
    state = const RecordingInitializing();

    try {
      _cameras = await availableCameras();
      if (_cameras.isEmpty) {
        state = const RecordingError(message: 'No cameras available.');
        return;
      }

      // Default to front camera.
      final camera = _cameras.firstWhere(
        (c) => c.lensDirection == CameraLensDirection.front,
        orElse: () => _cameras.first,
      );
      _isFrontCamera = camera.lensDirection == CameraLensDirection.front;

      await _initController(camera);
    } catch (e) {
      state = RecordingError(message: 'Failed to initialize camera: $e');
    }
  }

  Future<void> _initController(CameraDescription camera) async {
    _controller?.dispose();

    _controller = CameraController(
      camera,
      ResolutionPreset.high,
      enableAudio: true,
      imageFormatGroup: ImageFormatGroup.yuv420,
    );

    await _controller!.initialize();
    await _controller!.prepareForVideoRecording();

    // Set flash off by default.
    _isFlashOn = false;
    await _controller!.setFlashMode(FlashMode.off);

    if (mounted) {
      state = RecordingReady(
        controller: _controller!,
        isFlashOn: _isFlashOn,
        isFrontCamera: _isFrontCamera,
      );
    }
  }

  // ---------------------------------------------------------------------------
  // Camera controls
  // ---------------------------------------------------------------------------

  Future<void> toggleFlash() async {
    if (_controller == null) return;

    _isFlashOn = !_isFlashOn;
    await _controller!
        .setFlashMode(_isFlashOn ? FlashMode.torch : FlashMode.off);

    final current = state;
    if (current is RecordingReady) {
      state = RecordingReady(
        controller: _controller!,
        isFlashOn: _isFlashOn,
        isFrontCamera: _isFrontCamera,
      );
    } else if (current is RecordingInProgress) {
      state = RecordingInProgress(
        controller: _controller!,
        elapsed: current.elapsed,
        isFlashOn: _isFlashOn,
      );
    }
  }

  Future<void> flipCamera() async {
    if (state is! RecordingReady || _cameras.length < 2) return;

    _isFrontCamera = !_isFrontCamera;
    final camera = _cameras.firstWhere(
      (c) =>
          c.lensDirection ==
          (_isFrontCamera
              ? CameraLensDirection.front
              : CameraLensDirection.back),
      orElse: () => _cameras.first,
    );

    state = const RecordingInitializing();
    await _initController(camera);
  }

  // ---------------------------------------------------------------------------
  // Recording
  // ---------------------------------------------------------------------------

  Future<void> startRecording() async {
    if (_controller == null || state is! RecordingReady) return;

    try {
      await _controller!.startVideoRecording();
      _recordingStartTime = DateTime.now();

      state = RecordingInProgress(
        controller: _controller!,
        elapsed: Duration.zero,
        isFlashOn: _isFlashOn,
      );

      // Timer that updates elapsed every 100ms and auto-stops at max duration.
      _recordingTimer = Timer.periodic(
        const Duration(milliseconds: 100),
        (_) {
          if (_recordingStartTime == null) return;

          final elapsed = DateTime.now().difference(_recordingStartTime!);

          if (elapsed.inSeconds >= AppConstants.maxVideoDurationSeconds) {
            stopRecording();
            return;
          }

          if (mounted && state is RecordingInProgress) {
            state = RecordingInProgress(
              controller: _controller!,
              elapsed: elapsed,
              isFlashOn: _isFlashOn,
            );
          }
        },
      );
    } catch (e) {
      state = RecordingError(message: 'Failed to start recording: $e');
    }
  }

  Future<void> stopRecording() async {
    _recordingTimer?.cancel();
    _recordingTimer = null;

    if (_controller == null || !_controller!.value.isRecordingVideo) return;

    try {
      final file = await _controller!.stopVideoRecording();
      final duration = _recordingStartTime != null
          ? DateTime.now().difference(_recordingStartTime!)
          : Duration.zero;

      _recordingStartTime = null;

      state = RecordingCompleted(
        filePath: file.path,
        duration: duration,
      );
    } catch (e) {
      state = RecordingError(message: 'Failed to stop recording: $e');
    }
  }

  // ---------------------------------------------------------------------------
  // Retake
  // ---------------------------------------------------------------------------

  Future<void> retake() async {
    // Delete the recorded file if it exists.
    final current = state;
    if (current is RecordingCompleted) {
      try {
        final file = File(current.filePath);
        if (await file.exists()) {
          await file.delete();
        }
      } catch (_) {
        // Ignore cleanup errors.
      }
    }

    // Re-initialize camera.
    if (_controller != null && _controller!.value.isInitialized) {
      state = RecordingReady(
        controller: _controller!,
        isFlashOn: _isFlashOn,
        isFrontCamera: _isFrontCamera,
      );
    } else {
      await initCamera();
    }
  }

  // ---------------------------------------------------------------------------
  // Upload
  // ---------------------------------------------------------------------------

  Future<void> upload({String? caption}) async {
    final current = state;
    if (current is! RecordingCompleted) return;

    _uploadCancelToken = CancelToken();

    state = RecordingUploading(filePath: current.filePath);

    try {
      // Step 1: Initiate upload to get presigned URL.
      final initiation = await _submissionRepo.initiateUpload(
        challengeId: challengeId,
        caption: caption,
        videoDuration: current.duration.inMilliseconds / 1000.0,
      );

      state = RecordingUploading(
        filePath: current.filePath,
        progress: 0.05, // 5% for initiation.
        submissionId: initiation.submissionId,
      );

      // Step 2: Upload file to presigned URL.
      await _submissionRepo.uploadToPresignedUrl(
        uploadUrl: initiation.uploadUrl,
        filePath: current.filePath,
        onProgress: (sent, total) {
          if (total > 0 && mounted) {
            // Scale upload progress from 5% to 90%.
            final uploadProgress = sent / total;
            state = RecordingUploading(
              filePath: current.filePath,
              progress: 0.05 + (uploadProgress * 0.85),
              submissionId: initiation.submissionId,
            );
          }
        },
        cancelToken: _uploadCancelToken,
      );

      state = RecordingUploading(
        filePath: current.filePath,
        progress: 0.92,
        submissionId: initiation.submissionId,
      );

      // Step 3: Notify server that upload is complete.
      final submission = await _submissionRepo.completeUpload(
        initiation.submissionId,
      );

      state = RecordingUploaded(submission: submission);
    } on DioException catch (e) {
      if (e.type == DioExceptionType.cancel) {
        state = RecordingCompleted(
          filePath: current.filePath,
          duration: current.duration,
        );
        return;
      }
      state = RecordingError(
        message: 'Upload failed: ${e.message}',
        previousState: current,
      );
    } catch (e) {
      state = RecordingError(
        message: 'Upload failed: $e',
        previousState: current,
      );
    }
  }

  /// Cancels an in-progress upload.
  void cancelUpload() {
    _uploadCancelToken?.cancel('User cancelled upload');
  }

  /// Resets the state back to idle for a clean restart.
  void reset() {
    _recordingTimer?.cancel();
    _uploadCancelToken?.cancel();
    _controller?.dispose();
    _controller = null;
    state = const RecordingIdle();
  }
}

// =============================================================================
// Providers
// =============================================================================

/// Provides a [RecordingNotifier] scoped to a specific challenge.
///
/// Usage:
/// ```dart
/// final notifier = ref.read(recordingProvider(challengeId).notifier);
/// ```
final recordingProvider = StateNotifierProvider.autoDispose
    .family<RecordingNotifier, RecordingState, String>(
  (ref, challengeId) {
    final submissionRepo = ref.watch(submissionRepositoryProvider);
    return RecordingNotifier(
      submissionRepository: submissionRepo,
      challengeId: challengeId,
    );
  },
);
