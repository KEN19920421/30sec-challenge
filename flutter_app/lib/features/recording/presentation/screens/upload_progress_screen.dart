import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../l10n/l10n.dart';
import '../../../challenge/presentation/providers/challenge_provider.dart';
import '../providers/recording_provider.dart';

/// Upload progress screen shown during and after video submission.
///
/// Displays:
///   - A circular progress indicator with percentage while uploading.
///   - "Uploading your entry..." text and challenge title.
///   - On complete: a success animation, "View in Feed" button, and
///     auto-navigation after a short delay.
///   - On error: a retry button.
class UploadProgressScreen extends ConsumerStatefulWidget {
  final String challengeId;
  final String? caption;

  const UploadProgressScreen({
    super.key,
    required this.challengeId,
    this.caption,
  });

  @override
  ConsumerState<UploadProgressScreen> createState() =>
      _UploadProgressScreenState();
}

class _UploadProgressScreenState extends ConsumerState<UploadProgressScreen>
    with SingleTickerProviderStateMixin {
  late AnimationController _successAnimController;
  late Animation<double> _scaleAnimation;
  Timer? _autoNavTimer;
  bool _uploadStarted = false;

  @override
  void initState() {
    super.initState();

    _successAnimController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 600),
    );

    _scaleAnimation = CurvedAnimation(
      parent: _successAnimController,
      curve: Curves.elasticOut,
    );

    // Start upload after first frame.
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _startUpload();
    });
  }

  @override
  void dispose() {
    _successAnimController.dispose();
    _autoNavTimer?.cancel();
    super.dispose();
  }

  void _startUpload() {
    if (_uploadStarted) return;
    _uploadStarted = true;

    ref.read(recordingProvider(widget.challengeId).notifier).upload(
          caption: widget.caption,
        );
  }

  void _onRetry() {
    _uploadStarted = false;
    _startUpload();
  }

  void _navigateToFeed() {
    _autoNavTimer?.cancel();
    // Pop all recording screens and go to feed.
    context.go('/feed');
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(recordingProvider(widget.challengeId));
    final challenge = ref.watch(currentChallengeProvider);
    final theme = Theme.of(context);

    // Listen for state changes to trigger success animation.
    ref.listen<RecordingState>(
      recordingProvider(widget.challengeId),
      (previous, next) {
        if (next is RecordingUploaded) {
          _successAnimController.forward();

          // Auto-navigate after 3 seconds.
          _autoNavTimer = Timer(const Duration(seconds: 3), () {
            if (mounted) _navigateToFeed();
          });
        }
      },
    );

    return PopScope(
      // Prevent back navigation during upload.
      canPop: state is! RecordingUploading,
      child: Scaffold(
        backgroundColor: theme.scaffoldBackgroundColor,
        body: SafeArea(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 32),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Spacer(flex: 2),

                // Status indicator.
                _buildStatusIndicator(state),

                const SizedBox(height: 32),

                // Status text.
                _buildStatusText(state, theme),

                // Challenge title.
                if (challenge != null) ...[
                  const SizedBox(height: 12),
                  Text(
                    challenge.title,
                    style: AppTextStyles.bodyMedium.copyWith(
                      color: theme.colorScheme.onSurface.withValues(alpha: 0.6),
                    ),
                    textAlign: TextAlign.center,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],

                const Spacer(flex: 2),

                // Bottom action buttons.
                _buildBottomActions(state, theme),

                const SizedBox(height: 32),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildStatusIndicator(RecordingState state) {
    if (state is RecordingUploading) {
      return _UploadProgressRing(progress: state.progress);
    }

    if (state is RecordingUploaded) {
      return ScaleTransition(
        scale: _scaleAnimation,
        child: Container(
          width: 120,
          height: 120,
          decoration: BoxDecoration(
            color: AppColors.success.withValues(alpha: 0.1),
            shape: BoxShape.circle,
          ),
          child: const Icon(
            Icons.check_circle_rounded,
            size: 80,
            color: AppColors.success,
          ),
        ),
      );
    }

    if (state is RecordingError) {
      return Container(
        width: 120,
        height: 120,
        decoration: BoxDecoration(
          color: AppColors.error.withValues(alpha: 0.1),
          shape: BoxShape.circle,
        ),
        child: const Icon(
          Icons.error_outline_rounded,
          size: 80,
          color: AppColors.error,
        ),
      );
    }

    // Default: idle/initializing spinner.
    return const SizedBox(
      width: 120,
      height: 120,
      child: CircularProgressIndicator(
        color: AppColors.primary,
        strokeWidth: 3,
      ),
    );
  }

  Widget _buildStatusText(RecordingState state, ThemeData theme) {
    String title;
    String subtitle;

    if (state is RecordingUploading) {
      title = 'Uploading your entry...';
      subtitle = '${state.progressPercent}% complete';
    } else if (state is RecordingUploaded) {
      title = 'Submission complete!';
      subtitle = 'Your video is being processed';
    } else if (state is RecordingError) {
      title = 'Upload failed';
      subtitle = state.message;
    } else {
      title = 'Preparing upload...';
      subtitle = 'Please wait';
    }

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(
          title,
          style: AppTextStyles.heading2.copyWith(
            color: theme.colorScheme.onSurface,
          ),
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: 8),
        Text(
          subtitle,
          style: AppTextStyles.bodyMedium.copyWith(
            color: theme.colorScheme.onSurface.withValues(alpha: 0.6),
          ),
          textAlign: TextAlign.center,
        ),
      ],
    );
  }

  Widget _buildBottomActions(RecordingState state, ThemeData theme) {
    if (state is RecordingUploaded) {
      return Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          SizedBox(
            width: double.infinity,
            height: 52,
            child: ElevatedButton.icon(
              onPressed: _navigateToFeed,
              icon: const Icon(Icons.play_circle_outline, size: 22),
              label: Text(context.l10n.viewInFeed, style: AppTextStyles.buttonLarge),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                foregroundColor: AppColors.white,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(14),
                ),
              ),
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Auto-redirecting in a moment...',
            style: AppTextStyles.caption.copyWith(
              color: theme.colorScheme.onSurface.withValues(alpha: 0.4),
            ),
          ),
        ],
      );
    }

    if (state is RecordingError) {
      return Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          SizedBox(
            width: double.infinity,
            height: 52,
            child: ElevatedButton.icon(
              onPressed: _onRetry,
              icon: const Icon(Icons.refresh_rounded, size: 22),
              label: Text(context.l10n.retryUpload, style: AppTextStyles.buttonLarge),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                foregroundColor: AppColors.white,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(14),
                ),
              ),
            ),
          ),
          const SizedBox(height: 12),
          TextButton(
            onPressed: () => context.pop(),
            child: Text(
              'Go Back',
              style: AppTextStyles.buttonMedium.copyWith(
                color: theme.colorScheme.onSurface.withValues(alpha: 0.6),
              ),
            ),
          ),
        ],
      );
    }

    // Uploading - show cancel option.
    if (state is RecordingUploading) {
      return TextButton(
        onPressed: () {
          ref
              .read(recordingProvider(widget.challengeId).notifier)
              .cancelUpload();
          context.pop();
        },
        child: Text(
          'Cancel',
          style: AppTextStyles.buttonMedium.copyWith(
            color: theme.colorScheme.onSurface.withValues(alpha: 0.5),
          ),
        ),
      );
    }

    return const SizedBox.shrink();
  }
}

