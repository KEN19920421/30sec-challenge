import 'package:flutter/material.dart';

import '../theme/app_colors.dart';
import '../theme/app_text_styles.dart';

/// A full-screen semi-transparent overlay with a centered spinner and optional
/// message.
///
/// Use as a [Stack] child:
/// ```dart
/// Stack(
///   children: [
///     _pageContent(),
///     if (isLoading) const LoadingOverlay(message: 'Uploading...'),
///   ],
/// )
/// ```
///
/// Or show modally with [LoadingOverlay.show] / [LoadingOverlay.hide].
class LoadingOverlay extends StatelessWidget {
  final String? message;
  final Color? barrierColor;

  const LoadingOverlay({
    super.key,
    this.message,
    this.barrierColor,
  });

  // ---------------------------------------------------------------------------
  // Static modal helpers
  // ---------------------------------------------------------------------------

  static OverlayEntry? _overlayEntry;

  /// Show the overlay on top of everything.
  static void show(BuildContext context, {String? message}) {
    hide(); // remove any existing overlay first

    _overlayEntry = OverlayEntry(
      builder: (_) => LoadingOverlay(message: message),
    );
    Overlay.of(context).insert(_overlayEntry!);
  }

  /// Remove the overlay.
  static void hide() {
    _overlayEntry?.remove();
    _overlayEntry = null;
  }

  // ---------------------------------------------------------------------------
  // Build
  // ---------------------------------------------------------------------------

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: Container(
        color: barrierColor ?? Colors.black54,
        alignment: Alignment.center,
        child: _buildContent(context),
      ),
    );
  }

  Widget _buildContent(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 24),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(16),
        boxShadow: const [
          BoxShadow(
            color: AppColors.lightCardShadow,
            blurRadius: 20,
            offset: Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const SizedBox(
            width: 40,
            height: 40,
            child: CircularProgressIndicator(
              strokeWidth: 3,
              valueColor: AlwaysStoppedAnimation(AppColors.primary),
            ),
          ),
          if (message != null) ...[
            const SizedBox(height: 20),
            Text(
              message!,
              style: AppTextStyles.bodyMedium.copyWith(
                color: Theme.of(context).colorScheme.onSurface,
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ],
      ),
    );
  }
}
