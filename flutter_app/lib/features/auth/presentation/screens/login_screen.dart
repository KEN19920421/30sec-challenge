import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/constants/app_constants.dart';
import '../../../../core/constants/asset_paths.dart';
import '../../../../l10n/l10n.dart';
import '../providers/auth_provider.dart';
import '../widgets/social_login_button.dart';

/// Material 3 login screen with email/password fields and social sign-in.
class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen>
    with SingleTickerProviderStateMixin {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _emailFocus = FocusNode();
  final _passwordFocus = FocusNode();

  bool _obscurePassword = true;
  bool _hasSubmitted = false;

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
    _emailController.dispose();
    _passwordController.dispose();
    _emailFocus.dispose();
    _passwordFocus.dispose();
    _fadeController.dispose();
    super.dispose();
  }

  // ---------------------------------------------------------------------------
  // Form submission
  // ---------------------------------------------------------------------------

  Future<void> _onLogin() async {
    setState(() => _hasSubmitted = true);
    if (!_formKey.currentState!.validate()) return;

    await ref.read(authProvider.notifier).login(
          email: _emailController.text.trim(),
          password: _passwordController.text,
        );

    if (!mounted) return;

    final state = ref.read(authProvider);
    if (state.status == AuthStatus.error && state.errorMessage != null) {
      _showError(state.errorMessage!);
    }
  }

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

  // ---------------------------------------------------------------------------
  // Validators
  // ---------------------------------------------------------------------------

  String? _validateEmail(String? value) {
    if (!_hasSubmitted) return null;
    if (value == null || value.trim().isEmpty) return context.l10n.emailRequired;
    final emailRegex = RegExp(r'^[\w\.\-]+@[\w\-]+\.\w{2,}$');
    if (!emailRegex.hasMatch(value.trim())) return context.l10n.enterValidEmail;
    return null;
  }

  String? _validatePassword(String? value) {
    if (!_hasSubmitted) return null;
    if (value == null || value.isEmpty) return context.l10n.passwordRequired;
    if (value.length < AppConstants.minPasswordLength) {
      return context.l10n.passwordMinLength(AppConstants.minPasswordLength);
    }
    return null;
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

    return Scaffold(
      body: SafeArea(
        child: FadeTransition(
          opacity: _fadeAnimation,
          child: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 420),
                child: Form(
                  key: _formKey,
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      // ---- Logo ----
                      _Logo(size: size),
                      const SizedBox(height: 8),
                      Text(
                        context.l10n.welcomeBack,
                        textAlign: TextAlign.center,
                        style: theme.textTheme.headlineMedium?.copyWith(
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        context.l10n.signInToContinue,
                        textAlign: TextAlign.center,
                        style: theme.textTheme.bodyMedium?.copyWith(
                          color: theme.colorScheme.onSurface.withValues(alpha: 0.6),
                        ),
                      ),
                      const SizedBox(height: 32),

                      // ---- Email ----
                      TextFormField(
                        controller: _emailController,
                        focusNode: _emailFocus,
                        keyboardType: TextInputType.emailAddress,
                        textInputAction: TextInputAction.next,
                        autocorrect: false,
                        enabled: !isLoading,
                        validator: _validateEmail,
                        onFieldSubmitted: (_) =>
                            FocusScope.of(context).requestFocus(_passwordFocus),
                        decoration: InputDecoration(
                          labelText: context.l10n.email,
                          hintText: context.l10n.emailPlaceholder,
                          prefixIcon: const Icon(Icons.email_outlined),
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                      ),
                      const SizedBox(height: 16),

                      // ---- Password ----
                      TextFormField(
                        controller: _passwordController,
                        focusNode: _passwordFocus,
                        obscureText: _obscurePassword,
                        textInputAction: TextInputAction.done,
                        enabled: !isLoading,
                        validator: _validatePassword,
                        onFieldSubmitted: (_) => _onLogin(),
                        decoration: InputDecoration(
                          labelText: context.l10n.password,
                          prefixIcon: const Icon(Icons.lock_outline),
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                          suffixIcon: IconButton(
                            icon: Icon(
                              _obscurePassword
                                  ? Icons.visibility_off_outlined
                                  : Icons.visibility_outlined,
                            ),
                            onPressed: () => setState(
                                () => _obscurePassword = !_obscurePassword),
                          ),
                        ),
                      ),

                      // ---- Forgot password ----
                      Align(
                        alignment: Alignment.centerRight,
                        child: TextButton(
                          onPressed: isLoading
                              ? null
                              : () => context.push('/forgot-password'),
                          child: Text(context.l10n.forgotPassword),
                        ),
                      ),
                      const SizedBox(height: 8),

                      // ---- Login button ----
                      FilledButton(
                        onPressed: isLoading ? null : _onLogin,
                        style: FilledButton.styleFrom(
                          minimumSize: const Size.fromHeight(52),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                        child: isLoading
                            ? const SizedBox(
                                width: 22,
                                height: 22,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2.5,
                                  color: Colors.white,
                                ),
                              )
                            : Text(
                                context.l10n.login,
                                style: const TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                      ),
                      const SizedBox(height: 24),

                      // ---- Divider ----
                      _OrDivider(),
                      const SizedBox(height: 24),

                      // ---- Social buttons ----
                      SocialLoginButton(
                        provider: SocialProvider.google,
                        onPressed: isLoading ? null : _onGoogleSignIn,
                        isLoading: isLoading,
                      ),
                      const SizedBox(height: 12),
                      if (Platform.isIOS) ...[
                        SocialLoginButton(
                          provider: SocialProvider.apple,
                          onPressed: isLoading ? null : _onAppleSignIn,
                          isLoading: isLoading,
                        ),
                        const SizedBox(height: 12),
                      ],
                      const SizedBox(height: 16),

                      // ---- Sign up link ----
                      Wrap(
                        alignment: WrapAlignment.center,
                        children: [
                          Text(
                            context.l10n.dontHaveAccount,
                            style: theme.textTheme.bodyMedium,
                          ),
                          GestureDetector(
                            onTap: isLoading
                                ? null
                                : () => context.push('/register'),
                            child: Text(
                              context.l10n.register,
                              style: theme.textTheme.bodyMedium?.copyWith(
                                color: theme.colorScheme.primary,
                                fontWeight: FontWeight.w700,
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
          height: size.height * 0.09,
          errorBuilder: (_, __, ___) => Icon(
            Icons.videocam_rounded,
            size: 64,
            color: Theme.of(context).colorScheme.primary,
          ),
        ),
      ),
    );
  }
}

class _OrDivider extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final color =
        Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.3);
    return Row(
      children: [
        Expanded(child: Divider(color: color)),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Text(
            context.l10n.orContinueWith,
            style: TextStyle(fontSize: 13, color: color),
          ),
        ),
        Expanded(child: Divider(color: color)),
      ],
    );
  }
}
