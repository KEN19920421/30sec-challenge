import 'dart:async';

import 'package:flutter/material.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';

/// Animated countdown widget that displays hours:minutes:seconds.
///
/// Changes color as time runs out:
///   - Green when > 1 hour remaining
///   - Yellow/amber when 10 min - 1 hour remaining
///   - Red when < 10 minutes remaining
///   - Pulses in the last 60 seconds
class ChallengeCountdown extends StatefulWidget {
  /// The target time to count down to.
  final DateTime targetTime;

  /// Label shown above the countdown (e.g., "Ends in" or "Starts in").
  final String label;

  /// Called when the countdown reaches zero.
  final VoidCallback? onComplete;

  /// Text style override for the countdown digits.
  final TextStyle? digitStyle;

  /// Whether to show the compact (inline) variant.
  final bool compact;

  const ChallengeCountdown({
    super.key,
    required this.targetTime,
    this.label = 'Ends in',
    this.onComplete,
    this.digitStyle,
    this.compact = false,
  });

  @override
  State<ChallengeCountdown> createState() => _ChallengeCountdownState();
}

class _ChallengeCountdownState extends State<ChallengeCountdown>
    with SingleTickerProviderStateMixin {
  Timer? _timer;
  late Duration _remaining;
  late AnimationController _pulseController;

  @override
  void initState() {
    super.initState();
    _remaining = _calculateRemaining();
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 800),
    );
    _startTimer();
  }

  @override
  void didUpdateWidget(ChallengeCountdown oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.targetTime != widget.targetTime) {
      _remaining = _calculateRemaining();
    }
  }

  @override
  void dispose() {
    _timer?.cancel();
    _pulseController.dispose();
    super.dispose();
  }

  Duration _calculateRemaining() {
    final diff = widget.targetTime.difference(DateTime.now());
    return diff.isNegative ? Duration.zero : diff;
  }

  void _startTimer() {
    _timer = Timer.periodic(const Duration(seconds: 1), (_) {
      final remaining = _calculateRemaining();
      if (remaining == Duration.zero) {
        _timer?.cancel();
        _pulseController.stop();
        widget.onComplete?.call();
      } else if (remaining.inSeconds <= 60 && !_pulseController.isAnimating) {
        _pulseController.repeat(reverse: true);
      }
      if (mounted) {
        setState(() => _remaining = remaining);
      }
    });
  }

  Color _getColor() {
    final seconds = _remaining.inSeconds;
    if (seconds <= 0) return AppColors.error;
    if (seconds < 600) return AppColors.error; // < 10 min
    if (seconds < 3600) return AppColors.warning; // < 1 hour
    return AppColors.success;
  }

  @override
  Widget build(BuildContext context) {
    final hours = _remaining.inHours;
    final minutes = _remaining.inMinutes.remainder(60);
    final seconds = _remaining.inSeconds.remainder(60);

    final color = _getColor();
    final isUrgent = _remaining.inSeconds <= 60;

    if (widget.compact) {
      return _buildCompact(hours, minutes, seconds, color, isUrgent);
    }

    return _buildFull(hours, minutes, seconds, color, isUrgent);
  }

  Widget _buildCompact(
      int hours, int minutes, int seconds, Color color, bool isUrgent) {
    final text =
        '${hours.toString().padLeft(2, '0')}:${minutes.toString().padLeft(2, '0')}:${seconds.toString().padLeft(2, '0')}';

    Widget child = Text(
      text,
      style: (widget.digitStyle ?? AppTextStyles.bodyMediumBold)
          .copyWith(color: color),
    );

    if (isUrgent) {
      child = AnimatedBuilder(
        animation: _pulseController,
        builder: (context, child) {
          return Opacity(
            opacity: 0.5 + (_pulseController.value * 0.5),
            child: child,
          );
        },
        child: child,
      );
    }

    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(Icons.timer_outlined, size: 16, color: color),
        const SizedBox(width: 4),
        child,
      ],
    );
  }

  Widget _buildFull(
      int hours, int minutes, int seconds, Color color, bool isUrgent) {
    final style = widget.digitStyle ?? AppTextStyles.displayMedium;

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(
          widget.label,
          style: AppTextStyles.caption.copyWith(
            color: Theme.of(context)
                .colorScheme
                .onSurface
                .withValues(alpha: 0.6),
          ),
        ),
        const SizedBox(height: 8),
        _buildScaledRow(hours, minutes, seconds, color, style, isUrgent),
      ],
    );
  }

  Widget _buildScaledRow(int hours, int minutes, int seconds, Color color,
      TextStyle style, bool isUrgent) {
    final row = Row(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        _CountdownSegment(
          value: hours.toString().padLeft(2, '0'),
          label: 'HRS',
          color: color,
          style: style,
        ),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 4),
          child: Text(':', style: style.copyWith(color: color)),
        ),
        _CountdownSegment(
          value: minutes.toString().padLeft(2, '0'),
          label: 'MIN',
          color: color,
          style: style,
        ),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 4),
          child: Text(':', style: style.copyWith(color: color)),
        ),
        _CountdownSegment(
          value: seconds.toString().padLeft(2, '0'),
          label: 'SEC',
          color: color,
          style: style,
        ),
      ],
    );

    if (!isUrgent) return row;

    return AnimatedBuilder(
      animation: _pulseController,
      builder: (context, child) {
        final scale = 1.0 + (_pulseController.value * 0.05);
        return Transform.scale(scale: scale, child: child);
      },
      child: row,
    );
  }
}

// =============================================================================
// Private helper widgets
// =============================================================================

class _CountdownSegment extends StatelessWidget {
  final String value;
  final String label;
  final Color color;
  final TextStyle style;

  const _CountdownSegment({
    required this.value,
    required this.label,
    required this.color,
    required this.style,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          decoration: BoxDecoration(
            color: color.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: color.withValues(alpha: 0.3)),
          ),
          child: Text(
            value,
            style: style.copyWith(color: color),
          ),
        ),
        const SizedBox(height: 4),
        Text(
          label,
          style: AppTextStyles.overline.copyWith(
            color: color.withValues(alpha: 0.8),
          ),
        ),
      ],
    );
  }
}

/// Thin wrapper around [AnimatedWidget] that accepts a builder + child,
/// avoiding the deprecation of the raw `AnimatedBuilder` constructor.
class AnimatedBuilder extends AnimatedWidget {
  final Widget Function(BuildContext context, Widget? child) builder;
  final Widget? child;

  const AnimatedBuilder({
    super.key,
    required Animation<double> animation,
    required this.builder,
    this.child,
  }) : super(listenable: animation);

  @override
  Widget build(BuildContext context) => builder(context, child);
}
