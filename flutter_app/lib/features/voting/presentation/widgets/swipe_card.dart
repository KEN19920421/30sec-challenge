import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';

/// Direction of a completed swipe gesture.
enum SwipeDirection { left, right }

/// A draggable card widget with rotation on drag for the voting screen.
///
/// Features:
/// - Rotates slightly as the user drags horizontally.
/// - Shows a green "thumbs up" overlay when dragging right (upvote).
/// - Shows a red "thumbs down" overlay when dragging left (downvote).
/// - Snaps back with spring animation if not swiped far enough.
/// - Fires [onSwipeCompleted] when the card is swiped past the threshold.
/// - Contains the child widget (typically a video player).
class SwipeCard extends StatefulWidget {
  final Widget child;
  final ValueChanged<SwipeDirection>? onSwipeCompleted;
  final VoidCallback? onSwipeStarted;
  final bool enabled;

  const SwipeCard({
    super.key,
    required this.child,
    this.onSwipeCompleted,
    this.onSwipeStarted,
    this.enabled = true,
  });

  @override
  State<SwipeCard> createState() => SwipeCardState();
}

class SwipeCardState extends State<SwipeCard>
    with SingleTickerProviderStateMixin {
  late AnimationController _animationController;
  Animation<Offset>? _positionAnimation;
  Animation<double>? _rotationAnimation;

  Offset _dragOffset = Offset.zero;
  bool _isDragging = false;

  /// Fraction of screen width required to trigger a swipe.
  static const double _swipeThreshold = 0.35;

  /// Maximum rotation angle in radians.
  static const double _maxRotation = 0.25; // ~14 degrees

  @override
  void initState() {
    super.initState();
    _animationController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 300),
    );
  }

  @override
  void dispose() {
    _animationController.dispose();
    super.dispose();
  }

  // ---------------------------------------------------------------------------
  // Public API for programmatic swipe (from buttons)
  // ---------------------------------------------------------------------------

  /// Programmatically swipe the card in a given direction.
  void animateSwipe(SwipeDirection direction) {
    if (!widget.enabled) return;

    final screenWidth = MediaQuery.of(context).size.width;
    final targetX =
        direction == SwipeDirection.right ? screenWidth * 1.5 : -screenWidth * 1.5;

    _positionAnimation = Tween<Offset>(
      begin: _dragOffset,
      end: Offset(targetX, 0),
    ).animate(CurvedAnimation(
      parent: _animationController,
      curve: Curves.easeInOut,
    ));

    _rotationAnimation = Tween<double>(
      begin: _currentRotation,
      end: direction == SwipeDirection.right ? _maxRotation : -_maxRotation,
    ).animate(CurvedAnimation(
      parent: _animationController,
      curve: Curves.easeInOut,
    ));

    HapticFeedback.mediumImpact();
    _animationController.forward(from: 0).then((_) {
      widget.onSwipeCompleted?.call(direction);
      _resetCard();
    });
  }

  // ---------------------------------------------------------------------------
  // Gesture handlers
  // ---------------------------------------------------------------------------

  void _onPanStart(DragStartDetails details) {
    if (!widget.enabled) return;
    _animationController.stop();
    _isDragging = true;
    widget.onSwipeStarted?.call();
  }

  void _onPanUpdate(DragUpdateDetails details) {
    if (!widget.enabled || !_isDragging) return;
    setState(() {
      _dragOffset += Offset(details.delta.dx, details.delta.dy * 0.3);
    });
  }

  void _onPanEnd(DragEndDetails details) {
    if (!widget.enabled || !_isDragging) return;
    _isDragging = false;

    final screenWidth = MediaQuery.of(context).size.width;
    final swipeFraction = _dragOffset.dx.abs() / screenWidth;

    if (swipeFraction >= _swipeThreshold) {
      // Swipe completed -- animate off-screen.
      final direction =
          _dragOffset.dx > 0 ? SwipeDirection.right : SwipeDirection.left;

      final targetX =
          direction == SwipeDirection.right ? screenWidth * 1.5 : -screenWidth * 1.5;

      _positionAnimation = Tween<Offset>(
        begin: _dragOffset,
        end: Offset(targetX, _dragOffset.dy),
      ).animate(CurvedAnimation(
        parent: _animationController,
        curve: Curves.easeOut,
      ));

      _rotationAnimation = Tween<double>(
        begin: _currentRotation,
        end: direction == SwipeDirection.right ? _maxRotation : -_maxRotation,
      ).animate(CurvedAnimation(
        parent: _animationController,
        curve: Curves.easeOut,
      ));

      HapticFeedback.mediumImpact();
      _animationController.forward(from: 0).then((_) {
        widget.onSwipeCompleted?.call(direction);
        _resetCard();
      });
    } else {
      // Snap back with spring-like animation.
      _positionAnimation = Tween<Offset>(
        begin: _dragOffset,
        end: Offset.zero,
      ).animate(CurvedAnimation(
        parent: _animationController,
        curve: Curves.elasticOut,
      ));

      _rotationAnimation = Tween<double>(
        begin: _currentRotation,
        end: 0,
      ).animate(CurvedAnimation(
        parent: _animationController,
        curve: Curves.elasticOut,
      ));

      HapticFeedback.lightImpact();
      _animationController.forward(from: 0);
    }
  }

  double get _currentRotation {
    if (!mounted) return 0;
    final screenWidth = MediaQuery.of(context).size.width;
    if (screenWidth == 0) return 0;
    return (_dragOffset.dx / screenWidth) * _maxRotation;
  }

  double get _swipeProgress {
    if (!mounted) return 0;
    final screenWidth = MediaQuery.of(context).size.width;
    if (screenWidth == 0) return 0;
    return (_dragOffset.dx.abs() / screenWidth).clamp(0.0, 1.0);
  }

  // ---------------------------------------------------------------------------
  // Build
  // ---------------------------------------------------------------------------

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _animationController,
      builder: (context, child) {
        final offset = _positionAnimation?.value ?? _dragOffset;
        final rotation = _rotationAnimation?.value ?? _currentRotation;

        return Transform.translate(
          offset: offset,
          child: Transform.rotate(
            angle: rotation,
            child: child,
          ),
        );
      },
      child: GestureDetector(
        onPanStart: _onPanStart,
        onPanUpdate: _onPanUpdate,
        onPanEnd: _onPanEnd,
        child: Stack(
          fit: StackFit.expand,
          children: [
            // The actual card content (video player, user info, etc.).
            ClipRRect(
              borderRadius: BorderRadius.circular(16),
              child: widget.child,
            ),

            // Vote direction overlay.
            _VoteOverlay(
              dragOffset: _dragOffset,
              swipeProgress: _swipeProgress,
            ),
          ],
        ),
      ),
    );
  }

  void _resetCard() {
    setState(() {
      _dragOffset = Offset.zero;
    });
    _animationController.reset();
    _positionAnimation = null;
    _rotationAnimation = null;
  }
}