// =============================================================================
// Upload progress ring
// =============================================================================

class _UploadProgressRing extends StatelessWidget {
  final double progress;

  const _UploadProgressRing({required this.progress});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 120,
      height: 120,
      child: Stack(
        alignment: Alignment.center,
        children: [
          // Background track.
          SizedBox(
            width: 120,
            height: 120,
            child: CircularProgressIndicator(
              value: 1.0,
              strokeWidth: 6,
              color: AppColors.primary.withValues(alpha: 0.1),
              strokeCap: StrokeCap.round,
            ),
          ),

          // Progress.
          SizedBox(
            width: 120,
            height: 120,
            child: TweenAnimationBuilder<double>(
              tween: Tween<double>(begin: 0.0, end: progress),
              duration: const Duration(milliseconds: 300),
              curve: Curves.easeOut,
              builder: (context, value, _) {
                return CircularProgressIndicator(
                  value: value,
                  strokeWidth: 6,
                  color: AppColors.primary,
                  strokeCap: StrokeCap.round,
                );
              },
            ),
          ),

          // Percentage text.
          Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                '${(progress * 100).round()}',
                style: AppTextStyles.heading1.copyWith(
                  color: AppColors.primary,
                  fontFeatures: [const FontFeature.tabularFigures()],
                ),
              ),
              Text(
                '%',
                style: AppTextStyles.bodySmall.copyWith(
                  color: AppColors.primary.withValues(alpha: 0.7),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
