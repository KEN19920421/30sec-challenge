import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../config/app_config.dart';
import '../constants/api_constants.dart';
import '../services/auth_storage_service.dart';
import 'api_interceptors.dart';

/// Dio-based HTTP client used for all backend communication.
///
/// Provides typed convenience methods ([get], [post], [put], [patch], [delete])
/// and handles automatic token refresh on 401 responses.
class ApiClient {
  late final Dio _dio;
  final AuthStorageService _authStorage;

  ApiClient({required AuthStorageService authStorage})
      : _authStorage = authStorage {
    final config = AppConfig.instance;

    _dio = Dio(
      BaseOptions(
        baseUrl: config.apiBaseUrl,
        connectTimeout: config.apiTimeout,
        receiveTimeout: config.apiTimeout,
        sendTimeout: config.apiTimeout,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      ),
    );

    _dio.interceptors.addAll([
      AuthInterceptor(_authStorage),
      LoggingInterceptor(),
      ErrorInterceptor(),
      _tokenRefreshInterceptor(),
    ]);
  }

  /// Exposes the underlying [Dio] instance for advanced use cases
  /// such as multipart uploads.
  Dio get dio => _dio;

  // ---------------------------------------------------------------------------
  // Convenience HTTP methods
  // ---------------------------------------------------------------------------

  Future<Response<T>> get<T>(
    String path, {
    Map<String, dynamic>? queryParameters,
    Options? options,
    CancelToken? cancelToken,
  }) {
    return _dio.get<T>(
      path,
      queryParameters: queryParameters,
      options: options,
      cancelToken: cancelToken,
    );
  }

  Future<Response<T>> post<T>(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
    Options? options,
    CancelToken? cancelToken,
  }) {
    return _dio.post<T>(
      path,
      data: data,
      queryParameters: queryParameters,
      options: options,
      cancelToken: cancelToken,
    );
  }

  Future<Response<T>> put<T>(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
    Options? options,
    CancelToken? cancelToken,
  }) {
    return _dio.put<T>(
      path,
      data: data,
      queryParameters: queryParameters,
      options: options,
      cancelToken: cancelToken,
    );
  }

  Future<Response<T>> patch<T>(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
    Options? options,
    CancelToken? cancelToken,
  }) {
    return _dio.patch<T>(
      path,
      data: data,
      queryParameters: queryParameters,
      options: options,
      cancelToken: cancelToken,
    );
  }

  Future<Response<T>> delete<T>(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
    Options? options,
    CancelToken? cancelToken,
  }) {
    return _dio.delete<T>(
      path,
      data: data,
      queryParameters: queryParameters,
      options: options,
      cancelToken: cancelToken,
    );
  }

  /// Upload a file with progress tracking.
  Future<Response<T>> upload<T>(
    String path, {
    required FormData data,
    void Function(int sent, int total)? onSendProgress,
    CancelToken? cancelToken,
  }) {
    return _dio.post<T>(
      path,
      data: data,
      onSendProgress: onSendProgress,
      options: Options(contentType: 'multipart/form-data'),
      cancelToken: cancelToken,
    );
  }

  // ---------------------------------------------------------------------------
  // Token refresh
  // ---------------------------------------------------------------------------

  /// An interceptor that catches 401 responses, attempts to refresh the token,
  /// and retries the original request once.
  InterceptorsWrapper _tokenRefreshInterceptor() {
    return InterceptorsWrapper(
      onError: (DioException error, ErrorInterceptorHandler handler) async {
        // Only attempt refresh on 401 and if the request is not itself a refresh.
        if (error.response?.statusCode != 401 ||
            error.requestOptions.path == ApiConstants.refreshToken) {
          return handler.next(error);
        }

        try {
          final refreshToken = await _authStorage.getRefreshToken();
          if (refreshToken == null || refreshToken.isEmpty) {
            await _authStorage.clearTokens();
            return handler.next(error);
          }

          // Call the refresh endpoint using a separate Dio instance to avoid
          // interceptor loops.
          final refreshDio = Dio(
            BaseOptions(baseUrl: AppConfig.instance.apiBaseUrl),
          );

          final response = await refreshDio.post(
            ApiConstants.refreshToken,
            data: {'refreshToken': refreshToken},
          );

          final newAccessToken =
              response.data['data']['accessToken'] as String?;
          final newRefreshToken =
              response.data['data']['refreshToken'] as String?;

          if (newAccessToken != null) {
            await _authStorage.saveTokens(
              accessToken: newAccessToken,
              refreshToken: newRefreshToken ?? refreshToken,
            );

            // Retry the original request with the new token.
            final retryOptions = error.requestOptions;
            retryOptions.headers['Authorization'] = 'Bearer $newAccessToken';

            final retryResponse = await _dio.fetch(retryOptions);
            return handler.resolve(retryResponse);
          }

          await _authStorage.clearTokens();
          return handler.next(error);
        } on DioException {
          // Refresh failed -- clear tokens so the UI redirects to login.
          await _authStorage.clearTokens();
          return handler.next(error);
        }
      },
    );
  }
}

// ---------------------------------------------------------------------------
// Riverpod providers
// ---------------------------------------------------------------------------

/// Provides the singleton [AuthStorageService].
final authStorageServiceProvider = Provider<AuthStorageService>((ref) {
  return AuthStorageService();
});

/// Provides the singleton [ApiClient].
final apiClientProvider = Provider<ApiClient>((ref) {
  final authStorage = ref.watch(authStorageServiceProvider);
  return ApiClient(authStorage: authStorage);
});
