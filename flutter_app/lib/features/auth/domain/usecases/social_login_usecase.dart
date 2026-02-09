import '../entities/auth_tokens.dart';
import '../entities/user.dart';
import '../repositories/auth_repository.dart';

/// Authenticates a user via a social identity provider (Google or Apple).
class SocialLoginUseCase {
  final AuthRepository _repository;

  const SocialLoginUseCase(this._repository);

  /// Executes the social login operation.
  ///
  /// [provider] should be `"google"` or `"apple"`.
  /// [idToken] is the ID token obtained from the social SDK.
  Future<(User, AuthTokens)> call({
    required String provider,
    required String idToken,
  }) {
    return _repository.socialLogin(provider: provider, idToken: idToken);
  }
}
