import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:video_player/video_player.dart';

import '../../../../core/constants/app_constants.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../l10n/l10n.dart';
import '../../../challenge/presentation/providers/challenge_provider.dart';
import '../providers/recording_provider.dart';

/// Video preview screen shown after recording is complete.
///
/// Displays the recorded video in a looping player with play/pause controls.
/// At the bottom is a caption input field (max 200 characters), a "Retake"
/// button, and a "Submit" button.
class PreviewScreen extends ConsumerStatefulWidget {
  final String challengeId;
  final String filePath;
  final int durationMs;

  const PreviewScreen({
    super.key,
    required this.challengeId,
    required this.filePath,
    required this.durationMs,
  });

  @override
  ConsumerState<PreviewScreen> createState() => _PreviewScreenState();
}

class _PreviewScreenState extends ConsumerState<PreviewScreen> {
  late VideoPlayerController _videoController;
  final TextEditingController _captionController = TextEditingController();
  final FocusNode _captionFocus = FocusNode();
  bool _isVideoInitialized = false;

  @override
  void initState() {
    super.initState();
    _initVideoPlayer();
  }

  @override
  void dispose() {
    _videoController.dispose();
    _captionController.dispose();
    _captionFocus.dispose();
    super.dispose();
  }

  Future<void> _initVideoPlayer() async {
    _videoController = VideoPlayerController.file(File(widget.filePath));

    try {
      await _videoController.initialize();
      _videoController.setLooping(true);
      _videoController.play();
      if (mounted) {
        setState(() => _isVideoInitialized = true);
      }
    } catch (e) {
      // Video player initialization failed.
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('${context.l10n.failedToLoadPreview}: $e'),
            backgroundColor: AppColors.error,
          ),
        );
      }
    }
  }

  void _onRetake() {
    _videoController.pause();
    ref.read(recordingProvider(widget.challengeId).notifier).retake();
    context.pop(); // Go back to camera screen.
  }

  void _onSubmit() {
    _videoController.pause();
    _captionFocus.unfocus();

    final caption = _captionController.text.trim().isEmpty
        ? null
        : _captionController.text.trim();

    // Navigate to upload progress screen.
    context.pushReplacement(
      '/record/upload',
      extra: {
        'challengeId': widget.challengeId,
        'caption': caption,
      },
    );
  }

  void _togglePlayPause() {
    setState(() {
      if (_videoController.value.isPlaying) {
        _videoController.pause();
      } else {
        _videoController.play();
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final challenge = ref.watch(currentChallengeProvider);

    return Scaffold(
      backgroundColor: AppColors.black,
      body: GestureDetector(
        onTap: () => _captionFocus.unfocus(),
        child: Stack(
          fit: StackFit.expand,
          children: [
            // Video player.
            if (_isVideoInitialized)
              GestureDetector(
                onTap: _togglePlayPause,
                child: Center(
                  child: AspectRatio(
                    aspectRatio: _videoController.value.aspectRatio,
                    child: VideoPlayer(_videoController),
                  ),
                ),
              )
            else
              const Center(
                child: CircularProgressIndicator(
                  color: AppColors.primary,
                  strokeWidth: 2,
                ),
              ),

            // Play/pause overlay icon.
            if (_isVideoInitialized && !_videoController.value.isPlaying)
              GestureDetector(
                onTap: _togglePlayPause,
                child: Center(
                  child: Container(
                    width: 64,
                    height: 64,
                    decoration: BoxDecoration(
                      color: AppColors.black.withValues(alpha: 0.5),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(
                      Icons.play_arrow_rounded,
                      size: 40,
                      color: AppColors.white,
                    ),
                  ),
                ),
              ),

            // Top bar: challenge title + close.
            Positioned(
              top: 0,
              left: 0,
              right: 0,
              child: SafeArea(
                child: Padding(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  child: Row(
                    children: [
                      GestureDetector(
                        onTap: () => context.pop(),
                        child: Container(
                          width: 40,
                          height: 40,
                          decoration: BoxDecoration(
                            color: AppColors.black.withValues(alpha: 0.4),
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(
                            Icons.close_rounded,
                            color: AppColors.white,
                            size: 22,
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 12, vertical: 6),
                          decoration: BoxDecoration(
                            color: AppColors.black.withValues(alpha: 0.4),
                            borderRadius: BorderRadius.circular(16),
                          ),
                          child: Text(
                            challenge?.title ?? context.l10n.preview,
                            style: AppTextStyles.bodySmallBold.copyWith(
                              color: AppColors.white,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            textAlign: TextAlign.center,
                          ),
                        ),
                      ),
                      const SizedBox(width: 52), // Balance with close button.
                    ],
                  ),
                ),
              ),
            ),

            // Bottom section: caption + action buttons.
            Positioned(
              bottom: 0,
              left: 0,
              right: 0,
              child: Container(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [
                      AppColors.black.withValues(alpha: 0.0),
                      AppColors.black.withValues(alpha: 0.8),
                      AppColors.black,
                    ],
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                  ),
                ),
                child: SafeArea(
                  top: false,
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(20, 40, 20, 16),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        // Caption input.
                        Container(
                          decoration: BoxDecoration(
                            color: AppColors.white.withValues(alpha: 0.1),
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(
                              color: AppColors.white.withValues(alpha: 0.2),
                            ),
                          ),
                          child: TextField(
                            controller: _captionController,
                            focusNode: _captionFocus,
                            maxLength: AppConstants.maxCaptionLength,
                            maxLines: 2,
                            minLines: 1,
                            style: AppTextStyles.bodyMedium.copyWith(
                              color: AppColors.white,
                            ),
                            decoration: InputDecoration(
                              hintText: context.l10n.captionPlaceholder,
                              hintStyle: AppTextStyles.bodyMedium.copyWith(
                                color: AppColors.white.withValues(alpha: 0.5),
                              ),
                              counterStyle: AppTextStyles.caption.copyWith(
                                color: AppColors.white.withValues(alpha: 0.5),
                              ),
                              border: InputBorder.none,
                              contentPadding: const EdgeInsets.symmetric(
                                horizontal: 16,
                                vertical: 12,
                              ),
                            ),
                          ),
                        ),

                        const SizedBox(height: 16),

                        // Action buttons.
                        Row(
                          children: [
                            // Retake button.
                            Expanded(
                              child: SizedBox(
                                height: 52,
                                child: OutlinedButton.icon(
                                  onPressed: _onRetake,
                                  icon: const Icon(
                                      Icons.refresh_rounded, size: 20),
                                  label: Text(
                                    context.l10n.retake,
                                    style: AppTextStyles.buttonMedium,
                                  ),
                                  style: OutlinedButton.styleFrom(
                                    foregroundColor: AppColors.white,
                                    side: BorderSide(
                                      color: AppColors.white
                                          .withValues(alpha: 0.4),
                                    ),
                                    shape: RoundedRectangleBorder(
                                      borderRadius:
                                          BorderRadius.circular(14),
                                    ),
                                  ),
                                ),
                              ),
                            ),

                            const SizedBox(width: 12),

                            // Submit button.
                            Expanded(
                              flex: 2,
                              child: SizedBox(
                                height: 52,
                                child: ElevatedButton.icon(
                                  onPressed: _onSubmit,
                                  icon: const Icon(
                                      Icons.send_rounded, size: 20),
                                  label: Text(
                                    'Submit',
                                    style: AppTextStyles.buttonMedium,
                                  ),
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: AppColors.primary,
                                    foregroundColor: AppColors.white,
                                    shape: RoundedRectangleBorder(
                                      borderRadius:
                                          BorderRadius.circular(14),
                                    ),
                                    elevation: 2,
                                    shadowColor:
                                        AppColors.primary.withValues(alpha: 0.4),
                                  ),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
