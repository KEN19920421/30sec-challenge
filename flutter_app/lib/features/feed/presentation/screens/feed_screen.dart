import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../core/widgets/error_state_widget.dart';
import '../../../../l10n/l10n.dart';
import '../providers/discover_provider.dart';
import '../providers/feed_provider.dart';
import '../widgets/video_feed_page.dart';

// =============================================================================
// FeedScreen — Watch / Explore tab layout
// =============================================================================

/// The main feed screen with two tabs:
/// - **Watch** — algorithmically curated discover feed (full-screen cards).
/// - **Explore** — category-filtered "For You" video feed (existing behaviour).
class FeedScreen extends ConsumerStatefulWidget {
  const FeedScreen({super.key});

  @override
  ConsumerState<FeedScreen> createState() => _FeedScreenState();
}

class _FeedScreenState extends ConsumerState<FeedScreen>
    with SingleTickerProviderStateMixin {
  late final TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _tabController.addListener(_onTabChanged);
    // Load the Explore feed immediately (default tab).
    Future.microtask(() => ref.read(feedProvider.notifier).loadFeed());
  }

  @override
  void dispose() {
    _tabController
      ..removeListener(_onTabChanged)
      ..dispose();
    super.dispose();
  }

  void _onTabChanged() {
    if (_tabController.indexIsChanging) return;
    // Lazy-load each tab's data on first visit.
    if (_tabController.index == 0) {
      final discoverState = ref.read(discoverProvider);
      if (discoverState.status == DiscoverStatus.initial) {
        ref.read(discoverProvider.notifier).loadDiscover();
      }
    } else {
      final feedState = ref.read(feedProvider);
      if (feedState.status == FeedStatus.initial) {
        ref.read(feedProvider.notifier).loadFeed();
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Build
  // ---------------------------------------------------------------------------

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      extendBodyBehindAppBar: true,
      body: Stack(
        children: [
          // Tab content fills the entire screen.
          TabBarView(
            controller: _tabController,
            children: const [
              _WatchTab(),
              _ExploreTab(),
            ],
          ),

          // Floating tab bar anchored at the top of the safe area.
          SafeArea(
            child: Align(
              alignment: Alignment.topCenter,
              child: _FeedTabBar(controller: _tabController),
            ),
          ),
        ],
      ),
    );
  }
}

// =============================================================================
// _FeedTabBar
// =============================================================================

class _FeedTabBar extends StatelessWidget {
  const _FeedTabBar({required this.controller});

  final TabController controller;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(top: 8),
      padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 4),
      decoration: BoxDecoration(
        color: AppColors.black.withValues(alpha: 0.45),
        borderRadius: BorderRadius.circular(24),
      ),
      child: TabBar(
        controller: controller,
        isScrollable: false,
        indicator: BoxDecoration(
          color: AppColors.primary,
          borderRadius: BorderRadius.circular(20),
        ),
        indicatorSize: TabBarIndicatorSize.tab,
        dividerColor: Colors.transparent,
        labelStyle: AppTextStyles.label.copyWith(
          fontWeight: FontWeight.w700,
          fontSize: 14,
        ),
        unselectedLabelStyle: AppTextStyles.label.copyWith(
          fontWeight: FontWeight.w500,
          fontSize: 14,
        ),
        labelColor: AppColors.white,
        unselectedLabelColor: AppColors.white.withValues(alpha: 0.75),
        tabs: const [
          Tab(text: 'Watch'),
          Tab(text: 'Explore'),
        ],
      ),
    );
  }
}

// =============================================================================
// _WatchTab — Discover full-screen card feed
// =============================================================================

class _WatchTab extends ConsumerStatefulWidget {
  const _WatchTab();

  @override
  ConsumerState<_WatchTab> createState() => _WatchTabState();
}

class _WatchTabState extends ConsumerState<_WatchTab> {
  final PageController _pageController = PageController();
  int _currentPage = 0;

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  void _onPageChanged(int index) {
    setState(() => _currentPage = index);
    final discoverState = ref.read(discoverProvider);
    if (discoverState.hasMore &&
        !discoverState.isLoading &&
        index >= discoverState.submissions.length - 3) {
      ref.read(discoverProvider.notifier).loadMore();
    }
  }

