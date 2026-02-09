import 'package:flutter/material.dart';

import '../../../../core/theme/app_colors.dart';

/// Row of camera control buttons: flash toggle, camera flip, and close.
///
/// Each button has a semi-transparent circular background and is styled
/// to sit on top of the camera preview.
class CameraControls extends StatelessWidget {
  /// Whether the flash is currently on.
  final bool isFlashOn;

  /// Whether the front camera is active.
  final bool isFrontCamera;

  /// Whether camera flip is available (i.e., device has multiple cameras).
  final bool canFlip;

  /// Whether controls should be enabled (disabled during recording).
  final bool isRecording;

  final VoidCallback? onFlashToggle;
  final VoidCallback? onFlipCamera;
  final VoidCallback? onClose;

  const CameraControls({
    super.key,
    this.isFlashOn = false,
    this.isFrontCamera = true,
    this.canFlip = true,
    this.isRecording = false,
    this.onFlashToggle,
    this.onFlipCamera,
    this.onClose,
  });

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            // Close button (left).
            _ControlButton(
              icon: Icons.close_rounded,
              onTap: onClose,
              // Always enabled, even during recording.
            ),

            const Spacer(),

            // Flash toggle.
            _ControlButton(
              icon: isFlashOn
                  ? Icons.flash_on_rounded
                  : Icons.flash_off_rounded,
              onTap: onFlashToggle,
              isActive: isFlashOn,
              enabled: !isRecording || true, // Flash can toggle while recording.
            ),

            const SizedBox(width: 12),

            // Flip camera.
            _ControlButton(
              icon: Icons.cameraswitch_rounded,
              onTap: onFlipCamera,
              enabled: !isRecording && canFlip,
            ),
          ],
        ),
      ),
    );
  }
}

class _ControlButton extends StatelessWidget {
  final IconData icon;
  final VoidCallback? onTap;
  final bool isActive;
  final bool enabled;

  const _ControlButton({
    required this.icon,
    this.onTap,
    this.isActive = false,
    this.enabled = true,
  });

  @override
  Widget build(BuildContext context) {
    final effectiveOnTap = enabled ? onTap : null;

    return GestureDetector(
      onTap: effectiveOnTap,
      child: AnimatedOpacity(
        duration: const Duration(milliseconds: 200),
        opacity: enabled ? 1.0 : 0.4,
        child: Container(
          width: 44,
          height: 44,
          decoration: BoxDecoration(
            color: isActive
                ? AppColors.white.withValues(alpha: 0.3)
                : AppColors.black.withValues(alpha: 0.4),
            shape: BoxShape.circle,
            border: Border.all(
              color: AppColors.white.withValues(alpha: 0.2),
              width: 1,
            ),
          ),
          child: Icon(
            icon,
            color: isActive ? AppColors.accent : AppColors.white,
            size: 22,
          ),
        ),
      ),
    );
  }
}
