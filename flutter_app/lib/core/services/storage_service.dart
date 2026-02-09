import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Wrapper around [SharedPreferences] for non-sensitive local data.
///
/// Use this for UI preferences (theme, locale, flags) rather than auth tokens.
/// For sensitive data use [AuthStorageService] with flutter_secure_storage.
class StorageService {
  final SharedPreferences _prefs;

  StorageService(this._prefs);

  // ---------------------------------------------------------------------------
  // String
  // ---------------------------------------------------------------------------

  String? getString(String key) => _prefs.getString(key);

  Future<bool> setString(String key, String value) =>
      _prefs.setString(key, value);

  // ---------------------------------------------------------------------------
  // Bool
  // ---------------------------------------------------------------------------

  bool? getBool(String key) => _prefs.getBool(key);

  Future<bool> setBool(String key, bool value) => _prefs.setBool(key, value);

  // ---------------------------------------------------------------------------
  // Int
  // ---------------------------------------------------------------------------

  int? getInt(String key) => _prefs.getInt(key);

  Future<bool> setInt(String key, int value) => _prefs.setInt(key, value);

  // ---------------------------------------------------------------------------
  // Double
  // ---------------------------------------------------------------------------

  double? getDouble(String key) => _prefs.getDouble(key);

  Future<bool> setDouble(String key, double value) =>
      _prefs.setDouble(key, value);

  // ---------------------------------------------------------------------------
  // String list
  // ---------------------------------------------------------------------------

  List<String>? getStringList(String key) => _prefs.getStringList(key);

  Future<bool> setStringList(String key, List<String> value) =>
      _prefs.setStringList(key, value);

  // ---------------------------------------------------------------------------
  // Remove / Clear
  // ---------------------------------------------------------------------------

  Future<bool> remove(String key) => _prefs.remove(key);

  Future<bool> clear() => _prefs.clear();

  // ---------------------------------------------------------------------------
  // Utility
  // ---------------------------------------------------------------------------

  bool containsKey(String key) => _prefs.containsKey(key);

  Set<String> getKeys() => _prefs.getKeys();
}

// ---------------------------------------------------------------------------
// Riverpod provider
// ---------------------------------------------------------------------------

/// Must be overridden at app startup after [SharedPreferences.getInstance].
///
/// Example:
/// ```dart
/// final prefs = await SharedPreferences.getInstance();
/// runApp(
///   ProviderScope(
///     overrides: [
///       storageServiceProvider.overrideWithValue(StorageService(prefs)),
///     ],
///     child: const App(),
///   ),
/// );
/// ```
final storageServiceProvider = Provider<StorageService>((ref) {
  throw UnimplementedError(
    'storageServiceProvider must be overridden with a StorageService instance '
    'at app startup.',
  );
});
