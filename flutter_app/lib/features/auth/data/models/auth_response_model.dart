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
  factory AuthResponseModel.fromJson(Map<String, dynamic> json) {
    // Support both snake_case and camelCase keys from the server.
    final data = json.containsKey('data')
        ? json['data'] as Map<String, dynamic>
        : json;

    return AuthResponseModel(
      accessToken: data['access_token'] as String? ??
          data['accessToken'] as String? ??
          '',
      refreshToken: data['refresh_token'] as String? ??
          data['refreshToken'] as String? ??
          '',
      expiresIn: data['expires_in'] as int? ??
          data['expiresIn'] as int? ??
          3600,
      user: data['user'] != null
          ? UserModel.fromJson(data['user'] as Map<String, dynamic>)
          : null,
    );
  }
}
