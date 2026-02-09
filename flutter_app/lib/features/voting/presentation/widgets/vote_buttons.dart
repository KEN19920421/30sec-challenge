import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';

/// Bottom button row for the voting screen.
///
/// Displays three buttons:
/// - Downvote (X icon) on the left
/// - Super Vote (star icon with remaining count badge) in the center
/// - Upvote (heart icon) on the right
///
/// Each button has animated press effects and haptic feedback.
class VoteButtons extends StatelessWidget {
  final VoidCallback? onDownvote;
  final VoidCallback? onSuperVote;
  final VoidCallback? onUpvote;
  final int superVoteCount;
  final bool enabled;

  const VoteButtons({
    super.key,
    this.onDownvote,
    this.onSuperVote,
    this.onUpvote,
    this.superVoteCount = 0,
    this.enabled = true,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 40, vertical: 12),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
        children: [
          // Downvote button (X).
          _VoteActionButton(
            icon: Icons.close_rounded,
            color: AppColors.error,
            size: 56,
            iconSize: 30,
            onTap: enabled ? onDownvote : null,
            semanticLabel: 'Downvote',
          ),

          // Super vote button (star) with badge.
          _SuperVoteButton(
            count: superVoteCount,
            onTap: enabled ? onSuperVote : null,
          ),

          // Upvote button (heart).
          _VoteActionButton(
            icon: Icons.favorite_rounded,
            color: AppColors.success,
            size: 56,
            iconSize: 30,
            onTap: enabled ? onUpvote : null,
            semanticLabel: 'Upvote',
          ),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Individual vote action button with animated press effect
// ---------------------------------------------------------------------------

class _VoteActionButton extends StatefulWidget {
  final IconData icon;
  final Color color;
  final double size;
  final double iconSize;
  final VoidCallback? onTap;
  final String semanticLabel;

  const _VoteActionButton({
    required this.icon,
    required this.color,
    required this.size,
    required this.iconSize,
    this.onTap,
    required this.semanticLabel,
  });

  @override
  State<_VoteActionButton> createState() => _VoteActionButtonState();
}

class _VoteActionButtonState extends State<_VoteActionButton>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _scaleAnimation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 150),
    );
    _scaleAnimation = Tween<double>(begin: 1.0, end: 0.85).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _handleTapDown(TapDownDetails _) {
    if (widget.onTap == null) return;
    _controller.forward();
  }

  void _handleTapUp(TapUpDetails _) {
    _controller.reverse();
  }

  void _handleTapCancel() {
    _controller.reverse();
  }

  void _handleTap() {
    if (widget.onTap == null) return;
    HapticFeedback.mediumImpact();
    widget.onTap?.call();
  }

  @override
  Widget build(BuildContext context) {
    final isDisabled = widget.onTap == null;

    return Semantics(
      label: widget.semanticLabel,
      button: true,
      child: GestureDetector(
        onTapDown: _handleTapDown,
        onTapUp: _handleTapUp,
        onTapCancel: _handleTapCancel,
        onTap: _handleTap,
        child: AnimatedBuilder(
          animation: _scaleAnimation,
          builder: (context, child) {
            return Transform.scale(
              scale: _scaleAnimation.value,
              child: child,
            );
          },
          child: Container(
            width: widget.size,
            height: widget.size,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: isDisabled
                  ? widget.color.withValues(alpha: 0.15)
                  : widget.color.withValues(alpha: 0.15),
              border: Border.all(
                color: isDisabled
                    ? widget.color.withValues(alpha: 0.3)
                    : widget.color,
                width: 2.5,
              ),
              boxShadow: isDisabled
                  ? null
                  : [
                      BoxShadow(
                        color: widget.color.withValues(alpha: 0.3),
                        blurRadius: 12,
                        offset: const Offset(0, 4),
                      ),
                    ],
            ),
            child: Icon(
              widget.icon,
              color: isDisabled
                  ? widget.color.withValues(alpha: 0.4)
                  : widget.color,
              size: widget.iconSize,
            ),
          ),
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Super vote button with count badge
// ---------------------------------------------------------------------------

class _SuperVoteButton extends StatefulWidget {
  final int count;
  final VoidCallback? onTap;

  const _SuperVoteButton({
    required this.count,
    this.onTap,
  });

  @override
  State<_SuperVoteButton> createState() => _SuperVoteButtonState();
}

class _SuperVoteButtonState extends State<_SuperVoteButton>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _scaleAnimation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 150),
    );
    _scaleAnimation = Tween<double>(begin: 1.0, end: 0.85).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _handleTapDown(TapDownDetails _) {
    if (widget.onTap == null) return;
    _controller.forward();
  }

  void _handleTapUp(TapUpDetails _) {
    _controller.reverse();
  }

  void _handleTapCancel() {
    _controller.reverse();
  }

  void _handleTap() {
    if (widget.onTap == null) return;
    HapticFeedback.heavyImpact();
    widget.onTap?.call();
  }

  @override
  Widget build(BuildContext context) {
    final hasVotes = widget.count > 0;
    final isDisabled = widget.onTap == null;

    return Semantics(
      label: 'Super Vote. ${ widget.count} remaining',
      button: true,
      child: GestureDetector(
        onTapDown: _handleTapDown,
        onTapUp: _handleTapUp,
        onTapCancel: _handleTapCancel,
        onTap: _handleTap,
        child: AnimatedBuilder(
          animation: _scaleAnimation,
          builder: (context, child) {
            return Transform.scale(
              scale: _scaleAnimation.value,
              child: child,
            );
          },
          child: Stack(
            clipBehavior: Clip.none,
            children: [
              // Main button.
              Container(
                width: 68,
                height: 68,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: hasVotes && !isDisabled
                      ? const LinearGradient(
                          colors: [
                            AppColors.accent,
                            AppColors.primary,
                          ],
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                        )
                      : null,
                  color: !hasVotes || isDisabled
                      ? AppColors.lightDisabled.withValues(alpha: 0.3)
                      : null,
                  boxShadow: hasVotes && !isDisabled
                      ? [
                          BoxShadow(
                            color: AppColors.primary.withValues(alpha: 0.4),
                            blurRadius: 16,
                            offset: const Offset(0, 4),
                          ),
                        ]
                      : null,
                ),
                child: Icon(
                  Icons.star_rounded,
                  color: hasVotes && !isDisabled
                      ? AppColors.white
                      : AppColors.lightDisabled,
                  size: 36,
                ),
              ),

              // Count badge.
              Positioned(
                top: -4,
                right: -4,
                child: Container(
                  constraints: const BoxConstraints(
                    minWidth: 24,
                    minHeight: 24,
                  ),
                  padding: const EdgeInsets.symmetric(horizontal: 6),
                  decoration: BoxDecoration(
                    color: hasVotes ? AppColors.white : AppColors.lightDisabled,
                    borderRadius: BorderRadius.circular(12),
                    boxShadow: [
                      BoxShadow(
                        color: AppColors.black.withValues(alpha: 0.2),
                        blurRadius: 4,
                        offset: const Offset(0, 2),
                      ),
                    ],
                  ),
                  child: Center(
                    child: Text(
                      '${widget.count}',
                      style: AppTextStyles.bodySmallBold.copyWith(
                        color: hasVotes
                            ? AppColors.primary
                            : AppColors.white,
                        fontSize: 12,
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