// ---------------------------------------------------------------------------
// Vote direction overlay
// ---------------------------------------------------------------------------

class _VoteOverlay extends StatelessWidget {
  final Offset dragOffset;
  final double swipeProgress;

  const _VoteOverlay({
    required this.dragOffset,
    required this.swipeProgress,
  });

  @override
  Widget build(BuildContext context) {
    if (swipeProgress < 0.05) return const SizedBox.shrink();

    final isRight = dragOffset.dx > 0;
    final opacity = (swipeProgress * 2).clamp(0.0, 0.8);

    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(16),
        color: isRight
            ? AppColors.success.withValues(alpha: opacity * 0.3)
            : AppColors.error.withValues(alpha: opacity * 0.3),
      ),
      child: Center(
        child: Transform.rotate(
          angle: isRight ? -math.pi / 12 : math.pi / 12,
          child: Opacity(
            opacity: opacity,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
              decoration: BoxDecoration(
                border: Border.all(
                  color: isRight ? AppColors.success : AppColors.error,
                  width: 3,
                ),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(
                    isRight
                        ? Icons.thumb_up_rounded
                        : Icons.thumb_down_rounded,
                    color: isRight ? AppColors.success : AppColors.error,
                    size: 32,
                  ),
                  const SizedBox(width: 8),
                  Text(
                    isRight ? 'LIKE' : 'NOPE',
                    style: AppTextStyles.heading2.copyWith(
                      color: isRight ? AppColors.success : AppColors.error,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
