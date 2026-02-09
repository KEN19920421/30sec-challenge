import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'l10n/generated/app_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'core/router/app_router.dart';
import 'core/theme/app_theme.dart';
import 'l10n/l10n.dart';

/// Root application widget.
///
/// Uses [ConsumerWidget] to access Riverpod providers for the router
/// configuration. The router is created once and shared via [appRouterProvider].
class App extends ConsumerWidget {
  const App({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(appRouterProvider);

    return MaterialApp.router(
      // -----------------------------------------------------------------------
      // Router
      // -----------------------------------------------------------------------
      routerConfig: router,

      // -----------------------------------------------------------------------
      // Metadata
      // -----------------------------------------------------------------------
      title: '30sec Challenge',
      debugShowCheckedModeBanner: false,

      // -----------------------------------------------------------------------
      // Theming
      // -----------------------------------------------------------------------
      theme: AppTheme.light,
      darkTheme: AppTheme.dark,
      themeMode: ThemeMode.system,

      // -----------------------------------------------------------------------
      // Localization
      // -----------------------------------------------------------------------
      supportedLocales: L10n.supportedLocales,
      localizationsDelegates: const [
        AppLocalizations.delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
    );
  }
}
