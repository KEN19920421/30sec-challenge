import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:share_plus/share_plus.dart';
import 'package:shimmer/shimmer.dart';
import 'package:video_player/video_player.dart';

import '../../../../core/constants/app_constants.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../l10n/l10n.dart';
import '../../../challenge/domain/submission.dart';
import '../../../comment/presentation/widgets/comments_bottom_sheet.dart';

/// A full-screen video feed item — one page in the TikTok-style vertical
/// [PageView]. Manages its own [VideoPlayerController] lifecycle.
class VideoFeedItem extends ConsumerStatefulWidget {
  final Submission submission;

  /// Whether this item is the currently visible page.
  /// Controls auto-play / pause behaviour.
  final bool isActive;

  final VoidCallback? onLike;
  final VoidCallback? onDislike;

  const VideoFeedItem({
    super.key,
    required this.submission,
    required this.isActive,
    this.onLike,
    this.onDislike,
  });

  @override
  ConsumerState<VideoFeedItem> createState() => _VideoFeedItemState();
}

class _VideoFeedItemState extends ConsumerState<VideoFeedItem> {
  VideoPlayerController? _controller;
  bool _isInitialized = false;
  bool _isMuted = true;
  bool _isPlaying = false;
  bool _showPauseOverlay = false;

  // -------------------------------------------------------------------------
  // Lifecycle
  // -------------------------------------------------------------------------

  @override
  void initState() {
    super.initState();
    _initializeController();
  }

  @override
  void didUpdateWidget(covariant VideoFeedItem oldWidget) {
    super.didUpdateWidget(oldWidget);

    // Play/pause when active state changes.
    if (widget.isActive != oldWidget.isActive) {
      if (widget.isActive) {
        _play();
      } else {
        _pause();
      }
    }
  }

  @override
  void dispose() {
    _controller?.removeListener(_enforceMaxDuration);
    _controller?.dispose();
    super.dispose();
  }

  // -------------------------------------------------------------------------
  // Controller setup
  // -------------------------------------------------------------------------

  /// Maximum playback duration for any video in the feed.
  static const _maxPlaybackDuration = Duration(seconds: 30);

  void _initializeController() {
    final url = widget.submission.hlsUrl ?? widget.submission.videoUrl;
    if (url == null || url.isEmpty) return;

    final uri = Uri.parse(url);
    _controller = VideoPlayerController.networkUrl(uri)
      ..initialize().then((_) {
        if (!mounted) return;
        // If the video is longer than 30s, manually loop at 30s instead of
        // relying on the player's built-in loop (which loops at the end).
        final isLong =
            _controller!.value.duration > _maxPlaybackDuration;
        _controller!.setLooping(!isLong);
        if (isLong) {
          _controller!.addListener(_enforceMaxDuration);
        }
        _controller!.setVolume(_isMuted ? 0.0 : 1.0);
        setState(() => _isInitialized = true);
        if (widget.isActive) {
          _play();
        }
      });
  }

  /// Seeks back to the start once the position exceeds 30 seconds.
  void _enforceMaxDuration() {
    final controller = _controller;
    if (controller == null || !controller.value.isInitialized) return;
    if (controller.value.position >= _maxPlaybackDuration) {
      controller.seekTo(Duration.zero);
    }
  }

  // -------------------------------------------------------------------------
  // Playback helpers
  // -------------------------------------------------------------------------

  void _play() {
    _controller?.play();
    if (mounted) {
      setState(() {
        _isPlaying = true;
        _showPauseOverlay = false;
      });
    }
  }

  void _pause() {
    _controller?.pause();
    if (mounted) {
      setState(() {
        _isPlaying = false;
        _showPauseOverlay = true;
      });
    }
  }

  void _togglePlayPause() {
    if (_controller == null || !_isInitialized) return;
    if (_controller!.value.isPlaying) {
      _pause();
    } else {
      _play();
    }
  }

  void _toggleMute() {
    if (_controller == null) return;
    setState(() {
      _isMuted = !_isMuted;
      _controller!.setVolume(_isMuted ? 0.0 : 1.0);
    });
  }

