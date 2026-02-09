import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../auth/presentation/providers/auth_provider.dart';
import '../../../challenge/domain/submission.dart';
import '../../../social/data/social_repository.dart';
import '../../data/profile_repository.dart';
import '../../domain/user_profile.dart';

// =============================================================================
// Profile State
// =============================================================================

enum ProfileStatus { initial, loading, loaded, error }

class ProfileState {
  final ProfileStatus status;
  final UserProfile? profile;
  final List<Submission> submissions;
  final bool hasMoreSubmissions;
  final int submissionPage;
  final String? errorMessage;

  const ProfileState({
    this.status = ProfileStatus.initial,
    this.profile,
    this.submissions = const [],
    this.hasMoreSubmissions = true,
    this.submissionPage = 1,
    this.errorMessage,
  });

  bool get isLoading => status == ProfileStatus.loading;
  bool get isLoaded => status == ProfileStatus.loaded;

  ProfileState copyWith({
    ProfileStatus? status,
    UserProfile? profile,
    List<Submission>? submissions,
    bool? hasMoreSubmissions,
    int? submissionPage,
    String? errorMessage,
  }) {
    return ProfileState(
      status: status ?? this.status,
      profile: profile ?? this.profile,
      submissions: submissions ?? this.submissions,
      hasMoreSubmissions: hasMoreSubmissions ?? this.hasMoreSubmissions,
      submissionPage: submissionPage ?? this.submissionPage,
      errorMessage: errorMessage ?? this.errorMessage,
    );
  }
}

// =============================================================================
// Profile Notifier
// =============================================================================

class ProfileNotifier extends StateNotifier<ProfileState> {
  final ProfileRepository _profileRepo;
  final SocialRepository _socialRepo;
  final String userId;

  ProfileNotifier({
    required ProfileRepository profileRepo,
    required SocialRepository socialRepo,
    required this.userId,
  })  : _profileRepo = profileRepo,
        _socialRepo = socialRepo,
        super(const ProfileState()) {
    loadProfile();
  }

  /// Loads the user profile and the first page of submissions.
  Future<void> loadProfile() async {
    state = state.copyWith(status: ProfileStatus.loading);
    try {
      final profile = await _profileRepo.getProfile(userId);
      final submissionPage = await _profileRepo.getUserSubmissions(userId);
      state = state.copyWith(
        status: ProfileStatus.loaded,
        profile: profile,
        submissions: submissionPage.data,
        hasMoreSubmissions: submissionPage.hasNextPage,
        submissionPage: 1,
      );
    } catch (e) {
      state = state.copyWith(
        status: ProfileStatus.error,
        errorMessage: e.toString(),
      );
    }
  }

  /// Loads the next page of submissions.
  Future<void> loadMoreSubmissions() async {
    if (!state.hasMoreSubmissions) return;

    try {
      final nextPage = state.submissionPage + 1;
      final page = await _profileRepo.getUserSubmissions(
        userId,
        page: nextPage,
      );
      state = state.copyWith(
        submissions: [...state.submissions, ...page.data],
        hasMoreSubmissions: page.hasNextPage,
        submissionPage: nextPage,
      );
    } catch (_) {
      // Silently fail on pagination errors; user can retry.
    }
  }

  /// Updates the profile fields for the authenticated user.
  Future<bool> updateProfile({
    String? displayName,
    String? username,
    String? bio,
  }) async {
    try {
      final updated = await _profileRepo.updateProfile(
        displayName: displayName,
        username: username,
        bio: bio,
      );
      state = state.copyWith(profile: updated);
      return true;
    } catch (_) {
      return false;
    }
  }

  /// Uploads a new avatar.
  Future<bool> updateAvatar(String filePath) async {
    try {
      final avatarUrl = await _profileRepo.uploadAvatar(filePath);
      if (state.profile != null) {
        state = state.copyWith(
          profile: state.profile!.copyWith(avatarUrl: avatarUrl),
        );
      }
      return true;
    } catch (_) {
      return false;
    }
  }

  /// Toggles the follow state for this profile.
  Future<void> toggleFollow() async {
    final profile = state.profile;
    if (profile == null) return;

    final wasFollowing = profile.isFollowing;

    // Optimistic update.
    state = state.copyWith(
      profile: profile.copyWith(
        isFollowing: !wasFollowing,
        followerCount:
            profile.followerCount + (wasFollowing ? -1 : 1),
      ),
    );

    try {
      if (wasFollowing) {
        await _socialRepo.unfollow(profile.id);
      } else {
        await _socialRepo.follow(profile.id);
      }
    } catch (_) {
      // Revert on error.
      state = state.copyWith(
        profile: profile.copyWith(
          isFollowing: wasFollowing,
          followerCount: profile.followerCount,
        ),
      );
    }
  }
}

// =============================================================================
// Riverpod Providers
// =============================================================================

/// Provider for any user's profile, keyed by userId.
final profileProvider =
    StateNotifierProvider.family<ProfileNotifier, ProfileState, String>(
  (ref, userId) {
    return ProfileNotifier(
      profileRepo: ref.watch(profileRepositoryProvider),
      socialRepo: ref.watch(socialRepositoryProvider),
      userId: userId,
    );
  },
);

/// Provider for the authenticated user's own profile.
final myProfileProvider =
    StateNotifierProvider<ProfileNotifier, ProfileState>((ref) {
  final currentUser = ref.watch(currentUserProvider);
  final userId = currentUser?.id ?? '';
  return ProfileNotifier(
    profileRepo: ref.watch(profileRepositoryProvider),
    socialRepo: ref.watch(socialRepositoryProvider),
    userId: userId,
  );
});
