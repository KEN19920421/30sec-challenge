import '../entities/auth_tokens.dart';
import '../entities/user.dart';
import '../repositories/auth_repository.dart';

/// Email/password registration is no longer supported. This use case is
/// retained only as a placeholder to avoid import errors in test scaffolding.
///
/// User accounts are created automatically via social login (Google/Apple).
class RegisterUseCase {
  final AuthRepository _repository;

  const RegisterUseCase(this._repository);

  /// Always throws [UnsupportedError]. Registration has been removed.
  Future<(User, AuthTokens)> call({
    required String email,
    required String password,
    required String username,
    required String displayName,
  }) {
    // Suppress unused field warning.
    _repository;
    throw UnsupportedError(
      'Email/password registration is no longer supported. Use social login instead.',
    );
  }
}
