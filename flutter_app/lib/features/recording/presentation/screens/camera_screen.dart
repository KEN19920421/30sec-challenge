import 'dart:io';

import 'package:camera/camera.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import 'package:permission_handler/permission_handler.dart';

import '../../../../core/constants/app_constants.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../l10n/l10n.dart';
import '../../../challenge/presentation/providers/challenge_provider.dart';
import '../providers/recording_provider.dart';
import '../widgets/camera_controls.dart';
import '../widgets/recording_timer_ring.dart';

import '../../../../core/services/analytics_service.dart';

/// Full-screen camera recording screen.
///
/// Features:
/// - Camera preview fills the entire screen.
/// - 30-second recording timer displayed as a circular progress ring around
///   the record button.
/// - Record button (red circle) that animates while recording.
/// - Flip camera button (top right) and flash toggle (top left).
/// - Auto-stops at 30 seconds.
/// - Haptic feedback on start/stop.
/// - Timer text showing elapsed time.
/// - Optional duet banner when [duetParentId] is provided.
class CameraScreen extends ConsumerStatefulWidget {
  final String challengeId;
  final String? duetParentId;
  final String? duetParentUsername;

  const CameraScreen({
    super.key,
    required this.challengeId,
    this.duetParentId,
    this.duetParentUsername,
  });

  @override
  ConsumerState<CameraScreen> createState() => _CameraScreenState();
}

