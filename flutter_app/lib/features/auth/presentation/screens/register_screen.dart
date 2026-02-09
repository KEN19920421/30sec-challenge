import 'dart:async';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/constants/app_constants.dart';
import '../../../../l10n/l10n.dart';
import '../providers/auth_provider.dart';
import '../widgets/password_strength_indicator.dart';
import '../widgets/social_login_button.dart';

/// Material 3 registration screen with real-time validation and
/// a password strength indicator.
class RegisterScreen extends ConsumerStatefulWidget {
  const RegisterScreen({super.key});

  @override
  ConsumerState<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends ConsumerState<RegisterScreen>
    with SingleTickerProviderStateMixin {
  final _formKey = GlobalKey<FormState>();
  final _displayNameController = TextEditingController();
  final _usernameController = TextEditingController();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();

  final _displayNameFocus = FocusNode();
  final _usernameFocus = FocusNode();
  final _emailFocus = FocusNode();
  final _passwordFocus = FocusNode();
  final _confirmPasswordFocus = FocusNode();

  bool _obscurePassword = true;
  bool _obscureConfirm = true;
  bool _hasSubmitted = false;
  String _password = '';

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

    _passwordController.addListener(() {
      setState(() => _password = _passwordController.text);
    });
  }

  @override
  void dispose() {
    _displayNameController.dispose();
    _usernameController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    _confirmPasswordController.dispose();
    _displayNameFocus.dispose();
    _usernameFocus.dispose();
    _emailFocus.dispose();
    _passwordFocus.dispose();
    _confirmPasswordFocus.dispose();
    _fadeController.dispose();
    super.dispose();
  }

  // ---------------------------------------------------------------------------
  // Submission
  // ---------------------------------------------------------------------------

