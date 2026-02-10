import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_mobile_ads/google_mobile_ads.dart';

import '../../../../core/constants/ad_constants.dart';
import '../../../../core/router/route_names.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../l10n/l10n.dart';
import '../../../challenge/domain/submission.dart';
import '../../../shop/presentation/providers/shop_provider.dart';
import '../providers/feed_provider.dart';
import '../widgets/submission_card.dart';
import '../widgets/trending_section.dart';

/// The main Discover / Feed screen.
class FeedScreen extends ConsumerStatefulWidget {
  const FeedScreen({super.key});

  @override
  ConsumerState<FeedScreen> createState() => _FeedScreenState();
}

class _FeedScreenState extends ConsumerState<FeedScreen> {
  final _searchController = TextEditingController();
  bool _showSearch = false;

  @override
  void initState() {
    super.initState();
    Future.microtask(() => ref.read(feedProvider.notifier).loadFeed());
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final feedState = ref.watch(feedProvider);
    final categories = ref.watch(feedCategoriesProvider);
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      appBar: AppBar(
        title: _showSearch
            ? TextField(
                controller: _searchController,
                autofocus: true,
                decoration: InputDecoration(
                  hintText: context.l10n.searchSubmissions,
                  border: InputBorder.none,
                  filled: false,
                ),
                onSubmitted: (query) {
                  ref.read(feedProvider.notifier).search(query);
                },
              )
            : Text(context.l10n.discover),
        actions: [
          IconButton(
            icon: Icon(_showSearch ? Icons.close : Icons.search),
            onPressed: () {
              setState(() {
                _showSearch = !_showSearch;
                if (!_showSearch) {
                  _searchController.clear();
                  ref.read(feedProvider.notifier).search(null);
                }
              });
            },
          ),
        ],
      ),
      body: _buildBody(feedState, categories, isDark),
    );
  }

  Widget _buildBody(
      FeedState feedState, List<String> categories, bool isDark) {
    if (feedState.isLoading &&
        feedState.submissions.isEmpty &&
        feedState.trending.isEmpty) {
      return const Center(
        child: CircularProgressIndicator(color: AppColors.primary),
      );
    }

    if (feedState.status == FeedStatus.error &&
        feedState.submissions.isEmpty) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.error_outline, size: 48, color: AppColors.error),
            const SizedBox(height: 16),
            Text(context.l10n.failedToLoadFeed, style: AppTextStyles.heading4),
            const SizedBox(height: 8),
            TextButton(
              onPressed: () => ref.read(feedProvider.notifier).loadFeed(),
              child: Text(context.l10n.retry),
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      color: AppColors.primary,
      onRefresh: () => ref.read(feedProvider.notifier).loadFeed(),
      child: NotificationListener<ScrollNotification>(
        onNotification: (notification) {
          if (notification is ScrollEndNotification &&
              notification.metrics.extentAfter < 300 &&
              feedState.hasMore &&
              !feedState.isLoading) {
            ref.read(feedProvider.notifier).loadMore();
          }
          return false;
        },
        child: CustomScrollView(
          slivers: [
            // Category filter chips
            SliverToBoxAdapter(
              child: SizedBox(
                height: 48,
                child: ListView.separated(
                  scrollDirection: Axis.horizontal,
                  padding: const EdgeInsets.symmetric(
                      horizontal: 16, vertical: 8),
                  itemCount: categories.length,
                  separatorBuilder: (_, __) => const SizedBox(width: 8),
                  itemBuilder: (context, index) {
                    final cat = categories[index];
                    final isSelected =
                        feedState.selectedCategory == cat ||
                            (feedState.selectedCategory == null &&
                                cat == 'All');
                    return ChoiceChip(
                      label: Text(cat),
                      selected: isSelected,
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

            // Trending section
            if (feedState.trending.isNotEmpty)
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.only(top: 8, bottom: 16),
                  child: TrendingSection(
                    submissions: feedState.trending,
                    onSubmissionTap: _onSubmissionTap,
                  ),
                ),
              ),

            // Section header
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 4),
                child: Text('Recent', style: AppTextStyles.heading4),
              ),
            ),

            // Feed list with ad injection
            SliverList(
              delegate: SliverChildBuilderDelegate(
                (context, index) {
                  // Inject native ad every 10 entries (for free users)
                  final subscriptionState = ref.read(subscriptionProvider);
                  final isFreeUser = !subscriptionState.isPro;

                  if (isFreeUser && index > 0 && index % 11 == 10) {
                    return const _NativeAdCard();
                  }

                  // Calculate the actual submission index
                  int submissionIndex;
                  if (isFreeUser) {
                    final adsBefore = index ~/ 11;
                    submissionIndex = index - adsBefore;
                  } else {
                    submissionIndex = index;
                  }

                  if (submissionIndex >= feedState.submissions.length) {
                    if (feedState.hasMore) {
                      return const Padding(
                        padding: EdgeInsets.all(16),
                        child: Center(
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: AppColors.primary,
                          ),
                        ),
                      );
                    }
                    return null;
                  }

                  return SubmissionCard(
                    submission: feedState.submissions[submissionIndex],
                    onTap: () => _onSubmissionTap(
                        feedState.submissions[submissionIndex]),
                    onUserTap: () {
                      context.pushNamed(
                        RouteNames.userProfile,
                        pathParameters: {
                          'userId':
                              feedState.submissions[submissionIndex].userId,
                        },
                      );
                    },
                    onGiftTap: () {
                      context.pushNamed(RouteNames.shop);
                    },
                  );
                },
                childCount: _calculateChildCount(feedState),
              ),
            ),

            // Bottom padding
            const SliverToBoxAdapter(
              child: SizedBox(height: 32),
            ),
          ],
        ),
      ),
    );
  }

  int _calculateChildCount(FeedState feedState) {
    final subscriptionState = ref.read(subscriptionProvider);
    final isFreeUser = !subscriptionState.isPro;

    if (feedState.submissions.isEmpty) return 0;

    final count = feedState.submissions.length;
    if (isFreeUser) {
      // Add ad slots
      return count + (count ~/ 10);
    }
    return count + (feedState.hasMore ? 1 : 0);
  }

  void _onSubmissionTap(Submission submission) {
    context.pushNamed(
      RouteNames.challengeDetail,
      pathParameters: {'id': submission.challengeId},
    );
  }
}

