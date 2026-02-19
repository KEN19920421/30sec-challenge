import 'user_model.dart';

/// Parses the standard auth response envelope returned by login, register,
/// social-login, and token-refresh endpoints.
///
/// Expected API shape:
/// ```json
/// {
///   "success": true,
///   "data": {
///     "access_token": "...",
///     "refresh_token": "...",
///     "expires_in": 3600,
///     "user": { ... }
///   }
/// }
/// ```
/// Parse an `expiresIn` value that may be an int (seconds) or a
/// string like `"15m"`, `"1h"`, `"7d"`.
int _parseExpiresIn(dynamic value) {
  if (value == null) return 3600;
  if (value is int) return value;
  if (value is String) {
    final match = RegExp(r'^(\d+)([smhd]?)$').firstMatch(value);
    if (match != null) {
      final n = int.parse(match.group(1)!);
      switch (match.group(2)) {
        case 'm':
          return n * 60;
        case 'h':
          return n * 3600;
        case 'd':
          return n * 86400;
        default:
          return n;
      }
    }
  }
  return 3600;
}

class AuthResponseModel {
  final String accessToken;
  final String refreshToken;
  final int expiresIn;
  final UserModel? user;

  const AuthResponseModel({
    required this.accessToken,
    required this.refreshToken,
    this.expiresIn = 3600,
    this.user,
  });

  /// Parse from the `data` field of the API response.
  ///
  /// Supports two shapes:
  /// 1. Flat: `{ accessToken, refreshToken, user }`
  /// 2. Nested: `{ tokens: { accessToken, refreshToken }, user }`
  factory AuthResponseModel.fromJson(Map<String, dynamic> json) {
    // Unwrap outer `data` envelope if present.
    final data = json.containsKey('data')
        ? json['data'] as Map<String, dynamic>
        : json;

    // Tokens may be nested under a `tokens` key.
    final tokens = data['tokens'] as Map<String, dynamic>? ?? data;

    return AuthResponseModel(
      accessToken: tokens['access_token'] as String? ??
          tokens['accessToken'] as String? ??
          '',
      refreshToken: tokens['refresh_token'] as String? ??
          tokens['refreshToken'] as String? ??
          '',
      expiresIn: _parseExpiresIn(tokens['expires_in'] ?? tokens['expiresIn']),
      user: data['user'] != null
          ? UserModel.fromJson(data['user'] as Map<String, dynamic>)
          : null,
    );
  }
}
