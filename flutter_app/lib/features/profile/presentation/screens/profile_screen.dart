import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:share_plus/share_plus.dart';

import '../../../../core/router/route_names.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../core/utils/extensions.dart';
import '../../../../l10n/l10n.dart';
import '../../../auth/presentation/providers/auth_provider.dart';
import '../../../shop/presentation/widgets/coin_balance_badge.dart';
import '../providers/profile_provider.dart';
import '../widgets/achievement_showcase.dart';
import '../widgets/profile_header.dart';
import '../widgets/stats_row.dart';
import '../widgets/submission_grid.dart';

/// Displays a user's profile.
///
/// If no [userId] is provided, shows the authenticated user's own profile.
class ProfileScreen extends ConsumerStatefulWidget {
  final String? userId;

  const ProfileScreen({super.key, this.userId});

  @override
  ConsumerState<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends ConsumerState<ProfileScreen> {
  late final String _userId;
  late final bool _isOwnProfile;

  @override
  void initState() {
    super.initState();
    final currentUser = ref.read(currentUserProvider);
    _userId = widget.userId ?? currentUser?.id ?? '';
    _isOwnProfile = widget.userId == null || widget.userId == currentUser?.id;
  }

  @override
  Widget build(BuildContext context) {
    final profileState = ref.watch(profileProvider(_userId));
    final profile = profileState.profile;

    return Scaffold(
      appBar: AppBar(
        title: Text(profile?.username != null ? '@${profile!.username}' : 'Profile'),
        actions: [
          if (_isOwnProfile) ...[
            const CoinBalanceBadge(),
            const SizedBox(width: 4),
            IconButton(
              icon: const Icon(Icons.settings_outlined),
              onPressed: () => context.pushNamed(RouteNames.settings),
            ),
          ] else ...[
            PopupMenuButton<String>(
              onSelected: (value) => _handleMenuAction(value),
              itemBuilder: (context) => [
                PopupMenuItem(
                  value: 'report',
                  child: Row(
                    children: [
                      const Icon(Icons.flag_outlined, size: 20),
                      const SizedBox(width: 8),
                      Text(context.l10n.reportUser),
                    ],
                  ),
                ),
                PopupMenuItem(
                  value: 'block',
                  child: Row(
                    children: [
                      const Icon(Icons.block_outlined, size: 20),
                      const SizedBox(width: 8),
                      Text(context.l10n.blockUser),
                    ],
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
      body: _buildBody(profileState),
    );
  }

  Widget _buildBody(ProfileState profileState) {
    if (profileState.status == ProfileStatus.loading &&
        profileState.profile == null) {
      return const Center(
        child: CircularProgressIndicator(color: AppColors.primary),
      );
    }

    if (profileState.status == ProfileStatus.error &&
        profileState.profile == null) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.error_outline, size: 48, color: AppColors.error),
            const SizedBox(height: 16),
            Text(
              'Failed to load profile',
              style: AppTextStyles.heading4,
            ),
            const SizedBox(height: 8),
            TextButton(
              onPressed: () =>
                  ref.read(profileProvider(_userId).notifier).loadProfile(),
              child: Text(context.l10n.retry),
            ),
          ],
        ),
      );
    }

    final profile = profileState.profile;
    if (profile == null) return const SizedBox.shrink();

    return RefreshIndicator(
      color: AppColors.primary,
      onRefresh: () =>
          ref.read(profileProvider(_userId).notifier).loadProfile(),
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Profile header
            ProfileHeader(
              profile: profile,
              isOwnProfile: _isOwnProfile,
              onFollowTap: _isOwnProfile
                  ? null
                  : () => ref
                      .read(profileProvider(_userId).notifier)
                      .toggleFollow(),
              onEditTap: _isOwnProfile
                  ? () => context.pushNamed(RouteNames.editProfile)
                  : null,
              onShareTap: () => _shareProfile(profile.username),
            ),

            const SizedBox(height: 16),

            // Stats row
            StatsRow(
              submissionCount: profile.submissionCount,
              followerCount: profile.followerCount,
              followingCount: profile.followingCount,
              onFollowersTap: () => context.pushNamed(
                RouteNames.followers,
                pathParameters: {'userId': profile.id},
                queryParameters: {'tab': 'followers'},
              ),
              onFollowingTap: () => context.pushNamed(
                RouteNames.followers,
                pathParameters: {'userId': profile.id},
                queryParameters: {'tab': 'following'},
              ),
            ),

            // Gift coins received (own profile)
            if (_isOwnProfile && profile.coinBalance > 0) ...[
              const SizedBox(height: 12),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: AppColors.accent.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.auto_awesome,
                          color: AppColors.accent, size: 20),
                      const SizedBox(width: 8),
                      Text(
                        '${profile.coinBalance} Sparks',
                        style: AppTextStyles.bodyMediumBold.copyWith(
                          color: AppColors.accent,
                        ),
                      ),
                      const Spacer(),
                      TextButton(
                        onPressed: () =>
                            context.pushNamed(RouteNames.shopCoins),
                        child: Text(context.l10n.getMore),
                      ),
                    ],
                  ),
                ),
              ),
            ],

