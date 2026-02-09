import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';

/// Small badge displaying a sponsor logo and name.
///
/// Renders "Sponsored by" text alongside the sponsor's logo image.
/// If no logo URL is provided, only the text + name is shown.
class SponsorBadge extends StatelessWidget {
  /// The sponsor's display name.
  final String sponsorName;

  /// Optional URL for the sponsor's logo image.
  final String? sponsorLogoUrl;

  /// Whether to use the compact (inline) variant.
  final bool compact;

  /// Background color override.
  final Color? backgroundColor;

  const SponsorBadge({
    super.key,
    required this.sponsorName,
    this.sponsorLogoUrl,
    this.compact = false,
    this.backgroundColor,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final bgColor = backgroundColor ??
        theme.colorScheme.surfaceContainerHighest.withValues(alpha: 0.8);

    if (compact) {
      return _buildCompact(theme, bgColor);
    }

    return _buildFull(theme, bgColor);
  }

  Widget _buildCompact(ThemeData theme, Color bgColor) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(6),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (sponsorLogoUrl != null) ...[
            ClipRRect(
              borderRadius: BorderRadius.circular(3),
              child: CachedNetworkImage(
                imageUrl: sponsorLogoUrl!,
                width: 16,
                height: 16,
                fit: BoxFit.contain,
                errorWidget: (_, __, ___) => const Icon(
                  Icons.business,
                  size: 14,
                  color: AppColors.primary,
                ),
              ),
            ),
            const SizedBox(width: 4),
          ],
          Text(
            'by $sponsorName',
            style: AppTextStyles.overline.copyWith(
              color: theme.colorScheme.onSurface.withValues(alpha: 0.7),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFull(ThemeData theme, Color bgColor) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: theme.colorScheme.outline.withValues(alpha: 0.1),
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (sponsorLogoUrl != null) ...[
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: AppColors.white,
                borderRadius: BorderRadius.circular(8),
                boxShadow: [
                  BoxShadow(
                    color: AppColors.black.withValues(alpha: 0.08),
                    blurRadius: 4,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(8),
                child: CachedNetworkImage(
                  imageUrl: sponsorLogoUrl!,
                  width: 40,
                  height: 40,
                  fit: BoxFit.contain,
                  errorWidget: (_, __, ___) => const Icon(
                    Icons.business,
                    size: 24,
                    color: AppColors.primary,
                  ),
                ),
              ),
            ),
            const SizedBox(width: 12),
          ],
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                'SPONSORED BY',
                style: AppTextStyles.overline.copyWith(
                  color: theme.colorScheme.onSurface.withValues(alpha: 0.5),
                  letterSpacing: 1.5,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                sponsorName,
                style: AppTextStyles.bodyMediumBold.copyWith(
                  color: theme.colorScheme.onSurface,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