  // -------------------------------------------------------------------------
  // Build
  // -------------------------------------------------------------------------

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: _togglePlayPause,
      child: Container(
        color: AppColors.black,
        child: Stack(
          fit: StackFit.expand,
          children: [
            // Video / shimmer layer
            _isInitialized
                ? _buildVideo(_controller!)
                : _buildShimmer(context),

            // Gradient overlay for readability at the bottom
            Positioned(
              left: 0,
              right: 0,
              bottom: 0,
              height: 280,
              child: Container(
                decoration: const BoxDecoration(
                  gradient: AppColors.darkOverlayGradient,
                ),
              ),
            ),

            // Right side action buttons
            Positioned(
              right: 12,
              bottom: 120,
              child: _ActionBar(
                submission: widget.submission,
                onLike: widget.onLike,
                onDislike: widget.onDislike,
                onComment: () {
                  CommentsBottomSheet.show(context, widget.submission.id);
                },
                onShare: () {
                  final user = widget.submission.displayNameOrUsername;
                  final url =
                      'https://${AppConstants.universalLinkHost}/v/${widget.submission.id}';
                  Share.share('$user on ${AppConstants.appName}\n$url');
                },
              ),
            ),

            // Bottom-left: user info + caption
            Positioned(
              left: 16,
              right: 80,
              bottom: 32,
              child: _UserInfoOverlay(submission: widget.submission),
            ),

            // Top-right: mute toggle
            Positioned(
              top: MediaQuery.of(context).padding.top + 52,
              right: 12,
              child: _MuteButton(
                isMuted: _isMuted,
                onTap: _toggleMute,
              ),
            ),

            // Pause overlay (center)
            if (_showPauseOverlay && !_isPlaying)
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

            // Progress bar at the very bottom
            if (_isInitialized)
              Positioned(
                left: 0,
                right: 0,
                bottom: 0,
                child: _VideoProgressBar(controller: _controller!),
              ),
          ],
        ),
      ),
    );
  }

  // -------------------------------------------------------------------------
  // Sub-builders
  // -------------------------------------------------------------------------

  /// Cover-fit video (same technique as VideoVotePlayer).
  Widget _buildVideo(VideoPlayerController controller) {
    return ClipRect(
      child: LayoutBuilder(
        builder: (context, constraints) {
          final videoAspect = controller.value.aspectRatio;
          final containerAspect = constraints.maxWidth / constraints.maxHeight;

          double scaleX = 1.0;
          double scaleY = 1.0;

          if (videoAspect > containerAspect) {
            scaleX = videoAspect / containerAspect;
          } else {
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

  Widget _buildShimmer(BuildContext context) {
    return Shimmer.fromColors(
      baseColor: AppColors.darkShimmerBase,
      highlightColor: AppColors.darkShimmerHighlight,
      child: Container(
        color: AppColors.darkSurface,
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

// =============================================================================
// Action bar (right side vertical column)
// =============================================================================

class _ActionBar extends StatelessWidget {
  final Submission submission;
  final VoidCallback? onLike;
  final VoidCallback? onDislike;
  final VoidCallback? onComment;
  final VoidCallback? onShare;

  const _ActionBar({
    required this.submission,
    this.onLike,
    this.onDislike,
    this.onComment,
    this.onShare,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        // Like button
        _ActionButton(
          icon: Icons.favorite_rounded,
          label: _formatCount(submission.voteCount),
          color: AppColors.error,
          onTap: onLike,
        ),
        const SizedBox(height: 20),

        // Dislike button
        _ActionButton(
          icon: Icons.thumb_down_rounded,
          label: _formatCount(submission.superVoteCount),
          color: AppColors.white,
          onTap: onDislike,
        ),
        const SizedBox(height: 20),

        // Comment button
        _ActionButton(
          icon: Icons.chat_bubble_rounded,
          label: context.l10n.comments,
          color: AppColors.white,
          onTap: onComment,
        ),
        const SizedBox(height: 20),

        // Share button
        _ActionButton(
          icon: Icons.share_rounded,
          label: context.l10n.share,
          color: AppColors.white,
          onTap: onShare,
        ),
      ],
    );
  }

  String _formatCount(int count) {
    if (count >= 1000000) return '${(count / 1000000).toStringAsFixed(1)}M';
    if (count >= 1000) return '${(count / 1000).toStringAsFixed(1)}K';
    return count.toString();
  }
}

// =============================================================================
// Single action button (icon + label)
// =============================================================================

class _ActionButton extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback? onTap;

  const _ActionButton({
    required this.icon,
    required this.label,
    required this.color,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: AppColors.black.withValues(alpha: 0.35),
              shape: BoxShape.circle,
            ),
            child: Icon(icon, color: color, size: 24),
          ),
          const SizedBox(height: 4),
          Text(
            label,
            style: AppTextStyles.caption.copyWith(
              color: AppColors.white,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}

// =============================================================================
// User info overlay (bottom-left)
// =============================================================================

class _UserInfoOverlay extends StatelessWidget {
  final Submission submission;

  const _UserInfoOverlay({required this.submission});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        // Avatar + username
        Row(
          children: [
            CircleAvatar(
              radius: 18,
              backgroundColor: AppColors.primary.withValues(alpha: 0.3),
              backgroundImage: submission.avatarUrl != null
                  ? CachedNetworkImageProvider(submission.avatarUrl!)
                  : null,
              child: submission.avatarUrl == null
                  ? Text(
                      submission.displayNameOrUsername
                          .substring(0, 1)
                          .toUpperCase(),
                      style: AppTextStyles.bodySmallBold.copyWith(
                        color: AppColors.white,
                      ),
                    )
                  : null,
            ),
            const SizedBox(width: 10),
            Flexible(
              child: Text(
                submission.username != null
                    ? '@${submission.username}'
                    : submission.displayNameOrUsername,
                style: AppTextStyles.bodyMediumBold.copyWith(
                  color: AppColors.white,
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ],
        ),

        // Caption
        if (submission.caption != null && submission.caption!.isNotEmpty) ...[
          const SizedBox(height: 8),
          Text(
            submission.caption!,
            style: AppTextStyles.bodyMedium.copyWith(
              color: AppColors.white.withValues(alpha: 0.9),
            ),
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ],
    );
  }
}

// =============================================================================
// Mute button (top-right)
// =============================================================================

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

// =============================================================================
// Video progress bar (bottom)
// =============================================================================

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
    const maxDuration = Duration(seconds: 30);
    final rawDuration = widget.controller.value.duration;
    final position = widget.controller.value.position;

    // Cap displayed duration at 30 seconds.
    final duration =
        rawDuration > maxDuration ? maxDuration : rawDuration;

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