            const SizedBox(height: 20),

            // Achievement showcase
            AchievementShowcase(
              achievements: _buildPlaceholderAchievements(),
            ),

            const SizedBox(height: 20),

            // Submissions section header
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Text(
                'Submissions',
                style: AppTextStyles.heading4,
              ),
            ),
            const SizedBox(height: 8),

            // Submissions grid
            SubmissionGrid(
              submissions: profileState.submissions,
              hasMore: profileState.hasMoreSubmissions,
              isLoading: profileState.isLoading,
              onLoadMore: () => ref
                  .read(profileProvider(_userId).notifier)
                  .loadMoreSubmissions(),
              onSubmissionTap: (submission) {
                // Navigate to submission detail / video player
                context.pushNamed(
                  RouteNames.challengeDetail,
                  pathParameters: {'id': submission.challengeId},
                );
              },
            ),

            const SizedBox(height: 32),
          ],
        ),
      ),
    );
  }

  void _shareProfile(String username) {
    Share.share(
      'Check out @$username on 30 Sec Challenge! https://30secchallenge.app/u/$username',
    );
  }

  void _handleMenuAction(String action) {
    switch (action) {
      case 'report':
        _showReportDialog();
        break;
      case 'block':
        _showBlockDialog();
        break;
    }
  }

  void _showReportDialog() {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(context.l10n.reportUser),
        content: Text(
          context.l10n.reportUserConfirm,
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: Text(context.l10n.cancel),
          ),
          TextButton(
            onPressed: () {
              Navigator.of(ctx).pop();
              context.showSnackBar(context.l10n.userReported);
            },
            child: Text(
              'Report',
              style: TextStyle(color: AppColors.error),
            ),
          ),
        ],
      ),
    );
  }

  void _showBlockDialog() {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(context.l10n.blockUser),
        content: Text(
          context.l10n.blockUserConfirm,
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: Text(context.l10n.cancel),
          ),
          TextButton(
            onPressed: () {
              Navigator.of(ctx).pop();
              context.showSnackBar(context.l10n.userBlocked);
            },
            child: Text(
              'Block',
              style: TextStyle(color: AppColors.error),
            ),
          ),
        ],
      ),
    );
  }

  /// Placeholder achievements -- in production these would come from the API.
  List<Achievement> _buildPlaceholderAchievements() {
    return const [
      Achievement(
        id: 'first_submission',
        name: 'First Steps',
        iconAsset: '',
        description: 'Made your first submission!',
        isEarned: true,
      ),
      Achievement(
        id: 'hundred_votes',
        name: '100 Votes',
        iconAsset: '',
        description: 'Received 100 votes total.',
        isEarned: true,
      ),
      Achievement(
        id: 'streak_7',
        name: 'On Fire',
        iconAsset: '',
        description: 'Participated 7 days in a row.',
        isEarned: true,
      ),
      Achievement(
        id: 'top_10',
        name: 'Top 10',
        iconAsset: '',
        description: 'Placed in the top 10 of a challenge.',
        isEarned: false,
      ),
    ];
  }
}
