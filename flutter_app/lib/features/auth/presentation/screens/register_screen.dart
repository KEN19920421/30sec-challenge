import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

/// Registration is no longer supported via email/password.
/// This screen redirects to the social-only login screen.
class RegisterScreen extends StatelessWidget {
  const RegisterScreen({super.key});

  @override
  Widget build(BuildContext context) {
    // Immediately redirect to login on build.
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.go('/login');
    });

    return const Scaffold(
      body: Center(child: CircularProgressIndicator()),
    );
  }
}
