import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../features/auth/presentation/providers/auth_provider.dart';
import '../../features/auth/presentation/screens/login_screen.dart';
import '../../features/auth/presentation/screens/onboarding_screen.dart';
import '../../features/challenge/presentation/screens/challenge_detail_screen.dart';
import '../../features/challenge/presentation/screens/challenge_home_screen.dart';
import '../../features/feed/presentation/screens/feed_screen.dart';
import '../../features/leaderboard/data/leaderboard_repository.dart';
import '../../features/leaderboard/domain/leaderboard_entry.dart';
import '../../features/leaderboard/presentation/providers/leaderboard_provider.dart';
import '../../features/leaderboard/presentation/screens/leaderboard_screen.dart';
import '../../features/notifications/presentation/screens/notifications_screen.dart';
import '../../features/profile/presentation/screens/edit_profile_screen.dart';
import '../../features/profile/presentation/screens/followers_screen.dart';
import '../../features/profile/presentation/screens/profile_screen.dart';
import '../../features/profile/presentation/screens/settings_screen.dart';
import '../../features/recording/presentation/screens/camera_screen.dart';
import '../../features/recording/presentation/screens/preview_screen.dart';
import '../../features/recording/presentation/screens/video_editor_screen.dart';
import '../../features/shop/presentation/screens/coin_store_screen.dart';
import '../../features/shop/presentation/screens/subscription_screen.dart';
import '../../features/voting/presentation/screens/voting_screen.dart';
import '../services/auth_storage_service.dart';
import '../theme/app_colors.dart';
import '../theme/app_text_styles.dart';
import '../widgets/bottom_nav_bar.dart';
import 'route_names.dart';

// =============================================================================
// Shell scaffold with bottom nav (TikTok-style: auth gate for Record & Profile)
// =============================================================================

class _MainShell extends ConsumerWidget {
  final StatefulNavigationShell navigationShell;

  const _MainShell({required this.navigationShell});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      body: navigationShell,
      bottomNavigationBar: AppBottomNavBar(
        currentIndex: navigationShell.currentIndex,
        onTap: (index) {
          // Auth-required tabs: Record (2) and Profile (4)
          if (index == 2 || index == 4) {
            final isLoggedIn = ref.read(isLoggedInProvider);
            if (!isLoggedIn) {
              context.push('/login');
              return;
            }
          }
          navigationShell.goBranch(
            index,
            initialLocation: index == navigationShell.currentIndex,
          );
        },
      ),
    );
  }
}

// =============================================================================
// Router configuration
// =============================================================================

