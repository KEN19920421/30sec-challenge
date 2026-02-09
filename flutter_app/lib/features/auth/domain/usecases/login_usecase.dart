import '../entities/auth_tokens.dart';
import '../entities/user.dart';
import '../repositories/auth_repository.dart';

/// Authenticates a user with email and password credentials.
class LoginUseCase {
  final AuthRepository _repository;

  const LoginUseCase(this._repository);

  /// Executes the login operation.
  ///
  /// Throws an exception (surfaced from the data layer) on failure.
  Future<(User, AuthTokens)> call({
    required String email,
    required String password,
  }) {
    return _repository.login(email: email, password: password);
  }
}
