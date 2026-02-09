/// Value object holding the JWT token pair and expiration metadata.
///
/// Returned by login, register, and token-refresh operations.
class AuthTokens {
  final String accessToken;
  final String refreshToken;

  /// Token lifetime in seconds from the moment of issuance.
  final int expiresIn;

  const AuthTokens({
    required this.accessToken,
    required this.refreshToken,
    this.expiresIn = 3600,
  });

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is AuthTokens &&
          runtimeType == other.runtimeType &&
          accessToken == other.accessToken &&
          refreshToken == other.refreshToken;

  @override
  int get hashCode => accessToken.hashCode ^ refreshToken.hashCode;

  @override
  String toString() =>
      'AuthTokens(accessToken: ${accessToken.substring(0, 10)}..., '
      'expiresIn: $expiresIn)';
}