class _CameraScreenState extends ConsumerState<CameraScreen>
    with WidgetsBindingObserver {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);

    // Lock to portrait for consistent recording.
    SystemChrome.setPreferredOrientations([
      DeviceOrientation.portraitUp,
    ]);

    // Hide system UI for immersive camera experience.
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);

    // Request permissions, then initialize camera after first frame.
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _requestPermissions();
    });
  }

  Future<void> _requestPermissions() async {
    final cameraStatus = await Permission.camera.request();
    final micStatus = await Permission.microphone.request();

    if (cameraStatus.isPermanentlyDenied || micStatus.isPermanentlyDenied) {
      if (mounted) {
        showDialog<void>(
          context: context,
          builder: (ctx) => AlertDialog(
            title: const Text('Permission Required'),
            content: const Text(
              'Please enable camera and microphone access in Settings to record videos.',
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(ctx),
                child: const Text('Cancel'),
              ),
              TextButton(
                onPressed: () {
                  Navigator.pop(ctx);
                  openAppSettings();
                },
                child: const Text('Open Settings'),
              ),
            ],
          ),
        );
      }
      return;
    }

    if (cameraStatus.isDenied || micStatus.isDenied) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text(
              'Camera and microphone permissions are required to record videos.',
            ),
            duration: Duration(seconds: 3),
          ),
        );
      }
      return;
    }

    // All permissions granted — initialize camera.
    ref.read(recordingProvider(widget.challengeId).notifier).initCamera();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);

    // Restore system UI.
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.edgeToEdge);
    SystemChrome.setPreferredOrientations([]);

    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    // Stop recording if app goes to background.
    if (state == AppLifecycleState.paused) {
      final recordingState =
          ref.read(recordingProvider(widget.challengeId));
      if (recordingState is RecordingInProgress) {
        ref
            .read(recordingProvider(widget.challengeId).notifier)
            .stopRecording();
      }
    }
  }

  void _onClose() {
    ref.read(recordingProvider(widget.challengeId).notifier).reset();
    context.pop();
  }

  Future<void> _onPickFromGallery() async {
    // Request photos permission (iOS) / storage permission (Android <13).
    final Permission galleryPermission =
        Platform.isIOS ? Permission.photos : Permission.storage;
    final status = await galleryPermission.request();

    if (status.isPermanentlyDenied) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text(
              'Gallery access is permanently denied. Enable it in Settings.',
            ),
            duration: Duration(seconds: 3),
          ),
        );
      }
      return;
    }

    if (status.isDenied) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Gallery permission is required to pick a video.'),
            duration: Duration(seconds: 3),
          ),
        );
      }
      return;
    }

    final picker = ImagePicker();
    final video = await picker.pickVideo(
      source: ImageSource.gallery,
      maxDuration: const Duration(seconds: 30),
    );

    if (video != null && mounted) {
      context.push(
        '/record/edit',
        extra: {
          'challengeId': widget.challengeId,
          'filePath': video.path,
        },
      );
    }
  }

  Future<void> _onRecordPressed() async {
    final notifier =
        ref.read(recordingProvider(widget.challengeId).notifier);
    final state = ref.read(recordingProvider(widget.challengeId));

    if (state is RecordingReady) {
      HapticFeedback.mediumImpact();
      await notifier.startRecording();
      AnalyticsService.logRecordingStarted(); // fire-and-forget
    } else if (state is RecordingInProgress) {
      // Only allow stopping if minimum duration met.
      if (state.elapsed.inSeconds >= AppConstants.minVideoDurationSeconds) {
        HapticFeedback.mediumImpact();
        await notifier.stopRecording();
      } else {
        HapticFeedback.lightImpact();
        // Show a brief message that minimum duration hasn't been met.
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(
                context.l10n.minimumRecordingDuration(AppConstants.minVideoDurationSeconds),
              ),
              duration: const Duration(seconds: 1),
              backgroundColor: AppColors.secondary,
            ),
          );
        }
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(recordingProvider(widget.challengeId));
    final challenge = ref.watch(currentChallengeProvider);

    // Navigate to editor when recording is completed.
    ref.listen<RecordingState>(
      recordingProvider(widget.challengeId),
      (previous, next) {
        if (next is RecordingCompleted) {
          context.push(
            '/record/edit',
            extra: {
              'challengeId': widget.challengeId,
              'filePath': next.filePath,
              'durationMs': next.duration.inMilliseconds,
            },
          );
        }
      },
    );

    return Scaffold(
      backgroundColor: AppColors.black,
      body: Stack(
        fit: StackFit.expand,
        children: [
          // Camera preview.
          _buildCameraPreview(state),

          // Duet banner — shown above camera controls when in duet mode.
          if (widget.duetParentId != null)
            Positioned(
              top: 0,
              left: 0,
              right: 0,
              child: SafeArea(
                child: Align(
                  alignment: Alignment.topCenter,
                  child: Container(
                    margin: const EdgeInsets.all(8),
                    padding: const EdgeInsets.symmetric(
                        horizontal: 12, vertical: 6),
                    decoration: BoxDecoration(
                      color: Colors.black54,
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.reply,
                            color: Colors.white, size: 16),
                        const SizedBox(width: 4),
                        Text(
                          'Duet with @${widget.duetParentUsername ?? ""}',
                          style: const TextStyle(
                              color: Colors.white, fontSize: 13),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),

          // Top controls.
          Positioned(
            top: 0,
            left: 0,
            right: 0,
            child: CameraControls(
              isFlashOn: _isFlashOn(state),
              isFrontCamera: _isFrontCamera(state),
              isRecording: state is RecordingInProgress,
              onFlashToggle: () => ref
                  .read(recordingProvider(widget.challengeId).notifier)
                  .toggleFlash(),
              onFlipCamera: () => ref
                  .read(recordingProvider(widget.challengeId).notifier)
                  .flipCamera(),
              onClose: _onClose,
            ),
          ),

          // Challenge title at top.
          if (challenge != null)
            Positioned(
              top: MediaQuery.of(context).padding.top + 56,
              left: 20,
              right: 20,
              child: Center(
                child: Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  decoration: BoxDecoration(
                    color: AppColors.black.withValues(alpha: 0.5),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(
                    challenge.title,
                    style: AppTextStyles.bodyMediumBold.copyWith(
                      color: AppColors.white,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    textAlign: TextAlign.center,
                  ),
                ),
              ),
            ),

          // Bottom recording controls.
          Positioned(
            bottom: 0,
            left: 0,
            right: 0,
            child: _buildBottomControls(state),
          ),

          // Error overlay.
          if (state is RecordingError)
            _buildErrorOverlay(state),
        ],
      ),
    );
  }

  Widget _buildCameraPreview(RecordingState state) {
    CameraController? controller;

    if (state is RecordingReady) {
      controller = state.controller;
    } else if (state is RecordingInProgress) {
      controller = state.controller;
    }

    if (controller != null && controller.value.isInitialized) {
      return ClipRect(
        child: FittedBox(
          fit: BoxFit.cover,
          child: SizedBox(
            width: controller.value.previewSize?.height ?? 1920,
            height: controller.value.previewSize?.width ?? 1080,
            child: CameraPreview(controller),
          ),
        ),
      );
    }

    // Loading state.
    return const Center(
      child: CircularProgressIndicator(
        color: AppColors.primary,
        strokeWidth: 2,
      ),
    );
  }

  Widget _buildBottomControls(RecordingState state) {
    final isRecording = state is RecordingInProgress;
    final isReady = state is RecordingReady;
    final canRecord = isReady || isRecording;

    double progress = 0.0;
    String elapsedText = '00.0s';
    int elapsedSeconds = 0;

    if (state is RecordingInProgress) {
      progress = state.progress;
      elapsedText = state.elapsedText;
      elapsedSeconds = state.elapsed.inSeconds;
    }

    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.only(bottom: 32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Elapsed time text.
            if (isRecording)
              Padding(
                padding: const EdgeInsets.only(bottom: 16),
                child: Text(
                  elapsedText,
                  style: AppTextStyles.heading3.copyWith(
                    color: AppColors.white,
                    fontFeatures: [const FontFeature.tabularFigures()],
                  ),
                ),
              ),

            // Record button with timer ring.
            GestureDetector(
              onTap: canRecord ? _onRecordPressed : null,
              child: RecordingTimerRing(
                progress: progress,
                elapsedText: elapsedText,
                elapsedSeconds: elapsedSeconds,
                maxDurationSeconds: AppConstants.maxVideoDurationSeconds,
                size: 96,
                strokeWidth: 4,
                center: _buildRecordButton(isRecording, canRecord),
              ),
            ),

            const SizedBox(height: 12),

            // Helper text + gallery button row.
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                // Gallery button (only when not recording)
                if (!isRecording)
                  GestureDetector(
                    onTap: _onPickFromGallery,
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 12, vertical: 6),
                      decoration: BoxDecoration(
                        color: AppColors.white.withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(16),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            Icons.photo_library_outlined,
                            color: AppColors.white.withValues(alpha: 0.9),
                            size: 18,
                          ),
                          const SizedBox(width: 6),
                          Text(
                            context.l10n.pickFromGallery,
                            style: AppTextStyles.caption.copyWith(
                              color: AppColors.white.withValues(alpha: 0.9),
                            ),
                          ),
                        ],
                      ),
                    ),
                  )
                else
                  Text(
                    'Tap to stop',
                    style: AppTextStyles.caption.copyWith(
                      color: AppColors.white.withValues(alpha: 0.7),
                    ),
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildRecordButton(bool isRecording, bool canRecord) {
    return AnimatedContainer(
      duration: const Duration(milliseconds: 200),
      width: isRecording ? 36 : 64,
      height: isRecording ? 36 : 64,
      decoration: BoxDecoration(
        color: canRecord ? AppColors.error : AppColors.lightDisabled,
        shape: isRecording ? BoxShape.rectangle : BoxShape.circle,
        borderRadius: isRecording ? BorderRadius.circular(8) : null,
        border: Border.all(
          color: AppColors.white,
          width: 4,
        ),
        boxShadow: isRecording
            ? [
                BoxShadow(
                  color: AppColors.error.withValues(alpha: 0.4),
                  blurRadius: 12,
                  spreadRadius: 2,
                ),
              ]
            : null,
      ),
    );
  }

  Widget _buildErrorOverlay(RecordingError errorState) {
    return Container(
      color: AppColors.black.withValues(alpha: 0.85),
      child: Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(
                Icons.videocam_off_rounded,
                size: 64,
                color: AppColors.white,
              ),
              const SizedBox(height: 20),
              Text(
                context.l10n.cameraUnavailable,
                style: AppTextStyles.heading3.copyWith(
                  color: AppColors.white,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                context.l10n.cameraUnavailableDescription,
                style: AppTextStyles.bodyMedium.copyWith(
                  color: AppColors.white.withValues(alpha: 0.7),
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 32),
              // Primary action: pick from gallery
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  onPressed: _onPickFromGallery,
                  icon: const Icon(Icons.photo_library_outlined),
                  label: Text(context.l10n.pickFromGallery),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    foregroundColor: AppColors.white,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 12),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  OutlinedButton(
                    onPressed: _onClose,
                    style: OutlinedButton.styleFrom(
                      foregroundColor: AppColors.white,
                      side: const BorderSide(color: AppColors.white),
                    ),
                    child: Text(context.l10n.close),
                  ),
                  const SizedBox(width: 12),
                  OutlinedButton(
                    onPressed: () => ref
                        .read(
                            recordingProvider(widget.challengeId).notifier)
                        .initCamera(),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: AppColors.white,
                      side: const BorderSide(color: AppColors.white),
                    ),
                    child: Text(context.l10n.retry),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  // ---------------------------------------------------------------------------
  // State helpers
  // ---------------------------------------------------------------------------

  bool _isFlashOn(RecordingState state) {
    if (state is RecordingReady) return state.isFlashOn;
    if (state is RecordingInProgress) return state.isFlashOn;
    return false;
  }

  bool _isFrontCamera(RecordingState state) {
    if (state is RecordingReady) return state.isFrontCamera;
    return true;
  }
}