final appRouterProvider = Provider<GoRouter>((ref) {
  final authStorage = ref.read(authStorageServiceProvider);

  return GoRouter(
    initialLocation: '/',
    debugLogDiagnostics: true,

    // -------------------------------------------------------------------------
    // Auth redirect -- TikTok style: only gate actions, not browsing
    // -------------------------------------------------------------------------
    redirect: (context, state) async {
      final isLoggedIn = await authStorage.isLoggedIn();
      final currentPath = state.matchedLocation;

      // Auth pages (login, onboarding).
      const authPaths = {'/login', '/onboarding'};

      // Routes that require authentication (actions, not browsing).
      const authRequiredPrefixes = [
        '/record',
        '/profile',
        '/notifications',
        '/settings',
        '/shop',
        '/voting',
      ];

      // If logged in and on an auth page, redirect to home.
      if (isLoggedIn && authPaths.contains(currentPath)) {
        return '/';
      }

      // If NOT logged in and trying to access an auth-required route,
      // redirect to login.
      if (!isLoggedIn) {
        final needsAuth = authRequiredPrefixes.any(
          (prefix) => currentPath.startsWith(prefix),
        );
        if (needsAuth) {
          return '/login';
        }
      }

      // All other routes are publicly browseable (home, feed, leaderboard, etc.)
      return null;
    },

    // -------------------------------------------------------------------------
    // Routes
    // -------------------------------------------------------------------------
    routes: [
      // -- Auth routes --------------------------------------------------------
      GoRoute(
        path: '/login',
        name: RouteNames.login,
        builder: (context, state) => const LoginScreen(),
      ),
      GoRoute(
        path: '/onboarding',
        name: RouteNames.onboarding,
        builder: (context, state) => const OnboardingScreen(),
      ),

      // -- Main tabs with bottom nav ------------------------------------------
      StatefulShellRoute.indexedStack(
        builder: (context, state, navigationShell) {
          return _MainShell(navigationShell: navigationShell);
        },
        branches: [
          // Branch 0: Home / Active Challenge
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/',
                name: RouteNames.home,
                builder: (context, state) => const ChallengeHomeScreen(),
                routes: [
                  GoRoute(
                    path: 'challenge/:id',
                    name: RouteNames.challengeDetail,
                    builder: (context, state) {
                      final id = state.pathParameters['id']!;
                      return ChallengeDetailScreen(challengeId: id);
                    },
                  ),
                ],
              ),
            ],
          ),

          // Branch 1: Discover / Feed
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/feed',
                name: RouteNames.feed,
                builder: (context, state) => const FeedScreen(),
              ),
            ],
          ),

          // Branch 2: Record (auth required -- gated by _MainShell)
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/record',
                name: RouteNames.record,
                builder: (context, state) {
                  final extra = state.extra as Map<String, dynamic>?;
                  final challengeId = extra?['challengeId'] as String? ?? '';
                  return CameraScreen(challengeId: challengeId);
                },
                routes: [
                  GoRoute(
                    path: 'edit',
                    name: RouteNames.videoEditor,
                    builder: (context, state) {
                      final extra = state.extra as Map<String, dynamic>?;
                      return VideoEditorScreen(
                        challengeId: extra?['challengeId'] as String? ?? '',
                        filePath: extra?['filePath'] as String? ?? '',
                        durationMs: extra?['durationMs'] as int?,
                      );
                    },
                  ),
                  GoRoute(
                    path: 'preview',
                    name: RouteNames.preview,
                    builder: (context, state) {
                      final extra = state.extra as Map<String, dynamic>?;
                      return PreviewScreen(
                        challengeId: extra?['challengeId'] as String? ?? '',
                        filePath: extra?['filePath'] as String? ?? '',
                        durationMs: extra?['durationMs'] as int? ?? 0,
                      );
                    },
                  ),
                ],
              ),
            ],
          ),

          // Branch 3: Leaderboard (publicly browseable)
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/leaderboard',
                name: RouteNames.leaderboard,
                builder: (context, state) =>
                    const _LeaderboardOverviewScreen(),
                routes: [
                  GoRoute(
                    path: 'challenge/:challengeId',
                    name: RouteNames.challengeLeaderboard,
                    builder: (context, state) {
                      final challengeId =
                          state.pathParameters['challengeId']!;
                      final extra =
                          state.extra as Map<String, dynamic>?;
                      final title =
                          extra?['title'] as String? ?? 'Leaderboard';
                      return LeaderboardScreen(
                        challengeId: challengeId,
                        challengeTitle: title,
                      );
                    },
                  ),
                ],
              ),
            ],
          ),

          // Branch 4: Profile (auth required -- gated by _MainShell)
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/profile',
                name: RouteNames.profile,
                builder: (context, state) => const ProfileScreen(),
                routes: [
                  GoRoute(
                    path: 'edit',
                    name: RouteNames.editProfile,
                    builder: (context, state) => const EditProfileScreen(),
                  ),
                ],
              ),
            ],
          ),
        ],
      ),

      // -- Standalone routes (pushed on top of shell) -------------------------
      GoRoute(
        path: '/user/:userId',
        name: RouteNames.userProfile,
        builder: (context, state) {
          final userId = state.pathParameters['userId']!;
          return ProfileScreen(userId: userId);
        },
        routes: [
          GoRoute(
            path: 'followers',
            name: RouteNames.followers,
            builder: (context, state) {
              final userId = state.pathParameters['userId']!;
              return FollowersScreen(userId: userId, initialTab: 'followers');
            },
          ),
          GoRoute(
            path: 'following',
            name: RouteNames.following,
            builder: (context, state) {
              final userId = state.pathParameters['userId']!;
              return FollowersScreen(userId: userId, initialTab: 'following');
            },
          ),
        ],
      ),
      GoRoute(
        path: '/voting/:challengeId',
        name: RouteNames.voting,
        builder: (context, state) {
          final challengeId = state.pathParameters['challengeId']!;
          return VotingScreen(
            challengeId: challengeId,
            challengeTitle: '',
          );
        },
      ),
      GoRoute(
        path: '/notifications',
        name: RouteNames.notifications,
        builder: (context, state) => const NotificationsScreen(),
      ),
      GoRoute(
        path: '/settings',
        name: RouteNames.settings,
        builder: (context, state) => const SettingsScreen(),
      ),
      GoRoute(
        path: '/shop',
        name: RouteNames.shop,
        builder: (context, state) => const CoinStoreScreen(),
        routes: [
          GoRoute(
            path: 'coins',
            name: RouteNames.shopCoins,
            builder: (context, state) => const CoinStoreScreen(),
          ),
          GoRoute(
            path: 'subscription',
            name: RouteNames.shopSubscription,
            builder: (context, state) => const SubscriptionScreen(),
          ),
        ],
      ),
    ],

    // -------------------------------------------------------------------------
    // Error page
    // -------------------------------------------------------------------------
    errorBuilder: (context, state) => Scaffold(
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.error_outline, size: 64, color: Colors.red),
            const SizedBox(height: 16),
            Text(
              'Page not found',
              style: Theme.of(context).textTheme.headlineSmall,
            ),
            const SizedBox(height: 8),
            Text(state.error?.toString() ?? 'Unknown error'),
            const SizedBox(height: 24),
            ElevatedButton(
              onPressed: () => context.go('/'),
              child: const Text('Go Home'),
            ),
          ],
        ),
      ),
    ),
  );
});

// =============================================================================
// Leaderboard overview tab — shows Top Creators with period tabs
// =============================================================================

