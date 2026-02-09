import '../constants/app_constants.dart';

/// Form-field validators returning an error message or null on success.
///
/// Designed for use with [TextFormField.validator].
class Validators {
  Validators._();

  // ---------------------------------------------------------------------------
  // Email
  // ---------------------------------------------------------------------------

  static final RegExp _emailRegExp = RegExp(
    r'^[a-zA-Z0-9.!#$%&*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}'
    r'[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$',
  );

  static String? email(String? value) {
    if (value == null || value.trim().isEmpty) {
      return 'Email is required.';
    }
    if (!_emailRegExp.hasMatch(value.trim())) {
      return 'Enter a valid email address.';
    }
    return null;
  }

  // ---------------------------------------------------------------------------
  // Password
  // ---------------------------------------------------------------------------

  static String? password(String? value) {
    if (value == null || value.isEmpty) {
      return 'Password is required.';
    }
    if (value.length < AppConstants.minPasswordLength) {
      return 'Password must be at least ${AppConstants.minPasswordLength} characters.';
    }
    if (!value.contains(RegExp(r'[A-Z]'))) {
      return 'Password must contain at least one uppercase letter.';
    }
    if (!value.contains(RegExp(r'[a-z]'))) {
      return 'Password must contain at least one lowercase letter.';
    }
    if (!value.contains(RegExp(r'[0-9]'))) {
      return 'Password must contain at least one number.';
    }
    return null;
  }

  /// Validates that two password fields match.
  static String? confirmPassword(String? value, String password) {
    final base = Validators.password(value);
    if (base != null) return base;
    if (value != password) {
      return 'Passwords do not match.';
    }
    return null;
  }

  // ---------------------------------------------------------------------------
  // Username
  // ---------------------------------------------------------------------------

  static final RegExp _usernameRegExp = RegExp(r'^[a-zA-Z0-9._]+$');

  static String? username(String? value) {
    if (value == null || value.trim().isEmpty) {
      return 'Username is required.';
    }
    final trimmed = value.trim();
    if (trimmed.length < AppConstants.minUsernameLength) {
      return 'Username must be at least ${AppConstants.minUsernameLength} characters.';
    }
    if (trimmed.length > AppConstants.maxUsernameLength) {
      return 'Username must be at most ${AppConstants.maxUsernameLength} characters.';
    }
    if (!_usernameRegExp.hasMatch(trimmed)) {
      return 'Username may only contain letters, numbers, dots, and underscores.';
    }
    if (trimmed.startsWith('.') || trimmed.endsWith('.')) {
      return 'Username cannot start or end with a dot.';
    }
    return null;
  }

  // ---------------------------------------------------------------------------
  // Display name
  // ---------------------------------------------------------------------------

  static String? displayName(String? value) {
    if (value == null || value.trim().isEmpty) {
      return 'Display name is required.';
    }
    if (value.trim().length > AppConstants.maxDisplayNameLength) {
      return 'Display name must be at most ${AppConstants.maxDisplayNameLength} characters.';
    }
    return null;
  }

  // ---------------------------------------------------------------------------
  // Bio
  // ---------------------------------------------------------------------------

  static String? bio(String? value) {
    if (value != null && value.length > AppConstants.maxBioLength) {
      return 'Bio must be at most ${AppConstants.maxBioLength} characters.';
    }
    return null;
  }

  // ---------------------------------------------------------------------------
  // Caption
  // ---------------------------------------------------------------------------

  static String? caption(String? value) {
    if (value != null && value.length > AppConstants.maxCaptionLength) {
      return 'Caption must be at most ${AppConstants.maxCaptionLength} characters.';
    }
    return null;
  }

  // ---------------------------------------------------------------------------
  // Generic
  // ---------------------------------------------------------------------------

  /// Field must not be empty.
  static String? required(String? value, [String fieldName = 'This field']) {
    if (value == null || value.trim().isEmpty) {
      return '$fieldName is required.';
    }
    return null;
  }

  /// Field must not exceed [maxLength].
  static String? maxLength(String? value, int maxLength,
      [String fieldName = 'This field']) {
    if (value != null && value.length > maxLength) {
      return '$fieldName must be at most $maxLength characters.';
    }
    return null;
  }

  /// Field must be at least [minLength].
  static String? minLength(String? value, int minLength,
      [String fieldName = 'This field']) {
    if (value == null || value.length < minLength) {
      return '$fieldName must be at least $minLength characters.';
    }
    return null;
  }
}
