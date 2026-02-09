import '../entities/auth_tokens.dart';
import '../entities/user.dart';
import '../repositories/auth_repository.dart';

/// Creates a new user account and authenticates immediately.
class RegisterUseCase {
  final AuthRepository _repository;

  const RegisterUseCase(this._repository);

  /// Executes the registration operation.
  ///
  /// Throws an exception (surfaced from the data layer) on failure.
  Future<(User, AuthTokens)> call({
    required String email,
    required String password,
    required String username,
    required String displayName,
  }) {
    return _repository.register(
      email: email,
      password: password,
      username: username,
      displayName: displayName,
    );
  }
}
