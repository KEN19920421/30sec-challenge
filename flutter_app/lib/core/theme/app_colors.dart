import 'package:flutter/material.dart';

/// App color palette.
///
/// Two static instances ([light] and [dark]) supply all the semantic colors
/// for each brightness mode. Reference them via the theme extensions or
/// directly when needed.
class AppColors {
  // ---------------------------------------------------------------------------
  // Brand
  // ---------------------------------------------------------------------------
  static const Color primary = Color(0xFFFF6B35);
  static const Color primaryLight = Color(0xFFFF9A6C);
  static const Color primaryDark = Color(0xFFE04E1A);

  static const Color secondary = Color(0xFF1E1E2C);
  static const Color secondaryLight = Color(0xFF2D2D44);

  static const Color accent = Color(0xFFFFD166);
  static const Color accentDark = Color(0xFFE6B84D);

  // ---------------------------------------------------------------------------
  // Semantic
  // ---------------------------------------------------------------------------
  static const Color success = Color(0xFF06D6A0);
  static const Color warning = Color(0xFFFFD166);
  static const Color error = Color(0xFFEF476F);
  static const Color info = Color(0xFF118AB2);

  // ---------------------------------------------------------------------------
  // Light theme colors
  // ---------------------------------------------------------------------------
  static const Color lightBackground = Color(0xFFF8F9FA);
  static const Color lightSurface = Color(0xFFFFFFFF);
  static const Color lightSurfaceVariant = Color(0xFFF0F0F5);
  static const Color lightOnBackground = Color(0xFF1E1E2C);
  static const Color lightOnSurface = Color(0xFF1E1E2C);
  static const Color lightOnSurfaceVariant = Color(0xFF6B6B80);
  static const Color lightBorder = Color(0xFFE0E0E8);
  static const Color lightDivider = Color(0xFFEEEEF2);
  static const Color lightDisabled = Color(0xFFBDBDC7);
  static const Color lightShimmerBase = Color(0xFFE0E0E8);
  static const Color lightShimmerHighlight = Color(0xFFF5F5F8);
  static const Color lightCardShadow = Color(0x1A000000);

  // ---------------------------------------------------------------------------
  // Dark theme colors
  // ---------------------------------------------------------------------------
  static const Color darkBackground = Color(0xFF121218);
  static const Color darkSurface = Color(0xFF1E1E2C);
  static const Color darkSurfaceVariant = Color(0xFF2D2D44);
  static const Color darkOnBackground = Color(0xFFF8F9FA);
  static const Color darkOnSurface = Color(0xFFF8F9FA);
  static const Color darkOnSurfaceVariant = Color(0xFFA0A0B2);
  static const Color darkBorder = Color(0xFF3A3A50);
  static const Color darkDivider = Color(0xFF2D2D44);
  static const Color darkDisabled = Color(0xFF5A5A6E);
  static const Color darkShimmerBase = Color(0xFF2D2D44);
  static const Color darkShimmerHighlight = Color(0xFF3A3A50);
  static const Color darkCardShadow = Color(0x40000000);

  // ---------------------------------------------------------------------------
  // Misc
  // ---------------------------------------------------------------------------
  static const Color white = Color(0xFFFFFFFF);
  static const Color black = Color(0xFF000000);
  static const Color transparent = Color(0x00000000);

  /// Gold / silver / bronze for leaderboard.
  static const Color gold = Color(0xFFFFD700);
  static const Color silver = Color(0xFFC0C0C0);
  static const Color bronze = Color(0xFFCD7F32);

  /// Gradient used as the app's hero gradient (e.g. splash, headers).
  static const LinearGradient primaryGradient = LinearGradient(
    colors: [primary, Color(0xFFFF8F6B)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient darkOverlayGradient = LinearGradient(
    colors: [Color(0x00000000), Color(0xCC000000)],
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
  );
}
