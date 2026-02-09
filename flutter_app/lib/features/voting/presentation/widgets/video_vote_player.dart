import 'package:flutter/material.dart';
import 'package:shimmer/shimmer.dart';
import 'package:video_player/video_player.dart';

import '../../../../core/theme/app_colors.dart';

/// A video player optimized for the voting screen.
///
/// Features:
/// - Auto-plays and loops the video.
/// - Muted by default; tap the speaker icon to toggle.
/// - Tap anywhere to pause/play.
/// - Shows a thin progress bar at the bottom.
/// - Displays a shimmer loading state while buffering.
/// - Fills the parent container completely (cover fit).
class VideoVotePlayer extends StatefulWidget {
  final VideoPlayerController? controller;
  final bool autoPlay;
  final VoidCallback? onTap;

  const VideoVotePlayer({
    super.key,
    required this.controller,
    this.autoPlay = true,
    this.onTap,
  });

  @override
  State<VideoVotePlayer> createState() => _VideoVotePlayerState();
}

class _VideoVotePlayerState extends State<VideoVotePlayer> {
  bool _isMuted = true;
  bool _isPlaying = true;
  bool _showControls = false;

  @override
  void initState() {
    super.initState();
    _setupController();
  }

  @override
  void didUpdateWidget(covariant VideoVotePlayer oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.controller != oldWidget.controller) {
      _setupController();
    }
  }

  void _setupController() {
    final controller = widget.controller;
    if (controller == null) return;

    if (controller.value.isInitialized) {
      controller.setVolume(_isMuted ? 0.0 : 1.0);
      controller.setLooping(true);
      if (widget.autoPlay && !controller.value.isPlaying) {
        controller.play();
        _isPlaying = true;
      }
    } else {
      controller.addListener(_onControllerReady);
    }
  }

  void _onControllerReady() {
    final controller = widget.controller;
    if (controller == null) return;

    if (controller.value.isInitialized) {
      controller.removeListener(_onControllerReady);
      controller.setVolume(_isMuted ? 0.0 : 1.0);
      controller.setLooping(true);
      if (widget.autoPlay) {
        controller.play();
        _isPlaying = true;
      }
      if (mounted) setState(() {});
    }
  }

  void _togglePlayPause() {
    final controller = widget.controller;
    if (controller == null || !controller.value.isInitialized) return;

    setState(() {
      if (controller.value.isPlaying) {
        controller.pause();
        _isPlaying = false;
        _showControls = true;
      } else {
        controller.play();
        _isPlaying = true;
        _showControls = false;
      }
    });

    // Auto-hide controls after 2 seconds.
    if (!_isPlaying) {
      Future.delayed(const Duration(seconds: 3), () {
        if (mounted && !_isPlaying) {
          setState(() => _showControls = true);
        }
      });
    }
  }

  void _toggleMute() {
    final controller = widget.controller;
    if (controller == null) return;

    setState(() {
      _isMuted = !_isMuted;
      controller.setVolume(_isMuted ? 0.0 : 1.0);
    });
  }

  @override
  Widget build(BuildContext context) {
    final controller = widget.controller;

    // Loading / shimmer state.
    if (controller == null || !controller.value.isInitialized) {
      return _buildShimmer();
    }

    return GestureDetector(
      onTap: _togglePlayPause,
      child: Stack(
        fit: StackFit.expand,
        children: [
          // Video layer -- fills the container with cover-like fit.
          _buildVideo(controller),

          // Mute toggle button (top-right).
          Positioned(
            top: 12,
            right: 12,
            child: _MuteButton(
              isMuted: _isMuted,
              onTap: _toggleMute,
            ),
          ),

          // Play/pause indicator (center, shown when paused).
          if (_showControls && !_isPlaying)
            Center(
              child: Container(
                width: 64,
                height: 64,
                decoration: BoxDecoration(
                  color: AppColors.black.withValues(alpha: 0.5),
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.play_arrow_rounded,
                  color: AppColors.white,
                  size: 40,
                ),
              ),
            ),

          // Progress bar at the bottom.
          Positioned(
            left: 0,
            right: 0,
            bottom: 0,
            child: _VideoProgressBar(controller: controller),
          ),
        ],
      ),
    );
  }

  Widget _buildVideo(VideoPlayerController controller) {
    // Calculate aspect ratios for cover-like fill.
    return ClipRect(
      child: LayoutBuilder(
        builder: (context, constraints) {
          final videoAspect = controller.value.aspectRatio;
          final containerAspect = constraints.maxWidth / constraints.maxHeight;

          // Scale the video to fill the container (cover).
          double scaleX = 1.0;
          double scaleY = 1.0;

          if (videoAspect > containerAspect) {
            // Video is wider than container: scale height to fill.
            scaleX = videoAspect / containerAspect;
          } else {
            // Video is taller than container: scale width to fill.
            scaleY = containerAspect / videoAspect;
          }

          return Transform.scale(
            scaleX: scaleX,
            scaleY: scaleY,
            child: Center(
              child: AspectRatio(
                aspectRatio: videoAspect,
                child: VideoPlayer(controller),
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildShimmer() {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Shimmer.fromColors(
      baseColor:
          isDark ? AppColors.darkShimmerBase : AppColors.lightShimmerBase,
      highlightColor: isDark
          ? AppColors.darkShimmerHighlight
          : AppColors.lightShimmerHighlight,
      child: Container(
        color: isDark ? AppColors.darkSurface : AppColors.lightSurface,
        child: const Center(
          child: Icon(
            Icons.videocam_rounded,
            size: 48,
            color: AppColors.lightDisabled,
          ),
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Sub-widgets
// ---------------------------------------------------------------------------

class _MuteButton extends StatelessWidget {
  final bool isMuted;
  final VoidCallback onTap;

  const _MuteButton({required this.isMuted, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 36,
        height: 36,
        decoration: BoxDecoration(
          color: AppColors.black.withValues(alpha: 0.45),
          shape: BoxShape.circle,
        ),
        child: Icon(
          isMuted ? Icons.volume_off_rounded : Icons.volume_up_rounded,
          color: AppColors.white,
          size: 18,
        ),
      ),
    );
  }
}

class _VideoProgressBar extends StatefulWidget {
  final VideoPlayerController controller;

  const _VideoProgressBar({required this.controller});

  @override
  State<_VideoProgressBar> createState() => _VideoProgressBarState();
}

class _VideoProgressBarState extends State<_VideoProgressBar> {
  @override
  void initState() {
    super.initState();
    widget.controller.addListener(_onProgress);
  }

  @override
  void didUpdateWidget(covariant _VideoProgressBar oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.controller != oldWidget.controller) {
      oldWidget.controller.removeListener(_onProgress);
      widget.controller.addListener(_onProgress);
    }
  }

  @override
  void dispose() {
    widget.controller.removeListener(_onProgress);
    super.dispose();
  }

  void _onProgress() {
    if (mounted) setState(() {});
  }

  @override
  Widget build(BuildContext context) {
    final duration = widget.controller.value.duration;
    final position = widget.controller.value.position;

    final progress = duration.inMilliseconds > 0
        ? (position.inMilliseconds / duration.inMilliseconds).clamp(0.0, 1.0)
        : 0.0;

    return Container(
      height: 3,
      color: AppColors.white.withValues(alpha: 0.2),
      child: FractionallySizedBox(
        alignment: Alignment.centerLeft,
        widthFactor: progress,
        child: Container(
          color: AppColors.primary,
        ),
      ),
    );
  }
}
