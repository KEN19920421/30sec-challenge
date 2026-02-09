import 'package:camera/camera.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/constants/app_constants.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../l10n/l10n.dart';
import '../../../challenge/presentation/providers/challenge_provider.dart';
import '../providers/recording_provider.dart';
import '../widgets/camera_controls.dart';
import '../widgets/recording_timer_ring.dart';

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
class CameraScreen extends ConsumerStatefulWidget {
  final String challengeId;

  const CameraScreen({
    super.key,
    required this.challengeId,
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

    // Initialize camera after first frame.
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(recordingProvider(widget.challengeId).notifier).initCamera();
    });
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

  Future<void> _onRecordPressed() async {
    final notifier =
        ref.read(recordingProvider(widget.challengeId).notifier);
    final state = ref.read(recordingProvider(widget.challengeId));

    if (state is RecordingReady) {
      HapticFeedback.mediumImpact();
      await notifier.startRecording();
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

    // Navigate to preview when recording is completed.
    ref.listen<RecordingState>(
      recordingProvider(widget.challengeId),
      (previous, next) {
        if (next is RecordingCompleted) {
          context.push(
            '/record/preview',
            extra: {
              'challengeId': widget.challengeId,
              'filePath': next.filePath,
              'duration': next.duration.inMilliseconds,
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

            // Helper text.
            Text(
              isRecording ? 'Tap to stop' : 'Tap to record',
              style: AppTextStyles.caption.copyWith(
                color: AppColors.white.withValues(alpha: 0.7),
              ),
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
      color: AppColors.black.withValues(alpha: 0.7),
      child: Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(
                Icons.error_outline_rounded,
                size: 56,
                color: AppColors.error,
              ),
              const SizedBox(height: 16),
              Text(
                'Camera Error',
                style: AppTextStyles.heading3.copyWith(
                  color: AppColors.white,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                errorState.message,
                style: AppTextStyles.bodyMedium.copyWith(
                  color: AppColors.white.withValues(alpha: 0.8),
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 24),
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
                  ElevatedButton(
                    onPressed: () => ref
                        .read(
                            recordingProvider(widget.challengeId).notifier)
                        .initCamera(),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      foregroundColor: AppColors.white,
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