  Future<void> _onRefresh() async {
    await ref.read(discoverProvider.notifier).loadDiscover();
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(discoverProvider);

    if (state.isLoading && state.submissions.isEmpty) {
      return const Center(
        child: CircularProgressIndicator(color: AppColors.primary),
      );
    }

    if (state.status == DiscoverStatus.error && state.submissions.isEmpty) {
      return SafeArea(
        child: ErrorStateWidget(
          title: context.l10n.failedToLoadFeed,
          message: state.errorMessage,
          retryLabel: context.l10n.retry,
          onRetry: () => ref.read(discoverProvider.notifier).loadDiscover(),
        ),
      );
    }

    if (state.submissions.isEmpty) {
      return Center(
        child: Text(
          'No videos yet',
          style: AppTextStyles.bodyLarge.copyWith(color: AppColors.white),
        ),
      );
    }

    return RefreshIndicator(
      color: AppColors.primary,
      displacement: 80,
      onRefresh: _onRefresh,
      child: PageView.builder(
        controller: _pageController,
        scrollDirection: Axis.vertical,
        itemCount: state.submissions.length,
        onPageChanged: _onPageChanged,
        itemBuilder: (context, index) {
          final submission = state.submissions[index];
          return _DiscoverCard(
            key: ValueKey(submission.id),
            submission: submission,
            isActive: index == _currentPage,
          );
        },
      ),
    );
  }
}

// =============================================================================
// _DiscoverCard — Full-screen card for a single discover submission
// =============================================================================

class _DiscoverCard extends StatelessWidget {
  const _DiscoverCard({
    super.key,
    required this.submission,
    required this.isActive,
  });

  final dynamic submission; // Submission
  final bool isActive;

  @override
  Widget build(BuildContext context) {
    final thumbUrl = submission.thumbnailUrl as String?;
    final displayName = submission.displayNameOrUsername as String;
    final caption = submission.caption as String?;
    final voteCount = submission.voteCount as int;
    final viewCount = submission.totalViews as int;

    return Stack(
      fit: StackFit.expand,
      children: [
        // -------------------------------------------------------
        // Background: thumbnail or solid colour fallback
        // -------------------------------------------------------
        if (thumbUrl != null && thumbUrl.isNotEmpty)
          CachedNetworkImage(
            imageUrl: thumbUrl,
            fit: BoxFit.cover,
            placeholder: (_, __) => const ColoredBox(
              color: AppColors.darkBackground,
            ),
            errorWidget: (_, __, ___) => const _ThumbPlaceholder(),
          )
        else
          const _ThumbPlaceholder(),

        // -------------------------------------------------------
        // Dark gradient at the bottom for text legibility
        // -------------------------------------------------------
        const DecoratedBox(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
              stops: [0.45, 1.0],
              colors: [Colors.transparent, Color(0xCC000000)],
            ),
          ),
        ),

        // -------------------------------------------------------
        // Play icon overlay (centre)
        // -------------------------------------------------------
        Center(
          child: Container(
            width: 64,
            height: 64,
            decoration: BoxDecoration(
              color: AppColors.black.withValues(alpha: 0.45),
              shape: BoxShape.circle,
            ),
            child: const Icon(
              Icons.play_arrow_rounded,
              color: AppColors.white,
              size: 40,
            ),
          ),
        ),

        // -------------------------------------------------------
        // Bottom metadata overlay
        // -------------------------------------------------------
        Positioned(
          left: 16,
          right: 72,
          bottom: 32,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              // Username
              Row(
                children: [
                  const Icon(
                    Icons.person_rounded,
                    color: AppColors.white,
                    size: 16,
                  ),
                  const SizedBox(width: 4),
                  Text(
                    '@$displayName',
                    style: AppTextStyles.bodyMediumBold.copyWith(
                      color: AppColors.white,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ],
              ),
              if (caption != null && caption.isNotEmpty) ...[
                const SizedBox(height: 6),
                Text(
                  caption,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: AppTextStyles.bodyMedium.copyWith(
                    color: AppColors.white.withValues(alpha: 0.9),
                  ),
                ),
              ],
              const SizedBox(height: 8),
              // Stats row
              Row(
                children: [
                  _StatBadge(
                    icon: Icons.favorite_rounded,
                    value: _formatCount(voteCount),
                  ),
                  const SizedBox(width: 12),
                  _StatBadge(
                    icon: Icons.visibility_rounded,
                    value: _formatCount(viewCount),
                  ),
                ],
              ),
            ],
          ),
        ),
      ],
    );
  }

  String _formatCount(int count) {
    if (count >= 1000000) {
      return '${(count / 1000000).toStringAsFixed(1)}M';
    }
    if (count >= 1000) {
      return '${(count / 1000).toStringAsFixed(1)}K';
    }
    return count.toString();
  }
}