class _LeaderboardOverviewScreen extends ConsumerWidget {
  const _LeaderboardOverviewScreen();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final state = ref.watch(topCreatorsProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Rankings'),
        backgroundColor: theme.scaffoldBackgroundColor,
        surfaceTintColor: Colors.transparent,
      ),
      body: Column(
        children: [
          // Period selector chips
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Row(
              children: LeaderboardPeriod.values.map((period) {
                final isSelected = state.period == period;
                return Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: ChoiceChip(
                    label: Text(period.displayName),
                    selected: isSelected,
                    onSelected: (_) {
                      ref.read(topCreatorsProvider.notifier).changePeriod(period);
                    },
                  ),
                );
              }).toList(),
            ),
          ),

          // Content
          Expanded(
            child: _buildContent(context, ref, state, isDark),
          ),
        ],
      ),
    );
  }

  Widget _buildContent(
    BuildContext context,
    WidgetRef ref,
    TopCreatorsState state,
    bool isDark,
  ) {
    if (state.status == TopCreatorsStatus.loading && state.creators.isEmpty) {
      return const Center(
        child: CircularProgressIndicator(color: AppColors.primary),
      );
    }

    if (state.status == TopCreatorsStatus.error && state.creators.isEmpty) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.error_outline, size: 48, color: AppColors.error),
            const SizedBox(height: 16),
            Text('Failed to load rankings', style: AppTextStyles.heading4),
            const SizedBox(height: 8),
            Text(
              state.errorMessage ?? '',
              style: AppTextStyles.bodyMedium.copyWith(
                color: AppColors.lightOnSurfaceVariant,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 16),
            ElevatedButton.icon(
              onPressed: () => ref.read(topCreatorsProvider.notifier).load(),
              icon: const Icon(Icons.refresh_rounded),
              label: const Text('Retry'),
            ),
          ],
        ),
      );
    }

    if (state.creators.isEmpty) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              Icons.leaderboard_rounded,
              size: 56,
              color: isDark
                  ? AppColors.darkOnSurfaceVariant
                  : AppColors.lightOnSurfaceVariant,
            ),
            const SizedBox(height: 16),
            Text('No rankings yet', style: AppTextStyles.heading4),
            const SizedBox(height: 8),
            Text(
              'Submit to a challenge to appear here!',
              style: AppTextStyles.bodyMedium.copyWith(
                color: isDark
                    ? AppColors.darkOnSurfaceVariant
                    : AppColors.lightOnSurfaceVariant,
              ),
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      color: AppColors.primary,
      onRefresh: () => ref.read(topCreatorsProvider.notifier).load(),
      child: ListView.builder(
        padding: const EdgeInsets.symmetric(horizontal: 16),
        itemCount: state.creators.length,
        itemBuilder: (context, index) {
          final creator = state.creators[index];
          return _TopCreatorTile(
            creator: creator,
            isDark: isDark,
            onTap: () {
              context.pushNamed(
                RouteNames.userProfile,
                pathParameters: {'userId': creator.userId},
              );
            },
          );
        },
      ),
    );
  }
}

class _TopCreatorTile extends StatelessWidget {
  final TopCreator creator;
  final bool isDark;
  final VoidCallback onTap;

  const _TopCreatorTile({
    required this.creator,
    required this.isDark,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final isTopThree = creator.rank <= 3;

    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      elevation: isTopThree ? 2 : 0.5,
      child: ListTile(
        onTap: onTap,
        leading: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            SizedBox(
              width: 32,
              child: Center(
                child: isTopThree
                    ? Icon(
                        Icons.emoji_events_rounded,
                        color: _medalColor(creator.rank),
                        size: 24,
                      )
                    : Text(
                        '#${creator.rank}',
                        style: AppTextStyles.bodyMediumBold.copyWith(
                          color: isDark
                              ? AppColors.darkOnSurfaceVariant
                              : AppColors.lightOnSurfaceVariant,
                        ),
                      ),
              ),
            ),
            const SizedBox(width: 8),
            CircleAvatar(
              radius: 20,
              backgroundImage: creator.avatarUrl != null
                  ? NetworkImage(creator.avatarUrl!)
                  : null,
              child: creator.avatarUrl == null
                  ? Text(
                      creator.displayNameOrUsername.isNotEmpty
                          ? creator.displayNameOrUsername[0].toUpperCase()
                          : '?',
                    )
                  : null,
            ),
          ],
        ),
        title: Text(
          creator.displayNameOrUsername,
          style: AppTextStyles.bodyMediumBold,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
        ),
        subtitle: Text(
          '@${creator.username}',
          style: AppTextStyles.caption,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
        ),
        trailing: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Text(
              creator.aggregateScore.toStringAsFixed(1),
              style: AppTextStyles.bodyMediumBold.copyWith(
                color: AppColors.primary,
              ),
            ),
            Text(
              '${creator.submissionCount} submissions',
              style: AppTextStyles.caption,
            ),
          ],
        ),
      ),
    );
  }

  Color _medalColor(int rank) {
    switch (rank) {
      case 1:
        return const Color(0xFFFFD700); // Gold
      case 2:
        return const Color(0xFFC0C0C0); // Silver
      case 3:
        return const Color(0xFFCD7F32); // Bronze
      default:
        return AppColors.primary;
    }
  }
}
