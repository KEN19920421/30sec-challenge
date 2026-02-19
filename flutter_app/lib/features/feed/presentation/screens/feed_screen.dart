import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/theme/app_colors.dart';
import '../providers/feed_provider.dart';
import '../widgets/video_feed_page.dart';

/// The main Discover / Feed screen — TikTok-style full-screen video feed
/// with floating category chips at the top.
class FeedScreen extends ConsumerStatefulWidget {
  const FeedScreen({super.key});

  @override
  ConsumerState<FeedScreen> createState() => _FeedScreenState();
}

class _FeedScreenState extends ConsumerState<FeedScreen> {
  @override
  void initState() {
    super.initState();
    Future.microtask(() => ref.read(feedProvider.notifier).loadFeed());
  }

  @override
  Widget build(BuildContext context) {
    final feedState = ref.watch(feedProvider);
    final categories = ref.watch(feedCategoriesProvider);

    return Scaffold(
      extendBodyBehindAppBar: true,
      body: Stack(
        children: [
          // Full-screen video feed
          const VideoFeedPage(),

          // Category chips overlay at top
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.only(top: 8),
              child: SizedBox(
                height: 40,
                child: ListView.separated(
                  scrollDirection: Axis.horizontal,
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  itemCount: categories.length,
                  separatorBuilder: (_, __) => const SizedBox(width: 8),
                  itemBuilder: (context, index) {
                    final cat = categories[index];
                    final isSelected = feedState.selectedCategory == cat ||
                        (feedState.selectedCategory == null && cat == 'All');
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
                      backgroundColor: AppColors.black.withValues(alpha: 0.3),
                      selectedColor: AppColors.primary.withValues(alpha: 0.8),
                      side: BorderSide.none,
                      onSelected: (_) {
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
