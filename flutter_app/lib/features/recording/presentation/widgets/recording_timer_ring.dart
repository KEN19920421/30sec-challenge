import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';

/// Circular progress ring that fills over the recording duration.
///
/// Shows elapsed time in the center. The ring animates smoothly and
/// changes color in the last 5 seconds (transitions from primary to red).
class RecordingTimerRing extends StatelessWidget {
  /// Recording progress from 0.0 to 1.0.
  final double progress;

  /// Formatted elapsed time text to display in the center.
  final String elapsedText;

  /// Maximum recording duration in seconds (used for the last-5-seconds
  /// color change).
  final int maxDurationSeconds;

  /// Current elapsed seconds.
  final int elapsedSeconds;

  /// Diameter of the outer ring.
  final double size;

  /// Stroke width of the progress ring.
  final double strokeWidth;

  /// Widget to render in the center (e.g., record button). Overrides the
  /// default elapsed time text.
  final Widget? center;

  const RecordingTimerRing({
    super.key,
    required this.progress,
    required this.elapsedText,
    this.maxDurationSeconds = 30,
    this.elapsedSeconds = 0,
    this.size = 100,
    this.strokeWidth = 4,
    this.center,
  });

  @override
  Widget build(BuildContext context) {
    final remainingSeconds = maxDurationSeconds - elapsedSeconds;
    final isNearEnd = remainingSeconds <= 5 && remainingSeconds > 0;

    // Lerp color from primary to red in the last 5 seconds.
    final ringColor = isNearEnd
        ? Color.lerp(
            AppColors.primary,
            AppColors.error,
            1.0 - (remainingSeconds / 5.0),
          )!
        : AppColors.primary;

    return SizedBox(
      width: size,
      height: size,
      child: Stack(
        alignment: Alignment.center,
        children: [
          // Background track.
          SizedBox(
            width: size,
            height: size,
            child: CircularProgressIndicator(
              value: 1.0,
              strokeWidth: strokeWidth,
              color: ringColor.withValues(alpha: 0.15),
              strokeCap: StrokeCap.round,
            ),
          ),

          // Progress arc.
          SizedBox(
            width: size,
            height: size,
            child: TweenAnimationBuilder<double>(
              tween: Tween<double>(begin: 0.0, end: progress),
              duration: const Duration(milliseconds: 150),
              curve: Curves.linear,
              builder: (context, value, _) {
                return CustomPaint(
                  painter: _RingPainter(
                    progress: value,
                    color: ringColor,
                    strokeWidth: strokeWidth,
                  ),
                );
              },
            ),
          ),

          // Center content.
          center ??
              Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    elapsedText,
                    style: AppTextStyles.heading4.copyWith(
                      color: ringColor,
                      fontFeatures: [const FontFeature.tabularFigures()],
                    ),
                  ),
                  Text(
                    '/ ${maxDurationSeconds}s',
                    style: AppTextStyles.caption.copyWith(
                      color: ringColor.withValues(alpha: 0.6),
                    ),
                  ),
                ],
              ),
        ],
      ),
    );
  }
}

/// Custom painter for the progress arc with rounded caps.
class _RingPainter extends CustomPainter {
  final double progress;
  final Color color;
  final double strokeWidth;

  _RingPainter({
    required this.progress,
    required this.color,
    required this.strokeWidth,
  });

  @override
  void paint(Canvas canvas, Size size) {
    if (progress <= 0) return;

    final center = Offset(size.width / 2, size.height / 2);
    final radius = (size.width - strokeWidth) / 2;

    final paint = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = strokeWidth
      ..strokeCap = StrokeCap.round;

    // Start from the top (-90 degrees).
    const startAngle = -math.pi / 2;
    final sweepAngle = 2 * math.pi * progress;

    canvas.drawArc(
      Rect.fromCircle(center: center, radius: radius),
      startAngle,
      sweepAngle,
      false,
      paint,
    );
  }

  @override
  bool shouldRepaint(_RingPainter oldDelegate) =>
      progress != oldDelegate.progress ||
      color != oldDelegate.color ||
      strokeWidth != oldDelegate.strokeWidth;
}
