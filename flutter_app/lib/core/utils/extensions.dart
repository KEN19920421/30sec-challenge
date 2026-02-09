import 'package:flutter/material.dart';

// =============================================================================
// BuildContext extensions
// =============================================================================

extension BuildContextX on BuildContext {
  // ---------------------------------------------------------------------------
  // Theme shortcuts
  // ---------------------------------------------------------------------------

  ThemeData get theme => Theme.of(this);
  ColorScheme get colorScheme => theme.colorScheme;
  TextTheme get textTheme => theme.textTheme;
  bool get isDarkMode => theme.brightness == Brightness.dark;

  // ---------------------------------------------------------------------------
  // MediaQuery shortcuts
  // ---------------------------------------------------------------------------

  MediaQueryData get mediaQuery => MediaQuery.of(this);
  Size get screenSize => mediaQuery.size;
  double get screenWidth => screenSize.width;
  double get screenHeight => screenSize.height;
  EdgeInsets get padding => mediaQuery.padding;
  double get topPadding => padding.top;
  double get bottomPadding => padding.bottom;
  double get keyboardHeight => mediaQuery.viewInsets.bottom;
  bool get isKeyboardOpen => keyboardHeight > 0;

  // ---------------------------------------------------------------------------
  // Navigation shortcut
  // ---------------------------------------------------------------------------

  NavigatorState get navigator => Navigator.of(this);

  // ---------------------------------------------------------------------------
  // Snackbar helpers
  // ---------------------------------------------------------------------------

  void showSnackBar(String message, {Duration? duration}) {
    ScaffoldMessenger.of(this)
      ..hideCurrentSnackBar()
      ..showSnackBar(
        SnackBar(
          content: Text(message),
          duration: duration ?? const Duration(seconds: 3),
        ),
      );
  }

  void showErrorSnackBar(String message) {
    ScaffoldMessenger.of(this)
      ..hideCurrentSnackBar()
      ..showSnackBar(
        SnackBar(
          content: Text(message),
          backgroundColor: colorScheme.error,
          duration: const Duration(seconds: 4),
        ),
      );
  }

  void showSuccessSnackBar(String message) {
    ScaffoldMessenger.of(this)
      ..hideCurrentSnackBar()
      ..showSnackBar(
        SnackBar(
          content: Text(message),
          backgroundColor: const Color(0xFF06D6A0),
          duration: const Duration(seconds: 3),
        ),
      );
  }
}

// =============================================================================
// String extensions
// =============================================================================

extension StringX on String {
  /// Capitalize first letter.
  String get capitalized =>
      isEmpty ? this : '${this[0].toUpperCase()}${substring(1)}';

  /// Title Case Every Word.
  String get titleCase =>
      split(' ').map((word) => word.capitalized).join(' ');

  /// Truncate with ellipsis.
  String truncate(int maxLength) {
    if (length <= maxLength) return this;
    return '${substring(0, maxLength)}...';
  }

  /// Returns null instead of empty string (useful for optional API fields).
  String? get nullIfEmpty => isEmpty ? null : this;

  /// Whether the string is a valid URL.
  bool get isUrl => Uri.tryParse(this)?.hasScheme ?? false;

  /// Strip leading/trailing whitespace and collapse inner whitespace.
  String get normalized => trim().replaceAll(RegExp(r'\s+'), ' ');
}

// =============================================================================
// Nullable String extensions
// =============================================================================

extension NullableStringX on String? {
  /// Returns true if the string is null or empty.
  bool get isNullOrEmpty => this == null || this!.isEmpty;

  /// Returns true if the string is not null and not empty.
  bool get isNotNullOrEmpty => !isNullOrEmpty;

  /// Returns the string or a fallback.
  String orDefault([String fallback = '']) => this ?? fallback;
}

// =============================================================================
// Num extensions (for spacing / sizing)
// =============================================================================

extension NumSpacingX on num {
  /// Horizontal [SizedBox].
  SizedBox get horizontalSpace => SizedBox(width: toDouble());

  /// Vertical [SizedBox].
  SizedBox get verticalSpace => SizedBox(height: toDouble());

  /// Symmetric horizontal padding.
  EdgeInsets get horizontalPadding =>
      EdgeInsets.symmetric(horizontal: toDouble());

  /// Symmetric vertical padding.
  EdgeInsets get verticalPadding => EdgeInsets.symmetric(vertical: toDouble());

  /// All-sides padding.
  EdgeInsets get allPadding => EdgeInsets.all(toDouble());

  /// Border radius with this value on all corners.
  BorderRadius get circularRadius => BorderRadius.circular(toDouble());
}

// =============================================================================
// Duration extensions
// =============================================================================

extension DurationX on Duration {
  /// "MM:SS" format (e.g. "00:30").
  String get mmss {
    final minutes = inMinutes.remainder(60).toString().padLeft(2, '0');
    final seconds = inSeconds.remainder(60).toString().padLeft(2, '0');
    return '$minutes:$seconds';
  }

  /// "HH:MM:SS" format.
  String get hhmmss {
    final hours = inHours.toString().padLeft(2, '0');
    final minutes = inMinutes.remainder(60).toString().padLeft(2, '0');
    final seconds = inSeconds.remainder(60).toString().padLeft(2, '0');
    return '$hours:$minutes:$seconds';
  }
}

// =============================================================================
// List extensions
// =============================================================================

extension ListX<T> on List<T> {
  /// Safe element access -- returns null instead of throwing.
  T? getOrNull(int index) =>
      (index >= 0 && index < length) ? this[index] : null;
}

// =============================================================================
// DateTime extensions
// =============================================================================

extension DateTimeX on DateTime {
  /// Whether this date is the same calendar day as [other].
  bool isSameDay(DateTime other) =>
      year == other.year && month == other.month && day == other.day;

  /// Start of day (midnight).
  DateTime get startOfDay => DateTime(year, month, day);

  /// End of day (23:59:59.999).
  DateTime get endOfDay => DateTime(year, month, day, 23, 59, 59, 999);
}
