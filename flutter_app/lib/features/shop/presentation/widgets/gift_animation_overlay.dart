import 'package:flutter/material.dart';
import 'package:lottie/lottie.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';

/// Full-screen overlay that plays a Lottie animation when a gift is sent/received.
///
/// Shows the gift icon, sender name, and gift name with a semi-transparent
/// background. Auto-dismisses after the animation completes.
class GiftAnimationOverlay extends StatefulWidget {
  final String giftName;
  final String? senderName;
  final String? animationUrl;
  final String? iconUrl;
  final VoidCallback? onComplete;

  const GiftAnimationOverlay({
    super.key,
    required this.giftName,
    this.senderName,
    this.animationUrl,
    this.iconUrl,
    this.onComplete,
  });

  /// Show the gift animation overlay on top of the current screen.
  static void show(
    BuildContext context, {
    required String giftName,
    String? senderName,
    String? animationUrl,
    String? iconUrl,
  }) {
    final overlay = OverlayEntry(
      builder: (ctx) => GiftAnimationOverlay(
        giftName: giftName,
        senderName: senderName,
        animationUrl: animationUrl,
        iconUrl: iconUrl,
      ),
    );

    Overlay.of(context).insert(overlay);

    // Auto-dismiss after animation duration.
    Future.delayed(const Duration(seconds: 3), () {
      if (overlay.mounted) {
        overlay.remove();
      }
    });
  }

  @override
  State<GiftAnimationOverlay> createState() => _GiftAnimationOverlayState();
}

class _GiftAnimationOverlayState extends State<GiftAnimationOverlay>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;
  late final Animation<double> _fadeIn;
  late final Animation<double> _scale;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2500),
    );

    _fadeIn = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(
        parent: _controller,
        curve: const Interval(0.0, 0.2, curve: Curves.easeIn),
      ),
    );

    _scale = TweenSequence<double>([
      TweenSequenceItem(
        tween: Tween(begin: 0.3, end: 1.2)
            .chain(CurveTween(curve: Curves.easeOutBack)),
        weight: 30,
      ),
      TweenSequenceItem(
        tween: Tween(begin: 1.2, end: 1.0)
            .chain(CurveTween(curve: Curves.easeIn)),
        weight: 10,
      ),
      TweenSequenceItem(
        tween: ConstantTween(1.0),
        weight: 40,
      ),
      TweenSequenceItem(
        tween: Tween(begin: 1.0, end: 0.0)
            .chain(CurveTween(curve: Curves.easeIn)),
        weight: 20,
      ),
    ]).animate(_controller);

    _controller.forward().then((_) {
      widget.onComplete?.call();
    });
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, child) {
        return IgnorePointer(
          child: Material(
            color: Colors.transparent,
            child: Container(
              width: double.infinity,
              height: double.infinity,
              color: Colors.black.withValues(alpha: 0.4 * _fadeIn.value),
              child: Center(
                child: Opacity(
                  opacity: _fadeIn.value,
                  child: Transform.scale(
                    scale: _scale.value,
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        // Lottie animation or fallback icon
                        _buildAnimation(),

                        const SizedBox(height: 16),

                        // Gift name
                        Text(
                          widget.giftName,
                          style: AppTextStyles.heading2.copyWith(
                            color: Colors.white,
                            shadows: [
                              const Shadow(
                                color: Colors.black54,
                                blurRadius: 8,
                              ),
                            ],
                          ),
                        ),

                        // Sender name
                        if (widget.senderName != null) ...[
                          const SizedBox(height: 8),
                          Text(
                            'from ${widget.senderName}',
                            style: AppTextStyles.bodyLarge.copyWith(
                              color: Colors.white.withValues(alpha: 0.9),
                              shadows: [
                                const Shadow(
                                  color: Colors.black54,
                                  blurRadius: 6,
                                ),
                              ],
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _buildAnimation() {
    // Try Lottie animation first.
    if (widget.animationUrl != null && widget.animationUrl!.isNotEmpty) {
      return SizedBox(
        width: 200,
        height: 200,
        child: Lottie.network(
          widget.animationUrl!,
          controller: _controller,
          width: 200,
          height: 200,
          errorBuilder: (context, error, stackTrace) {
            return _buildFallbackIcon();
          },
        ),
      );
    }

    return _buildFallbackIcon();
  }

  Widget _buildFallbackIcon() {
    return Container(
      width: 120,
      height: 120,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        gradient: const LinearGradient(
          colors: [AppColors.accent, AppColors.primary],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        boxShadow: [
          BoxShadow(
            color: AppColors.primary.withValues(alpha: 0.5),
            blurRadius: 24,
            spreadRadius: 4,
          ),
        ],
      ),
      child: const Icon(
        Icons.card_giftcard,
        color: Colors.white,
        size: 56,
      ),
    );
  }
}
