import '../../../../core/constants/api_constants.dart';
import '../../../../core/network/api_client.dart';
import '../models/auth_response_model.dart';
import '../models/user_model.dart';

/// Handles all HTTP calls to the auth-related API endpoints.
///
/// Every method throws a [DioException] (which is converted to an
/// [AppException] by the interceptor chain) on failure.
class AuthRemoteDataSource {
  final ApiClient _client;

  const AuthRemoteDataSource(this._client);

  /// POST /auth/register
  Future<AuthResponseModel> register({
    required String email,
    required String password,
    required String username,
    required String displayName,
  }) async {
    final response = await _client.post(
      ApiConstants.register,
      data: {
        'email': email,
        'password': password,
        'username': username,
        'display_name': displayName,
      },
    );
    return AuthResponseModel.fromJson(
      response.data as Map<String, dynamic>,
    );
  }

  /// POST /auth/login
  Future<AuthResponseModel> login({
    required String email,
    required String password,
  }) async {
    final response = await _client.post(
      ApiConstants.login,
      data: {
        'email': email,
        'password': password,
      },
    );
    return AuthResponseModel.fromJson(
      response.data as Map<String, dynamic>,
    );
  }

  /// POST /auth/social
  Future<AuthResponseModel> socialLogin({
    required String provider,
    required String idToken,
  }) async {
    final response = await _client.post(
      ApiConstants.socialLogin,
      data: {
        'provider': provider,
        'id_token': idToken,
      },
    );
    return AuthResponseModel.fromJson(
      response.data as Map<String, dynamic>,
    );
  }

  /// POST /auth/refresh-token
  Future<AuthResponseModel> refreshToken(String refreshToken) async {
    final response = await _client.post(
      ApiConstants.refreshToken,
      data: {
        'refresh_token': refreshToken,
      },
    );
    return AuthResponseModel.fromJson(
      response.data as Map<String, dynamic>,
    );
  }

  /// GET /auth/me
  Future<UserModel> getCurrentUser() async {
    final response = await _client.get(ApiConstants.me);
    final data = response.data as Map<String, dynamic>;

    // The user payload may be nested under `data`.
    final userData =
        data.containsKey('data') ? data['data'] as Map<String, dynamic> : data;

    return UserModel.fromJson(userData);
  }

  /// POST /auth/logout
  Future<void> logout() async {
    await _client.post(ApiConstants.logout);
  }

  /// POST /auth/forgot-password
  Future<void> forgotPassword(String email) async {
    await _client.post(
      ApiConstants.forgotPassword,
      data: {'email': email},
    );
  }
}
