import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../../core/constants/asset_paths.dart';
import '../../../../l10n/l10n.dart';
import '../providers/auth_provider.dart';
import '../widgets/social_login_button.dart';

/// Social-only login screen. Users sign in via Google or Apple.
class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen>
    with SingleTickerProviderStateMixin {
  late final AnimationController _fadeController;
  late final Animation<double> _fadeAnimation;

  @override
  void initState() {
    super.initState();
    _fadeController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 800),
    );
    _fadeAnimation = CurvedAnimation(
      parent: _fadeController,
      curve: Curves.easeOut,
    );
    _fadeController.forward();
  }

  @override
  void dispose() {
    _fadeController.dispose();
    super.dispose();
  }

  // ---------------------------------------------------------------------------
  // Social sign-in
  // ---------------------------------------------------------------------------

  Future<void> _onGoogleSignIn() async {
    await ref.read(authProvider.notifier).signInWithGoogle();
    _checkSocialError();
  }

  Future<void> _onAppleSignIn() async {
    await ref.read(authProvider.notifier).signInWithApple();
    _checkSocialError();
  }

  void _checkSocialError() {
    if (!mounted) return;
    final state = ref.read(authProvider);
    if (state.status == AuthStatus.error && state.errorMessage != null) {
      _showError(state.errorMessage!);
    }
  }

  void _showError(String message) {
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(
        SnackBar(
          content: Text(message),
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(10),
          ),
        ),
      );
  }

  Future<void> _launchUrl(String url) async {
    final uri = Uri.parse(url);
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }

  // ---------------------------------------------------------------------------
  // Build
  // ---------------------------------------------------------------------------

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final authState = ref.watch(authProvider);
    final isLoading = authState.isLoading;
    final size = MediaQuery.sizeOf(context);

    // Check if this screen was pushed (can pop back to browsing).
    final canPop = Navigator.of(context).canPop();

    return Scaffold(
      body: SafeArea(
        child: FadeTransition(
          opacity: _fadeAnimation,
          child: Stack(
            children: [
              Center(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
                  child: ConstrainedBox(
                    constraints: const BoxConstraints(maxWidth: 420),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        // ---- Logo ----
                        _Logo(size: size),
                        const SizedBox(height: 16),

                        // ---- Title ----
                        Text(
                          context.l10n.appTitle,
                          textAlign: TextAlign.center,
                          style: theme.textTheme.headlineMedium?.copyWith(
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        const SizedBox(height: 8),

                        // ---- Subtitle ----
                        Text(
                          context.l10n.signInToContinue,
                          textAlign: TextAlign.center,
                          style: theme.textTheme.bodyLarge?.copyWith(
                            color: theme.colorScheme.onSurface.withValues(alpha: 0.6),
                          ),
                        ),
                        const SizedBox(height: 48),

                        // ---- Google Sign-In ----
                        SocialLoginButton(
                          provider: SocialProvider.google,
                          onPressed: isLoading ? null : _onGoogleSignIn,
                          isLoading: isLoading,
                        ),
                        const SizedBox(height: 12),

                        // ---- Apple Sign-In (iOS only) ----
                        if (Platform.isIOS) ...[
                          SocialLoginButton(
                            provider: SocialProvider.apple,
                            onPressed: isLoading ? null : _onAppleSignIn,
                            isLoading: isLoading,
                          ),
                          const SizedBox(height: 12),
                        ],

                        const SizedBox(height: 32),

                        // ---- Terms / Privacy ----
                        Text.rich(
                          TextSpan(
                            style: theme.textTheme.bodySmall?.copyWith(
                              color: theme.colorScheme.onSurface.withValues(alpha: 0.5),
                              height: 1.5,
                            ),
                            children: [
                              TextSpan(
                                text: context.l10n.continueWithGoogle.replaceAll(
                                  RegExp(r'Continue with Google|Googleで続ける'),
                                  '',
                                ),
                              ),
                            ],
                          ),
                          textAlign: TextAlign.center,
                        ),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            TextButton(
                              onPressed: () => _launchUrl(
                                'https://30secchallenge.app/terms',
                              ),
                              style: TextButton.styleFrom(
                                padding: const EdgeInsets.symmetric(horizontal: 4),
                                minimumSize: Size.zero,
                                tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                              ),
                              child: Text(
                                context.l10n.termsOfService,
                                style: theme.textTheme.bodySmall?.copyWith(
                                  color: theme.colorScheme.primary,
                                  decoration: TextDecoration.underline,
                                ),
                              ),
                            ),
                            Padding(
                              padding: const EdgeInsets.symmetric(horizontal: 4),
                              child: Text(
                                '&',
                                style: theme.textTheme.bodySmall?.copyWith(
                                  color: theme.colorScheme.onSurface.withValues(alpha: 0.5),
                                ),
                              ),
                            ),
                            TextButton(
                              onPressed: () => _launchUrl(
                                'https://30secchallenge.app/privacy',
                              ),
                              style: TextButton.styleFrom(
                                padding: const EdgeInsets.symmetric(horizontal: 4),
                                minimumSize: Size.zero,
                                tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                              ),
                              child: Text(
                                context.l10n.privacyPolicy,
                                style: theme.textTheme.bodySmall?.copyWith(
                                  color: theme.colorScheme.primary,
                                  decoration: TextDecoration.underline,
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 16),
                      ],
                    ),
                  ),
                ),
              ),
              // ---- Skip / Close button (TikTok-style: browse without login) ----
              Positioned(
                top: 8,
                right: 8,
                child: canPop
                    ? IconButton(
                        icon: const Icon(Icons.close),
                        onPressed: () => context.pop(),
                      )
                    : TextButton(
                        onPressed: () => context.go('/'),
                        child: Text(
                          'Browse as Guest',
                          style: theme.textTheme.bodyMedium?.copyWith(
                            color: theme.colorScheme.onSurface.withValues(alpha: 0.6),
                          ),
                        ),
                      ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// =============================================================================
// Private helper widgets
// =============================================================================

class _Logo extends StatelessWidget {
  final Size size;
  const _Logo({required this.size});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Center(
        child: Image.asset(
          AssetPaths.logo,
          height: size.height * 0.12,
          errorBuilder: (_, __, ___) => Icon(
            Icons.videocam_rounded,
            size: 80,
            color: Theme.of(context).colorScheme.primary,
          ),
        ),
      ),
    );
  }
}
