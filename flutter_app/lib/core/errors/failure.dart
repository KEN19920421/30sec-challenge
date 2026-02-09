/// Abstract base for typed failure results.
///
/// Used with an Either-style pattern so that functions can return either
/// a [Failure] or a successful value without throwing exceptions.
abstract class Failure {
  final String message;
  final int? statusCode;

  const Failure({required this.message, this.statusCode});

  @override
  String toString() => '$runtimeType: $message';

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is Failure &&
          runtimeType == other.runtimeType &&
          message == other.message &&
          statusCode == other.statusCode;

  @override
  int get hashCode => message.hashCode ^ statusCode.hashCode;
}

/// A failure originating from the remote server (5xx, unexpected errors).
class ServerFailure extends Failure {
  const ServerFailure({
    super.message = 'A server error occurred. Please try again later.',
    super.statusCode,
  });
}

/// A failure caused by network connectivity issues.
class NetworkFailure extends Failure {
  const NetworkFailure({
    super.message = 'No internet connection. Please check your network.',
    super.statusCode,
  });
}

/// A failure caused by reading/writing local cache or storage.
class CacheFailure extends Failure {
  const CacheFailure({
    super.message = 'Failed to access local storage.',
    super.statusCode,
  });
}

/// A failure caused by authentication or authorization errors.
class AuthFailure extends Failure {
  const AuthFailure({
    super.message = 'Authentication failed. Please sign in again.',
    super.statusCode,
  });
}

/// A failure caused by input validation errors.
class ValidationFailure extends Failure {
  final Map<String, List<String>>? fieldErrors;

  const ValidationFailure({
    super.message = 'Validation failed. Please check your input.',
    super.statusCode,
    this.fieldErrors,
  });
}

/// A failure when a resource is not found.
class NotFoundFailure extends Failure {
  const NotFoundFailure({
    super.message = 'The requested resource was not found.',
    super.statusCode = 404,
  });
}

/// A failure when the user hits a rate limit.
class RateLimitFailure extends Failure {
  final Duration? retryAfter;

  const RateLimitFailure({
    super.message = 'Too many requests. Please slow down.',
    super.statusCode = 429,
    this.retryAfter,
  });
}
