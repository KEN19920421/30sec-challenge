import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/router/route_names.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../l10n/l10n.dart';
import '../../../auth/presentation/providers/auth_provider.dart';
import '../../../social/data/social_repository.dart';
import '../../../social/presentation/providers/social_provider.dart';

/// Screen showing a user's followers and following lists with tab bar.
class FollowersScreen extends ConsumerStatefulWidget {
  final String userId;
  final String initialTab; // 'followers' or 'following'

  const FollowersScreen({
    super.key,
    required this.userId,
    this.initialTab = 'followers',
  });

  @override
  ConsumerState<FollowersScreen> createState() => _FollowersScreenState();
}

class _FollowersScreenState extends ConsumerState<FollowersScreen>
    with SingleTickerProviderStateMixin {
  late final TabController _tabController;
  final _searchController = TextEditingController();
  bool _showSearch = false;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(
      length: 2,
      vsync: this,
      initialIndex: widget.initialTab == 'following' ? 1 : 0,
    );

    // Load data.
    Future.microtask(() {
      ref.read(followersProvider(widget.userId).notifier).load();
      ref.read(followingProvider(widget.userId).notifier).load();
    });

    _tabController.addListener(() {
      if (_showSearch) {
        _searchController.clear();
        _onSearchChanged('');
      }
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: _showSearch
            ? TextField(
                controller: _searchController,
                autofocus: true,
                decoration: InputDecoration(
                  hintText: context.l10n.searchUsers,
                  border: InputBorder.none,
                  filled: false,
                ),
                onChanged: _onSearchChanged,
              )
            : Text(context.l10n.connections),
        actions: [
          IconButton(
            icon: Icon(_showSearch ? Icons.close : Icons.search),
            onPressed: () {
              setState(() {
                _showSearch = !_showSearch;
                if (!_showSearch) {
                  _searchController.clear();
                  _onSearchChanged('');
                }
              });
            },
          ),
        ],
        bottom: TabBar(
          controller: _tabController,
          tabs: [
            Tab(text: context.l10n.followersTab),
            Tab(text: context.l10n.followingTab),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _FollowersList(userId: widget.userId),
          _FollowingList(userId: widget.userId),
        ],
      ),
    );
  }

  void _onSearchChanged(String query) {
    if (_tabController.index == 0) {
      ref
          .read(followersProvider(widget.userId).notifier)
          .load(search: query.isEmpty ? null : query);
    } else {
      ref
          .read(followingProvider(widget.userId).notifier)
          .load(search: query.isEmpty ? null : query);
    }
  }
}

// =============================================================================
// Followers Tab
// =============================================================================

class _FollowersList extends ConsumerWidget {
  final String userId;

  const _FollowersList({required this.userId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(followersProvider(userId));

    if (state.isLoading && state.users.isEmpty) {
      return const Center(
        child: CircularProgressIndicator(color: AppColors.primary),
      );
    }

    if (state.users.isEmpty) {
      return _buildEmptyState(context.l10n.noFollowersYet);
    }

    return NotificationListener<ScrollNotification>(
      onNotification: (notification) {
        if (notification is ScrollEndNotification &&
            notification.metrics.extentAfter < 200 &&
            state.hasMore &&
            !state.isLoading) {
          ref.read(followersProvider(userId).notifier).loadMore();
        }
        return false;
      },
      child: ListView.separated(
        itemCount: state.users.length + (state.hasMore ? 1 : 0),
        separatorBuilder: (_, __) => const Divider(height: 1),
        itemBuilder: (context, index) {
          if (index >= state.users.length) {
            return const Padding(
              padding: EdgeInsets.all(16),
              child: Center(
                child: CircularProgressIndicator(
                    strokeWidth: 2, color: AppColors.primary),
              ),
            );
          }
          return _UserListTile(
            user: state.users[index],
            currentUserId: ref.read(currentUserProvider)?.id ?? '',
            onFollowToggle: () => ref
                .read(followersProvider(userId).notifier)
                .toggleFollow(state.users[index].id),
            onTap: () => context.pushNamed(
              RouteNames.userProfile,
              pathParameters: {'userId': state.users[index].id},
            ),
          );
        },
      ),
    );
  }

  Widget _buildEmptyState(String message) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.people_outline, size: 64,
              color: AppColors.lightOnSurfaceVariant),
          const SizedBox(height: 16),
          Text(message, style: AppTextStyles.bodyLarge),
        ],
      ),
    );
  }
}

