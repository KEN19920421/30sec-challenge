import 'dart:developer' as developer;

import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';

import '../errors/app_exception.dart';
import '../services/auth_storage_service.dart';

/// Attaches the Authorization header with a Bearer token to every request.
///
/// Reads the current access token from [AuthStorageService]. If no token
/// is available the request proceeds without the header.
class AuthInterceptor extends Interceptor {
  final AuthStorageService _authStorage;

  AuthInterceptor(this._authStorage);

  @override
  Future<void> onRequest(
    RequestOptions options,
    RequestInterceptorHandler handler,
  ) async {
    final token = await _authStorage.getAccessToken();
    if (token != null && token.isNotEmpty) {
      options.headers['Authorization'] = 'Bearer $token';
    }
    handler.next(options);
  }
}

/// Logs HTTP requests and responses in debug mode.
///
/// Output goes to [developer.log] so it appears in the IDE debug console
/// without cluttering release builds.
class LoggingInterceptor extends Interceptor {
  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) {
    if (kDebugMode) {
      developer.log(
        '--> ${options.method.toUpperCase()} ${options.uri}',
        name: 'HTTP',
      );
      if (options.data != null) {
        developer.log('Body: ${options.data}', name: 'HTTP');
      }
      if (options.queryParameters.isNotEmpty) {
        developer.log('Query: ${options.queryParameters}', name: 'HTTP');
      }
    }
    handler.next(options);
  }

  @override
  void onResponse(Response response, ResponseInterceptorHandler handler) {
    if (kDebugMode) {
      developer.log(
        '<-- ${response.statusCode} ${response.requestOptions.uri}',
        name: 'HTTP',
      );
    }
    handler.next(response);
  }

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) {
    if (kDebugMode) {
      developer.log(
        '<-- ERROR ${err.response?.statusCode ?? 'N/A'} '
        '${err.requestOptions.uri}\n'
        '${err.message}',
        name: 'HTTP',
      );
    }
    handler.next(err);
  }
}

/// Converts [DioException] instances into strongly-typed [AppException]s.
///
/// This interceptor runs last so that upstream interceptors see the raw Dio
/// error while the rest of the app receives domain exceptions.
class ErrorInterceptor extends Interceptor {
  @override
  void onError(DioException err, ErrorInterceptorHandler handler) {
    final AppException appException;

    switch (err.type) {
      case DioExceptionType.connectionTimeout:
      case DioExceptionType.sendTimeout:
      case DioExceptionType.receiveTimeout:
        appException = NetworkException(
          message: 'Connection timed out. Please try again.',
          statusCode: err.response?.statusCode,
          originalError: err,
        );
        break;

      case DioExceptionType.connectionError:
        appException = NetworkException(
          message: 'No internet connection. Please check your network.',
          statusCode: err.response?.statusCode,
          originalError: err,
        );
        break;

      case DioExceptionType.badResponse:
        appException = _handleBadResponse(err);
        break;

      case DioExceptionType.cancel:
        appException = AppException(
          message: 'Request was cancelled.',
          statusCode: err.response?.statusCode,
          originalError: err,
        );
        break;

      case DioExceptionType.badCertificate:
        appException = NetworkException(
          message: 'Security certificate error.',
          statusCode: err.response?.statusCode,
          originalError: err,
        );
        break;

      case DioExceptionType.unknown:
        appException = AppException(
          message: 'An unexpected error occurred.',
          statusCode: err.response?.statusCode,
          originalError: err,
        );
        break;
    }

    handler.reject(
      DioException(
        requestOptions: err.requestOptions,
        response: err.response,
        type: err.type,
        error: appException,
      ),
    );
  }

  AppException _handleBadResponse(DioException err) {
    final statusCode = err.response?.statusCode;
    final data = err.response?.data;
    final serverMessage = data is Map<String, dynamic>
        ? (data['message'] as String?) ?? ''
        : '';

    switch (statusCode) {
      case 400:
        final fieldErrors = _extractFieldErrors(data);
        return ValidationException(
          message: serverMessage.isNotEmpty
              ? serverMessage
              : 'Invalid request. Please check your input.',
          statusCode: statusCode,
          originalError: err,
          fieldErrors: fieldErrors,
        );

      case 401:
        return AuthException(
          message: serverMessage.isNotEmpty
              ? serverMessage
              : 'Session expired. Please sign in again.',
          statusCode: statusCode,
          originalError: err,
        );

      case 403:
        return AuthException(
          message: serverMessage.isNotEmpty
              ? serverMessage
              : 'You do not have permission to perform this action.',
          statusCode: statusCode,
          originalError: err,
        );

      case 404:
        return NotFoundException(
          message: serverMessage.isNotEmpty
              ? serverMessage
              : 'The requested resource was not found.',
          statusCode: statusCode,
          originalError: err,
        );

      case 409:
        return AppException(
          message: serverMessage.isNotEmpty
              ? serverMessage
              : 'A conflict occurred.',
          statusCode: statusCode,
          originalError: err,
        );

      case 422:
        final fieldErrors = _extractFieldErrors(data);
        return ValidationException(
          message: serverMessage.isNotEmpty
              ? serverMessage
              : 'Validation failed.',
          statusCode: statusCode,
          originalError: err,
          fieldErrors: fieldErrors,
        );

      case 429:
        return RateLimitException(
          message: serverMessage.isNotEmpty
              ? serverMessage
              : 'Too many requests. Please try again later.',
          statusCode: statusCode,
          originalError: err,
        );

      default:
        if (statusCode != null && statusCode >= 500) {
          return ServerException(
            message: serverMessage.isNotEmpty
                ? serverMessage
                : 'A server error occurred. Please try again later.',
            statusCode: statusCode,
            originalError: err,
          );
        }
        return AppException(
          message: serverMessage.isNotEmpty
              ? serverMessage
              : 'An unexpected error occurred.',
          statusCode: statusCode,
          originalError: err,
        );
    }
  }

  Map<String, List<String>>? _extractFieldErrors(dynamic data) {
    if (data is! Map<String, dynamic>) return null;
    final errors = data['errors'];
    if (errors is! Map<String, dynamic>) return null;

    return errors.map(
      (key, value) => MapEntry(
        key,
        value is List
            ? value.map((e) => e.toString()).toList()
            : [value.toString()],
      ),
    );
  }
}
