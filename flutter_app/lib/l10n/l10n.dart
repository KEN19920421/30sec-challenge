import 'package:flutter/material.dart';
import 'generated/app_localizations.dart';

/// Localization helper providing supported locales and convenient access
/// to [AppLocalizations] from any [BuildContext].
class L10n {
  L10n._();

  /// All locales the app supports.
  static const supportedLocales = [
    Locale('en'), // English (default)
    Locale('ja'), // Japanese
  ];

  /// Retrieves the [AppLocalizations] instance from the widget tree.
  ///
  /// Throws if called before [AppLocalizations] is initialized (i.e. outside
  /// the widget tree or before [MaterialApp] provides delegates).
  static AppLocalizations of(BuildContext context) {
    return AppLocalizations.of(context)!;
  }
}

/// Extension on [BuildContext] for concise access to localized strings.
///
/// Usage:
/// ```dart
/// Text(context.l10n.appTitle)
/// ```
extension L10nExtension on BuildContext {
  /// Shorthand for `AppLocalizations.of(this)!`.
  AppLocalizations get l10n => AppLocalizations.of(this)!;
}