// =============================================================================
// _ThumbPlaceholder
// =============================================================================

class _ThumbPlaceholder extends StatelessWidget {
  const _ThumbPlaceholder();

  @override
  Widget build(BuildContext context) {
    return const ColoredBox(
      color: AppColors.darkSurface,
      child: Center(
        child: Icon(
          Icons.videocam_off_rounded,
          color: AppColors.darkOnSurfaceVariant,
          size: 48,
        ),
      ),
    );
  }
}

// =============================================================================
// _StatBadge
// =============================================================================

class _StatBadge extends StatelessWidget {
  const _StatBadge({required this.icon, required this.value});

  final IconData icon;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, color: AppColors.white.withValues(alpha: 0.9), size: 14),
        const SizedBox(width: 4),
        Text(
          value,
          style: AppTextStyles.caption.copyWith(
            color: AppColors.white.withValues(alpha: 0.9),
          ),
        ),
      ],
    );
  }
}

// =============================================================================
// _ExploreTab — existing category-filtered feed (unchanged behaviour)
// =============================================================================

class _ExploreTab extends ConsumerWidget {
  const _ExploreTab();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final feedState = ref.watch(feedProvider);
    final categories = ref.watch(feedCategoriesProvider);

    // Full-screen error when there is no cached data to show.
    if (feedState.status == FeedStatus.error &&
        feedState.submissions.isEmpty) {
      return SafeArea(
        child: ErrorStateWidget(
          title: context.l10n.failedToLoadFeed,
          message: feedState.errorMessage,
          retryLabel: context.l10n.retry,
          onRetry: () => ref.read(feedProvider.notifier).loadFeed(),
        ),
      );
    }

    return RefreshIndicator(
      color: AppColors.primary,
      displacement: 80,
      onRefresh: () => ref.read(feedProvider.notifier).loadFeed(),
      child: Stack(
        children: [
          // Full-screen video feed (takes up the whole body).
          const VideoFeedPage(),

          // Category chips overlaid at the top (below the shared tab bar).
          SafeArea(
            child: Padding(
              // Push chips below the tab bar (~48 px height).
              padding: const EdgeInsets.only(top: 56),
              child: SizedBox(
                height: 40,
                child: ListView.separated(
                  scrollDirection: Axis.horizontal,
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  itemCount: categories.length,
                  separatorBuilder: (_, __) => const SizedBox(width: 8),
                  itemBuilder: (context, index) {
                    final cat = categories[index];
                    final isSelected =
                        feedState.selectedCategory == cat ||
                            (feedState.selectedCategory == null &&
                                cat == 'All');
                    return ChoiceChip(
                      label: Text(
                        cat,
                        style: TextStyle(
                          color: isSelected
                              ? AppColors.white
                              : AppColors.white.withValues(alpha: 0.8),
                          fontSize: 13,
                        ),
                      ),
                      selected: isSelected,
                      backgroundColor:
                          AppColors.black.withValues(alpha: 0.3),
                      selectedColor:
                          AppColors.primary.withValues(alpha: 0.8),
                      side: BorderSide.none,
                      onSelected: (_) {
                        HapticFeedback.selectionClick();
                        ref.read(feedProvider.notifier).setCategory(
                              cat == 'All' ? null : cat,
                            );
                      },
                    );
                  },
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
