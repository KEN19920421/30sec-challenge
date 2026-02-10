import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_mobile_ads/google_mobile_ads.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'app.dart';
import 'core/config/app_config.dart';
import 'core/config/env.dart';
import 'core/services/storage_service.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Initialize environment and app config.
  const envName = String.fromEnvironment('ENV', defaultValue: 'dev');
  final env = envName == 'prod'
      ? Environment.prod
      : envName == 'staging'
          ? Environment.staging
          : Environment.dev;
  EnvironmentConfig.initialize(env);
  AppConfig.initialize();

  // Lock orientation to portrait for consistent video experience.
  await SystemChrome.setPreferredOrientations([
    DeviceOrientation.portraitUp,
    DeviceOrientation.portraitDown,
  ]);

  // Initialize Firebase for auth, messaging, analytics, etc.
  try {
    await Firebase.initializeApp();
  } catch (e) {
    debugPrint('Firebase init failed (dev mode): $e');
  }

  // Initialize Google Mobile Ads SDK.
  try {
    await MobileAds.instance.initialize();
  } catch (e) {
    debugPrint('MobileAds init failed (dev mode): $e');
  }

  // Obtain SharedPreferences instance to inject into the provider tree.
  final sharedPreferences = await SharedPreferences.getInstance();

  runApp(
    ProviderScope(
      overrides: [
        storageServiceProvider
            .overrideWithValue(StorageService(sharedPreferences)),
      ],
      child: const App(),
    ),
  );
}