// =============================================================================
// Following Tab
// =============================================================================

class _FollowingList extends ConsumerWidget {
  final String userId;

  const _FollowingList({required this.userId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(followingProvider(userId));

    if (state.isLoading && state.users.isEmpty) {
      return const Center(
        child: CircularProgressIndicator(color: AppColors.primary),
      );
    }

    if (state.users.isEmpty) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.people_outline, size: 64,
                color: AppColors.lightOnSurfaceVariant),
            const SizedBox(height: 16),
            Text(context.l10n.notFollowingYet, style: AppTextStyles.bodyLarge),
          ],
        ),
      );
    }

    return NotificationListener<ScrollNotification>(
      onNotification: (notification) {
        if (notification is ScrollEndNotification &&
            notification.metrics.extentAfter < 200 &&
            state.hasMore &&
            !state.isLoading) {
          ref.read(followingProvider(userId).notifier).loadMore();
        }
        return false;
      },
      child: ListView.separated(
        itemCount: state.users.length + (state.hasMore ? 1 : 0),
        separatorBuilder: (_, __) => const Divider(height: 1),
        itemBuilder: (context, index) {
          if (index >= state.users.length) {
            return const Padding(
              padding: EdgeInsets.all(16),
              child: Center(
                child: CircularProgressIndicator(
                    strokeWidth: 2, color: AppColors.primary),
              ),
            );
          }
          return _UserListTile(
            user: state.users[index],
            currentUserId: ref.read(currentUserProvider)?.id ?? '',
            onFollowToggle: () => ref
                .read(followingProvider(userId).notifier)
                .toggleFollow(state.users[index].id),
            onTap: () => context.pushNamed(
              RouteNames.userProfile,
              pathParameters: {'userId': state.users[index].id},
            ),
          );
        },
      ),
    );
  }
}

// =============================================================================
// User List Tile
// =============================================================================

class _UserListTile extends StatelessWidget {
  final SocialUser user;
  final String currentUserId;
  final VoidCallback? onFollowToggle;
  final VoidCallback? onTap;

  const _UserListTile({
    required this.user,
    required this.currentUserId,
    this.onFollowToggle,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final isSelf = user.id == currentUserId;

    return ListTile(
      onTap: onTap,
      leading: CircleAvatar(
        radius: 24,
        backgroundColor: AppColors.primary.withValues(alpha: 0.1),
        backgroundImage: user.avatarUrl != null
            ? CachedNetworkImageProvider(user.avatarUrl!)
            : null,
        child: user.avatarUrl == null
            ? Text(
                user.displayName.isNotEmpty
                    ? user.displayName[0].toUpperCase()
                    : '?',
                style: AppTextStyles.heading4.copyWith(
                  color: AppColors.primary,
                ),
              )
            : null,
      ),
      title: Row(
        children: [
          Flexible(
            child: Text(
              user.displayName,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: AppTextStyles.bodyMediumBold,
            ),
          ),
          if (user.isVerified) ...[
            const SizedBox(width: 4),
            const Icon(Icons.verified, color: AppColors.info, size: 16),
          ],
          if (user.isPro) ...[
            const SizedBox(width: 4),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFFFFD700), Color(0xFFFFA500)],
                ),
                borderRadius: BorderRadius.circular(3),
              ),
              child: const Text(
                'PRO',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 8,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ),
          ],
        ],
      ),
      subtitle: Text(
        '@${user.username}',
        style: AppTextStyles.caption.copyWith(
          color: isDark
              ? AppColors.darkOnSurfaceVariant
              : AppColors.lightOnSurfaceVariant,
        ),
      ),
      trailing: isSelf
          ? null
          : SizedBox(
              width: 100,
              height: 32,
              child: user.isFollowing
                  ? OutlinedButton(
                      onPressed: onFollowToggle,
                      style: OutlinedButton.styleFrom(
                        padding: EdgeInsets.zero,
                        minimumSize: const Size(80, 32),
                        textStyle: AppTextStyles.buttonSmall,
                      ),
                      child: Text(context.l10n.following),
                    )
                  : ElevatedButton(
                      onPressed: onFollowToggle,
                      style: ElevatedButton.styleFrom(
                        padding: EdgeInsets.zero,
                        minimumSize: const Size(80, 32),
                        textStyle: AppTextStyles.buttonSmall,
                      ),
                      child: Text(context.l10n.follow),
                    ),
            ),
    );
  }
}
