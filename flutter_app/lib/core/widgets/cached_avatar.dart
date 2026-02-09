import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';

import '../theme/app_colors.dart';

/// A circular avatar widget that caches remote images and shows a placeholder
/// or initials while loading.
///
/// ```dart
/// CachedAvatar(
///   imageUrl: user.avatarUrl,
///   name: user.displayName,
///   radius: 24,
/// )
/// ```
class CachedAvatar extends StatelessWidget {
  /// The remote image URL. If null, the [name] initials or a default icon
  /// is displayed.
  final String? imageUrl;

  /// Name used to derive initials when no image is available.
  final String? name;

  /// Radius of the circular avatar.
  final double radius;

  /// Optional border color. Defaults to transparent (no border).
  final Color? borderColor;

  /// Border width (only visible when [borderColor] is set).
  final double borderWidth;

  /// Background color behind the placeholder.
  final Color? backgroundColor;

  /// Called when the avatar is tapped.
  final VoidCallback? onTap;

  const CachedAvatar({
    super.key,
    this.imageUrl,
    this.name,
    this.radius = 24,
    this.borderColor,
    this.borderWidth = 2,
    this.backgroundColor,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final bgColor =
        backgroundColor ?? Theme.of(context).colorScheme.surfaceContainerHighest;

    Widget avatar;

    if (imageUrl != null && imageUrl!.isNotEmpty) {
      avatar = CachedNetworkImage(
        imageUrl: imageUrl!,
        imageBuilder: (context, imageProvider) => CircleAvatar(
          radius: radius,
          backgroundImage: imageProvider,
          backgroundColor: bgColor,
        ),
        placeholder: (context, url) => _buildPlaceholder(bgColor),
        errorWidget: (context, url, error) => _buildFallback(bgColor),
      );
    } else {
      avatar = _buildFallback(bgColor);
    }

    if (borderColor != null) {
      avatar = Container(
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          border: Border.all(color: borderColor!, width: borderWidth),
        ),
        child: avatar,
      );
    }

    if (onTap != null) {
      return GestureDetector(
        onTap: onTap,
        child: avatar,
      );
    }

    return avatar;
  }

  // ---------------------------------------------------------------------------
  // Internal builders
  // ---------------------------------------------------------------------------

  Widget _buildPlaceholder(Color bgColor) {
    return CircleAvatar(
      radius: radius,
      backgroundColor: bgColor,
      child: SizedBox(
        width: radius,
        height: radius,
        child: const CircularProgressIndicator(strokeWidth: 2),
      ),
    );
  }

  Widget _buildFallback(Color bgColor) {
    final initials = _initials;
    if (initials != null) {
      return CircleAvatar(
        radius: radius,
        backgroundColor: AppColors.primary.withValues(alpha: 0.15),
        child: Text(
          initials,
          style: TextStyle(
            fontSize: radius * 0.45,
            fontWeight: FontWeight.w700,
            color: AppColors.primary,
          ),
        ),
      );
    }

    return CircleAvatar(
      radius: radius,
      backgroundColor: bgColor,
      child: Icon(
        Icons.person_rounded,
        size: radius * 0.9,
        color: AppColors.lightDisabled,
      ),
    );
  }

  String? get _initials {
    if (name == null || name!.trim().isEmpty) return null;
    final parts = name!.trim().split(RegExp(r'\s+'));
    if (parts.length >= 2) {
      return '${parts[0][0]}${parts[1][0]}'.toUpperCase();
    }
    return parts[0][0].toUpperCase();
  }
}
