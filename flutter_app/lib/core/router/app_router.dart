import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../services/auth_storage_service.dart';
import '../widgets/bottom_nav_bar.dart';
import 'route_names.dart';

// =============================================================================
// Placeholder pages -- replace with real feature pages as they are built.
// =============================================================================

class _Placeholder extends StatelessWidget {
  final String title;
  const _Placeholder(this.title);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(title)),
      body: Center(child: Text(title, style: const TextStyle(fontSize: 24))),
    );
  }
}

// =============================================================================
// Shell scaffold with bottom nav
// =============================================================================

class _MainShell extends StatelessWidget {
  final StatefulNavigationShell navigationShell;

  const _MainShell({required this.navigationShell});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: navigationShell,
      bottomNavigationBar: AppBottomNavBar(
        currentIndex: navigationShell.currentIndex,
        onTap: (index) {
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
    // Auth redirect
    // -------------------------------------------------------------------------
    redirect: (context, state) async {
      final isLoggedIn = await authStorage.isLoggedIn();
      final currentPath = state.matchedLocation;

      // Public routes that do not require authentication.
      const publicPaths = {'/login', '/register', '/forgot-password', '/onboarding'};

      if (!isLoggedIn && !publicPaths.contains(currentPath)) {
        return '/login';
      }
      if (isLoggedIn && publicPaths.contains(currentPath)) {
        return '/';
      }
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
        builder: (context, state) => const _Placeholder('Login'),
      ),
      GoRoute(
        path: '/register',
        name: RouteNames.register,
        builder: (context, state) => const _Placeholder('Register'),
      ),
      GoRoute(
        path: '/forgot-password',
        name: RouteNames.forgotPassword,
        builder: (context, state) => const _Placeholder('Forgot Password'),
      ),
      GoRoute(
        path: '/onboarding',
        name: RouteNames.onboarding,
        builder: (context, state) => const _Placeholder('Onboarding'),
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
                builder: (context, state) => const _Placeholder('Home'),
                routes: [
                  GoRoute(
                    path: 'challenge/:id',
                    name: RouteNames.challengeDetail,
                    builder: (context, state) {
                      final id = state.pathParameters['id']!;
                      return _Placeholder('Challenge $id');
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
                builder: (context, state) => const _Placeholder('Discover'),
              ),
            ],
          ),

          // Branch 2: Record (center FAB target)
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/record',
                name: RouteNames.record,
                builder: (context, state) => const _Placeholder('Record'),
                routes: [
                  GoRoute(
                    path: 'preview',
                    name: RouteNames.preview,
                    builder: (context, state) => const _Placeholder('Preview'),
                  ),
                ],
              ),
            ],
          ),

          // Branch 3: Leaderboard
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/leaderboard',
                name: RouteNames.leaderboard,
                builder: (context, state) =>
                    const _Placeholder('Leaderboard'),
              ),
            ],
          ),

          // Branch 4: Profile
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/profile',
                name: RouteNames.profile,
                builder: (context, state) => const _Placeholder('Profile'),
                routes: [
                  GoRoute(
                    path: 'edit',
                    name: RouteNames.editProfile,
                    builder: (context, state) =>
                        const _Placeholder('Edit Profile'),
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
          return _Placeholder('User $userId');
        },
        routes: [
          GoRoute(
            path: 'followers',
            name: RouteNames.followers,
            builder: (context, state) {
              final userId = state.pathParameters['userId']!;
              return _Placeholder('Followers of $userId');
            },
          ),
          GoRoute(
            path: 'following',
            name: RouteNames.following,
            builder: (context, state) {
              final userId = state.pathParameters['userId']!;
              return _Placeholder('Following of $userId');
            },
          ),
        ],
      ),
      GoRoute(
        path: '/voting/:challengeId',
        name: RouteNames.voting,
        builder: (context, state) {
          final challengeId = state.pathParameters['challengeId']!;
          return _Placeholder('Voting $challengeId');
        },
      ),
      GoRoute(
        path: '/notifications',
        name: RouteNames.notifications,
        builder: (context, state) => const _Placeholder('Notifications'),
      ),
      GoRoute(
        path: '/settings',
        name: RouteNames.settings,
        builder: (context, state) => const _Placeholder('Settings'),
      ),
      GoRoute(
        path: '/shop',
        name: RouteNames.shop,
        builder: (context, state) => const _Placeholder('Shop'),
        routes: [
          GoRoute(
            path: 'coins',
            name: RouteNames.shopCoins,
            builder: (context, state) => const _Placeholder('Buy Coins'),
          ),
          GoRoute(
            path: 'subscription',
            name: RouteNames.shopSubscription,
            builder: (context, state) =>
                const _Placeholder('Subscription'),
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
