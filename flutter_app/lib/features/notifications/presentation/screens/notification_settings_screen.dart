import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../l10n/l10n.dart';
import '../../data/notification_repository.dart';

/// State provider for notification settings toggles.
final _notificationSettingsProvider =
    StateNotifierProvider<_NotificationSettingsNotifier, Map<String, bool>>(
  (ref) {
    return _NotificationSettingsNotifier(
      repository: ref.watch(notificationRepositoryProvider),
    );
  },
);

class _NotificationSettingsNotifier extends StateNotifier<Map<String, bool>> {
  final NotificationRepository _repository;

  _NotificationSettingsNotifier({required NotificationRepository repository})
      : _repository = repository,
        super(const {}) {
    _load();
  }

  Future<void> _load() async {
    try {
      final settings = await _repository.getSettings();
      state = settings;
    } catch (_) {
      // Use defaults if loading fails.
      state = {
        'new_follower': true,
        'vote_received': true,
        'gift_received': true,
        'challenge_start': true,
        'rank_achieved': true,
        'achievement_earned': true,
        'submission_status': true,
        'marketing': false,
      };
    }
  }

  Future<void> toggle(String key) async {
    final current = state[key] ?? true;
    state = {...state, key: !current};
    try {
      await _repository.updateSettings(state);
    } catch (_) {
      // Revert on failure.
      state = {...state, key: current};
    }
  }
}

/// Screen for configuring notification preferences.
class NotificationSettingsScreen extends ConsumerWidget {
  const NotificationSettingsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final settings = ref.watch(_notificationSettingsProvider);
    final isDark = Theme.of(context).brightness == Brightness.dark;

    final items = <_SettingItem>[
      _SettingItem(
        key: 'new_follower',
        icon: Icons.person_add_outlined,
        title: context.l10n.notifNewFollower,
        subtitle: context.l10n.notifNewFollowerDesc,
      ),
      _SettingItem(
        key: 'vote_received',
        icon: Icons.favorite_outline,
        title: context.l10n.notifVoteReceived,
        subtitle: context.l10n.notifVoteReceivedDesc,
      ),
      _SettingItem(
        key: 'gift_received',
        icon: Icons.card_giftcard_outlined,
        title: context.l10n.notifGiftReceived,
        subtitle: context.l10n.notifGiftReceivedDesc,
      ),
      _SettingItem(
        key: 'challenge_start',
        icon: Icons.flag_outlined,
        title: context.l10n.notifChallengeStart,
        subtitle: context.l10n.notifChallengeStartDesc,
      ),
      _SettingItem(
        key: 'rank_achieved',
        icon: Icons.emoji_events_outlined,
        title: context.l10n.notifRankAchieved,
        subtitle: context.l10n.notifRankAchievedDesc,
      ),
      _SettingItem(
        key: 'achievement_earned',
        icon: Icons.military_tech_outlined,
        title: context.l10n.notifAchievementEarned,
        subtitle: context.l10n.notifAchievementEarnedDesc,
      ),
      _SettingItem(
        key: 'submission_status',
        icon: Icons.videocam_outlined,
        title: context.l10n.notifSubmissionStatus,
        subtitle: context.l10n.notifSubmissionStatusDesc,
      ),
      _SettingItem(
        key: 'marketing',
        icon: Icons.campaign_outlined,
        title: context.l10n.notifMarketing,
        subtitle: context.l10n.notifMarketingDesc,
      ),
    ];

    return Scaffold(
      appBar: AppBar(
        title: Text(context.l10n.notificationSettings),
      ),
      body: settings.isEmpty
          ? const Center(
              child: CircularProgressIndicator(color: AppColors.primary),
            )
          : ListView.separated(
              itemCount: items.length,
              separatorBuilder: (_, __) => const Divider(height: 1),
              itemBuilder: (context, index) {
                final item = items[index];
                final isEnabled = settings[item.key] ?? true;

                return SwitchListTile(
                  value: isEnabled,
                  onChanged: (_) => ref
                      .read(_notificationSettingsProvider.notifier)
                      .toggle(item.key),
                  secondary: Icon(item.icon, size: 24),
                  title: Text(
                    item.title,
                    style: AppTextStyles.bodyMediumBold,
                  ),
                  subtitle: Text(
                    item.subtitle,
                    style: AppTextStyles.caption.copyWith(
                      color: isDark
                          ? AppColors.darkOnSurfaceVariant
                          : AppColors.lightOnSurfaceVariant,
                    ),
                  ),
                  activeColor: AppColors.primary,
                );
              },
            ),
    );
  }
}

class _SettingItem {
  final String key;
  final IconData icon;
  final String title;
  final String subtitle;

  const _SettingItem({
    required this.key,
    required this.icon,
    required this.title,
    required this.subtitle,
  });
}