// =============================================================================
// Native Ad Card
// =============================================================================

class _NativeAdCard extends StatefulWidget {
  const _NativeAdCard();

  @override
  State<_NativeAdCard> createState() => _NativeAdCardState();
}

class _NativeAdCardState extends State<_NativeAdCard> {
  NativeAd? _nativeAd;
  bool _isLoaded = false;

  @override
  void initState() {
    super.initState();
    _loadAd();
  }

  void _loadAd() {
    _nativeAd = NativeAd(
      adUnitId: _adUnitId,
      listener: NativeAdListener(
        onAdLoaded: (ad) {
          if (mounted) {
            setState(() => _isLoaded = true);
          }
        },
        onAdFailedToLoad: (ad, error) {
          ad.dispose();
          if (mounted) {
            setState(() => _nativeAd = null);
          }
        },
      ),
      request: const AdRequest(),
      nativeTemplateStyle: NativeTemplateStyle(
        templateType: TemplateType.medium,
        mainBackgroundColor:
            Theme.of(context).brightness == Brightness.dark
                ? AppColors.darkSurface
                : AppColors.lightSurface,
        cornerRadius: 16,
      ),
    )..load();
  }

  @override
  void dispose() {
    _nativeAd?.dispose();
    super.dispose();
  }

  static String get _adUnitId => AdConstants.nativeId;

  @override
  Widget build(BuildContext context) {
    if (!_isLoaded || _nativeAd == null) {
      return const SizedBox(height: 0);
    }

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
      child: Stack(
        children: [
          ConstrainedBox(
            constraints: const BoxConstraints(
              minWidth: 320,
              minHeight: 90,
              maxHeight: 320,
            ),
            child: AdWidget(ad: _nativeAd!),
          ),
          // "Ad" label
          Positioned(
            top: 4,
            right: 4,
            child: Container(
              padding:
                  const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
              decoration: BoxDecoration(
                color: Colors.black45,
                borderRadius: BorderRadius.circular(4),
              ),
              child: const Text(
                'Ad',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 10,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
