import '../../domain/entities/auth_tokens.dart';
import '../../domain/entities/user.dart';
import '../../domain/repositories/auth_repository.dart';
import '../datasources/auth_local_datasource.dart';
import '../datasources/auth_remote_datasource.dart';

/// Concrete implementation of [AuthRepository].
///
/// Coordinates between [AuthRemoteDataSource] (network) and
/// [AuthLocalDataSource] (tokens + cached user) to fulfil auth operations.
class AuthRepositoryImpl implements AuthRepository {
  final AuthRemoteDataSource _remote;
  final AuthLocalDataSource _local;

  const AuthRepositoryImpl({
    required AuthRemoteDataSource remote,
    required AuthLocalDataSource local,
  })  : _remote = remote,
        _local = local;

  @override
  Future<(User, AuthTokens)> socialLogin({
    required String provider,
    required String idToken,
  }) async {
    final response = await _remote.socialLogin(
      provider: provider,
      idToken: idToken,
    );

    final tokens = AuthTokens(
      accessToken: response.accessToken,
      refreshToken: response.refreshToken,
      expiresIn: response.expiresIn,
    );

    await _local.saveTokens(tokens);
    if (response.user != null) {
      await _local.saveUser(response.user!);
    }

    return (response.user! as User, tokens);
  }

  @override
  Future<AuthTokens> refreshToken(String refreshToken) async {
    final response = await _remote.refreshToken(refreshToken);

    final tokens = AuthTokens(
      accessToken: response.accessToken,
      refreshToken: response.refreshToken,
      expiresIn: response.expiresIn,
    );

    await _local.saveTokens(tokens);
    return tokens;
  }

  @override
  Future<User> getCurrentUser() async {
    final user = await _remote.getCurrentUser();

    // Update the local cache.
    await _local.saveUser(user);

    return user;
  }

  @override
  Future<void> logout() async {
    try {
      await _remote.logout();
    } catch (_) {
      // Even if the server call fails we still clear local state so the
      // user is signed out on the client.
    }
    await _local.clearAll();
  }

  @override
  Future<void> deleteAccount() async {
    await _remote.deleteAccount();
    await _local.clearAll();
  }
}
