/// Application environment definitions.
///
/// Controls which backend services and configurations the app connects to.
enum Environment {
  /// Local development environment.
  dev,

  /// Staging/QA environment for pre-release testing.
  staging,

  /// Production environment for live users.
  prod,
}

/// Holds the current runtime environment.
///
/// Set once at app startup before [runApp] is called.
/// Defaults to [Environment.dev] for safety.
class EnvironmentConfig {
  EnvironmentConfig._();

  static Environment _current = Environment.dev;

  /// The currently active environment.
  static Environment get current => _current;

  /// Whether the app is running in development mode.
  static bool get isDev => _current == Environment.dev;

  /// Whether the app is running in staging mode.
  static bool get isStaging => _current == Environment.staging;

  /// Whether the app is running in production mode.
  static bool get isProd => _current == Environment.prod;

  /// Whether the app is running in a non-production environment.
  static bool get isDebugMode => _current != Environment.prod;

  /// Initialize the environment. Must be called before [runApp].
  static void initialize(Environment env) {
    _current = env;
  }
}
