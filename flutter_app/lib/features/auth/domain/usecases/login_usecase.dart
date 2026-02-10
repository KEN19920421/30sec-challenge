import '../entities/auth_tokens.dart';
import '../entities/user.dart';
import '../repositories/auth_repository.dart';

/// Email/password login is no longer supported. This use case is retained
/// only as a placeholder to avoid import errors in test scaffolding.
///
/// Use social login (Google/Apple) via [SocialLoginUseCase] instead.
class LoginUseCase {
  final AuthRepository _repository;

  const LoginUseCase(this._repository);

  /// Always throws [UnsupportedError]. Email/password login has been removed.
  Future<(User, AuthTokens)> call({
    required String email,
    required String password,
  }) {
    // Suppress unused field warning.
    _repository;
    throw UnsupportedError(
      'Email/password login is no longer supported. Use social login instead.',
    );
  }
}
