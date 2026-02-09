import '../repositories/auth_repository.dart';

/// Signs the user out, clearing tokens from both server and local storage.
class LogoutUseCase {
  final AuthRepository _repository;

  const LogoutUseCase(this._repository);

  /// Executes the logout operation.
  Future<void> call() {
    return _repository.logout();
  }
}
