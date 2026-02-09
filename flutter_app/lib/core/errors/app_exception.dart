/// Base exception for all app-specific errors.
///
/// Every custom exception extends this so callers can catch [AppException]
/// as a common ancestor type.
class AppException implements Exception {
  final String message;
  final int? statusCode;
  final dynamic originalError;

  const AppException({
    required this.message,
    this.statusCode,
    this.originalError,
  });

  @override
  String toString() => 'AppException($statusCode): $message';
}

/// Thrown when a network request fails due to connectivity or timeout.
class NetworkException extends AppException {
  const NetworkException({
    super.message = 'A network error occurred. Please check your connection.',
    super.statusCode,
    super.originalError,
  });

  @override
  String toString() => 'NetworkException($statusCode): $message';
}

/// Thrown when an authentication or authorization error occurs.
class AuthException extends AppException {
  const AuthException({
    super.message = 'Authentication failed. Please sign in again.',
    super.statusCode,
    super.originalError,
  });

  @override
  String toString() => 'AuthException($statusCode): $message';
}

/// Thrown when user input fails validation.
class ValidationException extends AppException {
  final Map<String, List<String>>? fieldErrors;

  const ValidationException({
    super.message = 'Validation failed. Please check your input.',
    super.statusCode,
    super.originalError,
    this.fieldErrors,
  });

  @override
  String toString() => 'ValidationException($statusCode): $message';
}

/// Thrown when the server returns an unexpected error (5xx).
class ServerException extends AppException {
  const ServerException({
    super.message = 'A server error occurred. Please try again later.',
    super.statusCode,
    super.originalError,
  });

  @override
  String toString() => 'ServerException($statusCode): $message';
}

/// Thrown when the requested resource is not found (404).
class NotFoundException extends AppException {
  const NotFoundException({
    super.message = 'The requested resource was not found.',
    super.statusCode = 404,
    super.originalError,
  });

  @override
  String toString() => 'NotFoundException($statusCode): $message';
}

/// Thrown when the user has exceeded a rate limit.
class RateLimitException extends AppException {
  final Duration? retryAfter;

  const RateLimitException({
    super.message = 'Too many requests. Please try again later.',
    super.statusCode = 429,
    super.originalError,
    this.retryAfter,
  });

  @override
  String toString() => 'RateLimitException($statusCode): $message';
}

/// Thrown when a local cache operation fails.
class CacheException extends AppException {
  const CacheException({
    super.message = 'A local storage error occurred.',
    super.statusCode,
    super.originalError,
  });

  @override
  String toString() => 'CacheException: $message';
}
