import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../data/social_repository.dart';

// =============================================================================
// Social List State
// =============================================================================

enum SocialListStatus { initial, loading, loaded, error }

class SocialListState {
  final SocialListStatus status;
  final List<SocialUser> users;
  final bool hasMore;
  final int currentPage;
  final String? searchQuery;
  final String? errorMessage;

  const SocialListState({
    this.status = SocialListStatus.initial,
    this.users = const [],
    this.hasMore = true,
    this.currentPage = 0,
    this.searchQuery,
    this.errorMessage,
  });

  bool get isLoading => status == SocialListStatus.loading;

  SocialListState copyWith({
    SocialListStatus? status,
    List<SocialUser>? users,
    bool? hasMore,
    int? currentPage,
    String? searchQuery,
    String? errorMessage,
  }) {
    return SocialListState(
      status: status ?? this.status,
      users: users ?? this.users,
      hasMore: hasMore ?? this.hasMore,
      currentPage: currentPage ?? this.currentPage,
      searchQuery: searchQuery ?? this.searchQuery,
      errorMessage: errorMessage ?? this.errorMessage,
    );
  }
}

// =============================================================================
// Followers Notifier
// =============================================================================

class FollowersNotifier extends StateNotifier<SocialListState> {
  final SocialRepository _socialRepo;
  final String userId;

  FollowersNotifier({
    required SocialRepository socialRepo,
    required this.userId,
  })  : _socialRepo = socialRepo,
        super(const SocialListState());

  Future<void> load({String? search}) async {
    state = state.copyWith(
      status: SocialListStatus.loading,
      searchQuery: search,
    );
    try {
      final page = await _socialRepo.getFollowers(
        userId,
        page: 1,
        search: search,
      );
      state = state.copyWith(
        status: SocialListStatus.loaded,
        users: page.data,
        hasMore: page.hasNextPage,
        currentPage: 1,
      );
    } catch (e) {
      state = state.copyWith(
        status: SocialListStatus.error,
        errorMessage: e.toString(),
      );
    }
  }

  Future<void> loadMore() async {
    if (!state.hasMore || state.isLoading) return;
    try {
      final nextPage = state.currentPage + 1;
      final page = await _socialRepo.getFollowers(
        userId,
        page: nextPage,
        search: state.searchQuery,
      );
      state = state.copyWith(
        users: [...state.users, ...page.data],
        hasMore: page.hasNextPage,
        currentPage: nextPage,
      );
    } catch (_) {}
  }

  Future<void> toggleFollow(String targetUserId) async {
    final index = state.users.indexWhere((u) => u.id == targetUserId);
    if (index == -1) return;

    final user = state.users[index];
    final wasFollowing = user.isFollowing;

    // Optimistic update.
    final updated = List<SocialUser>.from(state.users);
    updated[index] = user.copyWith(isFollowing: !wasFollowing);
    state = state.copyWith(users: updated);

    try {
      if (wasFollowing) {
        await _socialRepo.unfollow(targetUserId);
      } else {
        await _socialRepo.follow(targetUserId);
      }
    } catch (_) {
      // Revert.
      final reverted = List<SocialUser>.from(state.users);
      reverted[index] = user.copyWith(isFollowing: wasFollowing);
      state = state.copyWith(users: reverted);
    }
  }
}

// =============================================================================
// Following Notifier
// =============================================================================

class FollowingNotifier extends StateNotifier<SocialListState> {
  final SocialRepository _socialRepo;
  final String userId;

  FollowingNotifier({
    required SocialRepository socialRepo,
    required this.userId,
  })  : _socialRepo = socialRepo,
        super(const SocialListState());

  Future<void> load({String? search}) async {
    state = state.copyWith(
      status: SocialListStatus.loading,
      searchQuery: search,
    );
    try {
      final page = await _socialRepo.getFollowing(
        userId,
        page: 1,
        search: search,
      );
      state = state.copyWith(
        status: SocialListStatus.loaded,
        users: page.data,
        hasMore: page.hasNextPage,
        currentPage: 1,
      );
    } catch (e) {
      state = state.copyWith(
        status: SocialListStatus.error,
        errorMessage: e.toString(),
      );
    }
  }

  Future<void> loadMore() async {
    if (!state.hasMore || state.isLoading) return;
    try {
      final nextPage = state.currentPage + 1;
      final page = await _socialRepo.getFollowing(
        userId,
        page: nextPage,
        search: state.searchQuery,
      );
      state = state.copyWith(
        users: [...state.users, ...page.data],
        hasMore: page.hasNextPage,
        currentPage: nextPage,
      );
    } catch (_) {}
  }

  Future<void> toggleFollow(String targetUserId) async {
    final index = state.users.indexWhere((u) => u.id == targetUserId);
    if (index == -1) return;

    final user = state.users[index];
    final wasFollowing = user.isFollowing;

    final updated = List<SocialUser>.from(state.users);
    updated[index] = user.copyWith(isFollowing: !wasFollowing);
    state = state.copyWith(users: updated);

    try {
      if (wasFollowing) {
        await _socialRepo.unfollow(targetUserId);
      } else {
        await _socialRepo.follow(targetUserId);
      }
    } catch (_) {
      final reverted = List<SocialUser>.from(state.users);
      reverted[index] = user.copyWith(isFollowing: wasFollowing);
      state = state.copyWith(users: reverted);
    }
  }
}

// =============================================================================
// Riverpod Providers
// =============================================================================

final followersProvider = StateNotifierProvider.family<FollowersNotifier,
    SocialListState, String>(
  (ref, userId) {
    return FollowersNotifier(
      socialRepo: ref.watch(socialRepositoryProvider),
      userId: userId,
    );
  },
);

final followingProvider = StateNotifierProvider.family<FollowingNotifier,
    SocialListState, String>(
  (ref, userId) {
    return FollowingNotifier(
      socialRepo: ref.watch(socialRepositoryProvider),
      userId: userId,
    );
  },
);
