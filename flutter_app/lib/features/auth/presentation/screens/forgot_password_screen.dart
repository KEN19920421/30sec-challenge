import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

/// Forgot password is no longer supported (social-only auth).
/// This screen redirects to the social-only login screen.
class ForgotPasswordScreen extends StatelessWidget {
  const ForgotPasswordScreen({super.key});

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