  Future<void> _onRegister() async {
    setState(() => _hasSubmitted = true);
    if (!_formKey.currentState!.validate()) return;

    await ref.read(authProvider.notifier).register(
          displayName: _displayNameController.text.trim(),
          username: _usernameController.text.trim(),
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

  String? _validateDisplayName(String? v) {
    if (!_hasSubmitted) return null;
    if (v == null || v.trim().isEmpty) return context.l10n.displayNameRequired;
    if (v.trim().length > AppConstants.maxDisplayNameLength) {
      return context.l10n.displayNameMaxLength(AppConstants.maxDisplayNameLength);
    }
    return null;
  }

  String? _validateUsername(String? v) {
    if (!_hasSubmitted) return null;
    if (v == null || v.trim().isEmpty) return context.l10n.usernameRequired;
    if (v.trim().length < AppConstants.minUsernameLength) {
      return context.l10n.usernameMinLength(AppConstants.minUsernameLength);
    }
    if (v.trim().length > AppConstants.maxUsernameLength) {
      return context.l10n.usernameMaxLength(AppConstants.maxUsernameLength);
    }
    if (!RegExp(r'^[a-zA-Z0-9_]+$').hasMatch(v.trim())) {
      return context.l10n.usernameInvalidChars;
    }
    return null;
  }

  String? _validateEmail(String? v) {
    if (!_hasSubmitted) return null;
    if (v == null || v.trim().isEmpty) return context.l10n.emailRequired;
    final emailRegex = RegExp(r'^[\w\.\-]+@[\w\-]+\.\w{2,}$');
    if (!emailRegex.hasMatch(v.trim())) return context.l10n.enterValidEmail;
    return null;
  }

  String? _validatePassword(String? v) {
    if (!_hasSubmitted) return null;
    if (v == null || v.isEmpty) return context.l10n.passwordRequired;
    if (v.length < AppConstants.minPasswordLength) {
      return context.l10n.passwordMinLength(AppConstants.minPasswordLength);
    }
    return null;
  }

  String? _validateConfirmPassword(String? v) {
    if (!_hasSubmitted) return null;
    if (v == null || v.isEmpty) return context.l10n.confirmPasswordRequired;
    if (v != _passwordController.text) return context.l10n.passwordsDoNotMatch;
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

    return Scaffold(
      body: SafeArea(
        child: FadeTransition(
          opacity: _fadeAnimation,
          child: Center(
            child: SingleChildScrollView(
              padding:
                  const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 420),
                child: Form(
                  key: _formKey,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      // ---- Header ----
                      const SizedBox(height: 8),
                      Text(
                        context.l10n.createAccount,
                        textAlign: TextAlign.center,
                        style: theme.textTheme.headlineMedium?.copyWith(
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        context.l10n.joinApp,
                        textAlign: TextAlign.center,
                        style: theme.textTheme.bodyMedium?.copyWith(
                          color:
                              theme.colorScheme.onSurface.withValues(alpha: 0.6),
                        ),
                      ),
                      const SizedBox(height: 28),

                      // ---- Display Name ----
                      TextFormField(
                        controller: _displayNameController,
                        focusNode: _displayNameFocus,
                        textInputAction: TextInputAction.next,
                        textCapitalization: TextCapitalization.words,
                        enabled: !isLoading,
                        validator: _validateDisplayName,
                        onFieldSubmitted: (_) => FocusScope.of(context)
                            .requestFocus(_usernameFocus),
                        decoration: InputDecoration(
                          labelText: context.l10n.displayName,
                          hintText: context.l10n.displayNamePlaceholder,
                          prefixIcon:
                              const Icon(Icons.person_outline),
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                      ),
                      const SizedBox(height: 16),

                      // ---- Username ----
                      TextFormField(
                        controller: _usernameController,
                        focusNode: _usernameFocus,
                        textInputAction: TextInputAction.next,
                        autocorrect: false,
                        enabled: !isLoading,
                        validator: _validateUsername,
                        onFieldSubmitted: (_) =>
                            FocusScope.of(context).requestFocus(_emailFocus),
                        decoration: InputDecoration(
                          labelText: context.l10n.username,
                          hintText: context.l10n.usernamePlaceholder,
                          prefixIcon:
                              const Icon(Icons.alternate_email),
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                          helperText:
                              context.l10n.usernameHelperText,
                          helperMaxLines: 1,
                        ),
                      ),
                      const SizedBox(height: 16),

                      // ---- Email ----
                      TextFormField(
                        controller: _emailController,
                        focusNode: _emailFocus,
                        keyboardType: TextInputType.emailAddress,
                        textInputAction: TextInputAction.next,
                        autocorrect: false,
                        enabled: !isLoading,
                        validator: _validateEmail,
                        onFieldSubmitted: (_) => FocusScope.of(context)
                            .requestFocus(_passwordFocus),
                        decoration: InputDecoration(
                          labelText: context.l10n.email,
                          hintText: context.l10n.emailPlaceholder,
                          prefixIcon:
                              const Icon(Icons.email_outlined),
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
                        textInputAction: TextInputAction.next,
                        enabled: !isLoading,
                        validator: _validatePassword,
                        onFieldSubmitted: (_) => FocusScope.of(context)
                            .requestFocus(_confirmPasswordFocus),
                        decoration: InputDecoration(
                          labelText: context.l10n.password,
                          prefixIcon:
                              const Icon(Icons.lock_outline),
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
                      PasswordStrengthIndicator(password: _password),
                      const SizedBox(height: 16),

                      // ---- Confirm Password ----
                      TextFormField(
                        controller: _confirmPasswordController,
                        focusNode: _confirmPasswordFocus,
                        obscureText: _obscureConfirm,
                        textInputAction: TextInputAction.done,
                        enabled: !isLoading,
                        validator: _validateConfirmPassword,
                        onFieldSubmitted: (_) => _onRegister(),
                        decoration: InputDecoration(
                          labelText: context.l10n.confirmPassword,
                          prefixIcon:
                              const Icon(Icons.lock_outline),
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                          suffixIcon: IconButton(
                            icon: Icon(
                              _obscureConfirm
                                  ? Icons.visibility_off_outlined
                                  : Icons.visibility_outlined,
                            ),
                            onPressed: () => setState(
                                () => _obscureConfirm = !_obscureConfirm),
                          ),
                        ),
                      ),
                      const SizedBox(height: 24),

                      // ---- Create Account button ----
                      FilledButton(
                        onPressed: isLoading ? null : _onRegister,
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
                                context.l10n.createAccount,
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

                      // ---- Social ----
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

                      // ---- Login link ----
                      Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Text(
                            context.l10n.alreadyHaveAccount,
                            style: theme.textTheme.bodyMedium,
                          ),
                          GestureDetector(
                            onTap: isLoading
                                ? null
                                : () => context.pop(),
                            child: Text(
                              context.l10n.login,
                              style: theme.textTheme.bodyMedium?.copyWith(
                                color: theme.colorScheme.primary,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 24),
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
// Private helpers
// =============================================================================

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
