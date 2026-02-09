import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../../core/router/route_names.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../core/utils/extensions.dart';
import '../../../../l10n/l10n.dart';
import '../../../auth/presentation/providers/auth_provider.dart';
import '../../../shop/presentation/providers/shop_provider.dart';

/// Application settings screen.
class SettingsScreen extends ConsumerWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final subscriptionState = ref.watch(subscriptionProvider);

    return Scaffold(
      appBar: AppBar(
        title: Text(context.l10n.settings),
      ),
      body: ListView(
        children: [
          // ------------------------------------------------------------------
          // Account
          // ------------------------------------------------------------------
          _SectionHeader(title: context.l10n.accountSection),
          _SettingsTile(
            icon: Icons.person_outline,
            title: context.l10n.editProfile,
            onTap: () => context.pushNamed(RouteNames.editProfile),
          ),
          _SettingsTile(
            icon: Icons.lock_outline,
            title: context.l10n.changePassword,
            onTap: () => _showChangePasswordDialog(context),
          ),

          // ------------------------------------------------------------------
          // Subscription
          // ------------------------------------------------------------------
          _SectionHeader(title: context.l10n.subscriptionSection),
          _SettingsTile(
            icon: Icons.workspace_premium_outlined,
            title: context.l10n.currentPlan,
            trailing: Container(
              padding:
                  const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                color: subscriptionState.isPro
                    ? AppColors.accent.withValues(alpha: 0.2)
                    : AppColors.lightSurfaceVariant,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(
                subscriptionState.isPro ? context.l10n.pro : context.l10n.free,
                style: AppTextStyles.caption.copyWith(
                  fontWeight: FontWeight.w700,
                  color: subscriptionState.isPro
                      ? AppColors.accentDark
                      : AppColors.lightOnSurfaceVariant,
                ),
              ),
            ),
            onTap: () => context.pushNamed(RouteNames.shopSubscription),
          ),
          _SettingsTile(
            icon: Icons.auto_awesome,
            title: context.l10n.manageSubscription,
            onTap: () => context.pushNamed(RouteNames.shopSubscription),
          ),

          // ------------------------------------------------------------------
          // Notifications
          // ------------------------------------------------------------------
          _SectionHeader(title: context.l10n.notifications),
          _SettingsTile(
            icon: Icons.notifications_outlined,
            title: context.l10n.notificationSettings,
            onTap: () => context.pushNamed('notificationSettings'),
          ),

          // ------------------------------------------------------------------
          // Privacy
          // ------------------------------------------------------------------
          _SectionHeader(title: context.l10n.privacySection),
          _SettingsTile(
            icon: Icons.block_outlined,
            title: context.l10n.blockedUsers,
            onTap: () => context.showSnackBar(context.l10n.comingSoon),
          ),
          _SettingsTile(
            icon: Icons.delete_forever_outlined,
            title: context.l10n.deleteAccount,
            titleColor: AppColors.error,
            onTap: () => _showDeleteAccountDialog(context, ref),
          ),

          // ------------------------------------------------------------------
          // App
          // ------------------------------------------------------------------
          _SectionHeader(title: context.l10n.appSection),
          _SettingsTile(
            icon: Icons.language,
            title: context.l10n.language,
            trailing: Text(
              context.l10n.english,
              style: AppTextStyles.bodyMedium.copyWith(
                color: isDark
                    ? AppColors.darkOnSurfaceVariant
                    : AppColors.lightOnSurfaceVariant,
              ),
            ),
            onTap: () => _showLanguagePicker(context),
          ),
          _SettingsTile(
            icon: Icons.palette_outlined,
            title: context.l10n.theme,
            trailing: Text(
              context.l10n.themeSystem,
              style: AppTextStyles.bodyMedium.copyWith(
                color: isDark
                    ? AppColors.darkOnSurfaceVariant
                    : AppColors.lightOnSurfaceVariant,
              ),
            ),
            onTap: () => _showThemePicker(context),
          ),
          _SettingsTile(
            icon: Icons.info_outline,
            title: context.l10n.about,
            onTap: () => _showAboutDialog(context),
          ),
          _SettingsTile(
            icon: Icons.description_outlined,
            title: context.l10n.termsOfService,
            onTap: () => _launchUrl('https://30secchallenge.app/terms'),
          ),
          _SettingsTile(
            icon: Icons.privacy_tip_outlined,
            title: context.l10n.privacyPolicy,
            onTap: () => _launchUrl('https://30secchallenge.app/privacy'),
          ),

          // ------------------------------------------------------------------
          // Logout
          // ------------------------------------------------------------------
          const SizedBox(height: 24),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: ElevatedButton(
              onPressed: () => _showLogoutDialog(context, ref),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.error,
                foregroundColor: Colors.white,
              ),
              child: Text(context.l10n.logout),
            ),
          ),

          // App version
          const SizedBox(height: 24),
          Center(
            child: Text(
              context.l10n.appVersion('1.0.0 (1)'),
              style: AppTextStyles.caption.copyWith(
                color: isDark
                    ? AppColors.darkOnSurfaceVariant
                    : AppColors.lightOnSurfaceVariant,
              ),
            ),
          ),
          const SizedBox(height: 32),
        ],
      ),
    );
  }

  void _showChangePasswordDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(context.l10n.changePassword),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              decoration: InputDecoration(labelText: context.l10n.currentPassword),
              obscureText: true,
            ),
            const SizedBox(height: 12),
            TextField(
              decoration: InputDecoration(labelText: context.l10n.newPassword),
              obscureText: true,
            ),
            const SizedBox(height: 12),
            TextField(
              decoration: InputDecoration(labelText: context.l10n.confirmNewPassword),
              obscureText: true,
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: Text(context.l10n.cancel),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.of(ctx).pop();
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(content: Text(context.l10n.passwordUpdated)),
              );
            },
            child: Text(context.l10n.update),
          ),
        ],
      ),
    );
  }

  void _showDeleteAccountDialog(BuildContext context, WidgetRef ref) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(context.l10n.deleteAccount),
        content: Text(
          context.l10n.deleteAccountWarning,
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: Text(context.l10n.cancel),
          ),
          TextButton(
            onPressed: () {
              Navigator.of(ctx).pop();
              // Call delete account API then logout
              ref.read(authProvider.notifier).logout();
            },
            child: Text(
              context.l10n.deleteAccount,
              style: TextStyle(color: AppColors.error),
            ),
          ),
        ],
      ),
    );
  }

  void _showLanguagePicker(BuildContext context) {
    showModalBottomSheet(
      context: context,
      builder: (ctx) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const SizedBox(height: 8),
            Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: AppColors.lightDisabled,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            const SizedBox(height: 16),
            Text(context.l10n.selectLanguage, style: AppTextStyles.heading4),
            const SizedBox(height: 8),
            ListTile(
              leading: const Text('EN', style: TextStyle(fontSize: 24)),
              title: Text(context.l10n.english),
              trailing: const Icon(Icons.check, color: AppColors.primary),
              onTap: () => Navigator.of(ctx).pop(),
            ),
            ListTile(
              leading: const Text('JA', style: TextStyle(fontSize: 24)),
              title: Text(context.l10n.japanese),
              onTap: () => Navigator.of(ctx).pop(),
            ),
            const SizedBox(height: 16),
          ],
        ),
      ),
    );
  }

  void _showThemePicker(BuildContext context) {
    showModalBottomSheet(
      context: context,
      builder: (ctx) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const SizedBox(height: 8),
            Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: AppColors.lightDisabled,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            const SizedBox(height: 16),
            Text(context.l10n.selectTheme, style: AppTextStyles.heading4),
            const SizedBox(height: 8),
            ListTile(
              leading: const Icon(Icons.brightness_auto),
              title: Text(context.l10n.themeSystem),
              trailing: const Icon(Icons.check, color: AppColors.primary),
              onTap: () => Navigator.of(ctx).pop(),
            ),
            ListTile(
              leading: const Icon(Icons.light_mode),
              title: Text(context.l10n.themeLight),
              onTap: () => Navigator.of(ctx).pop(),
            ),
            ListTile(
              leading: const Icon(Icons.dark_mode),
              title: Text(context.l10n.themeDark),
              onTap: () => Navigator.of(ctx).pop(),
            ),
            const SizedBox(height: 16),
          ],
        ),
      ),
    );
  }

  void _showAboutDialog(BuildContext context) {
    showAboutDialog(
      context: context,
      applicationName: context.l10n.appTitle,
      applicationVersion: '1.0.0',
      applicationLegalese: '(c) 2025 30 Sec Challenge. All rights reserved.',
    );
  }

  void _showLogoutDialog(BuildContext context, WidgetRef ref) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(context.l10n.logout),
        content: Text(context.l10n.logoutConfirm),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: Text(context.l10n.cancel),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.of(ctx).pop();
              ref.read(authProvider.notifier).logout();
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.error,
              foregroundColor: Colors.white,
            ),
            child: Text(context.l10n.logout),
          ),
        ],
      ),
    );
  }

  Future<void> _launchUrl(String url) async {
    final uri = Uri.parse(url);
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }
}

// =============================================================================
// Helper Widgets
// =============================================================================

class _SectionHeader extends StatelessWidget {
  final String title;

  const _SectionHeader({required this.title});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 24, 16, 8),
      child: Text(
        title.toUpperCase(),
        style: AppTextStyles.overline.copyWith(
          color: isDark
              ? AppColors.darkOnSurfaceVariant
              : AppColors.lightOnSurfaceVariant,
        ),
      ),
    );
  }
}

class _SettingsTile extends StatelessWidget {
  final IconData icon;
  final String title;
  final Color? titleColor;
  final Widget? trailing;
  final VoidCallback? onTap;

  const _SettingsTile({
    required this.icon,
    required this.title,
    this.titleColor,
    this.trailing,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return ListTile(
      leading: Icon(icon, size: 22),
      title: Text(
        title,
        style: AppTextStyles.bodyMedium.copyWith(
          color: titleColor,
        ),
      ),
      trailing: trailing ??
          const Icon(Icons.chevron_right, size: 20, color: AppColors.lightDisabled),
      onTap: onTap,
    );
  }
}
