import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../l10n/l10n.dart';
import '../providers/feed_provider.dart';
import 'video_feed_item.dart';

/// A full-screen vertical [PageView] that displays [VideoFeedItem]s in a
/// TikTok-style scrolling feed.
///
/// Handles pagination (loading more submissions when the user nears the end)
/// and passes `isActive` to each item so only the currently visible page
/// auto-plays.
class VideoFeedPage extends ConsumerStatefulWidget {
  const VideoFeedPage({super.key});

  @override
  ConsumerState<VideoFeedPage> createState() => _VideoFeedPageState();
}

class _VideoFeedPageState extends ConsumerState<VideoFeedPage> {
  final PageController _pageController = PageController();
  int _currentPage = 0;

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  void _onPageChanged(int index) {
    setState(() => _currentPage = index);

    // Trigger pagination when near the end.
    final feedState = ref.read(feedProvider);
    if (feedState.hasMore &&
        !feedState.isLoading &&
        index >= feedState.submissions.length - 3) {
      ref.read(feedProvider.notifier).loadMore();
    }
  }

  @override
  Widget build(BuildContext context) {
    final feedState = ref.watch(feedProvider);

    // Initial loading state.
    if (feedState.isLoading && feedState.submissions.isEmpty) {
      return const Center(
        child: CircularProgressIndicator(color: AppColors.primary),
      );
    }

    // Error state (with no cached data).
    if (feedState.status == FeedStatus.error &&
        feedState.submissions.isEmpty) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.error_outline, size: 48, color: AppColors.error),
            const SizedBox(height: 16),
            Text(
              context.l10n.failedToLoadFeed,
              style: AppTextStyles.heading4.copyWith(color: AppColors.white),
            ),
            const SizedBox(height: 8),
            TextButton(
              onPressed: () => ref.read(feedProvider.notifier).loadFeed(),
              child: Text(
                context.l10n.retry,
                style: const TextStyle(color: AppColors.primary),
              ),
            ),
          ],
        ),
      );
    }

    // Empty state.
    if (feedState.submissions.isEmpty) {
      return Center(
        child: Text(
          context.l10n.noMoreEntries,
          style: AppTextStyles.bodyLarge.copyWith(color: AppColors.white),
        ),
      );
    }

    return PageView.builder(
      controller: _pageController,
      scrollDirection: Axis.vertical,
      itemCount: feedState.submissions.length,
      onPageChanged: _onPageChanged,
      itemBuilder: (context, index) {
        final submission = feedState.submissions[index];
        return VideoFeedItem(
          key: ValueKey(submission.id),
          submission: submission,
          isActive: index == _currentPage,
        );
      },
    );
  }
}
