import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../l10n/l10n.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../providers/challenge_provider.dart';
import '../widgets/challenge_card.dart';

/// Grid/list of past challenges with infinite scroll pagination and
/// category filtering.
///
/// Each card shows thumbnail, title, category, date, and a winner preview.
class ChallengeHistoryScreen extends ConsumerStatefulWidget {
  const ChallengeHistoryScreen({super.key});

  @override
  ConsumerState<ChallengeHistoryScreen> createState() =>
      _ChallengeHistoryScreenState();
}

class _ChallengeHistoryScreenState
    extends ConsumerState<ChallengeHistoryScreen> {
  final ScrollController _scrollController = ScrollController();

  static const _categories = [
    'All',
    'Dance',
    'Comedy',
    'Talent',
    'Fitness',
    'Cooking',
    'Art',
    'Music',
    'Lifestyle',
  ];

  @override
  void initState() {
    super.initState();
    _scrollController.addListener(_onScroll);

    // Schedule the initial load after the first frame.
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(challengeHistoryProvider.notifier).loadInitial();
    });
  }

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  void _onScroll() {
    if (_scrollController.position.pixels >=
        _scrollController.position.maxScrollExtent - 300) {
      ref.read(challengeHistoryProvider.notifier).loadMore();
    }
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(challengeHistoryProvider);
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: Text(
          context.l10n.challengeHistory,
          style: AppTextStyles.heading3.copyWith(
            color: theme.colorScheme.onSurface,
          ),
        ),
        backgroundColor: theme.scaffoldBackgroundColor,
        surfaceTintColor: Colors.transparent,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded),
          onPressed: () => context.pop(),
        ),
      ),
      body: Column(
        children: [
          // Category filter chips.
          _CategoryFilter(
            categories: _categories,
            selected: state.selectedCategory,
            onSelected: (category) {
              ref.read(challengeHistoryProvider.notifier).setCategory(
                    category == 'All' ? null : category,
                  );
            },
          ),

          // Content.
          Expanded(
            child: state.challenges.isEmpty && state.isLoading
                ? const Center(
                    child:
                        CircularProgressIndicator(color: AppColors.primary),
                  )
                : state.challenges.isEmpty && state.errorMessage != null
                    ? _ErrorView(
                        message: state.errorMessage!,
                        onRetry: () => ref
                            .read(challengeHistoryProvider.notifier)
                            .loadInitial(),
                      )
                    : state.challenges.isEmpty
                        ? _EmptyView()
                        : RefreshIndicator(
                            color: AppColors.primary,
                            onRefresh: () => ref
                                .read(challengeHistoryProvider.notifier)
                                .loadInitial(),
                            child: ListView.builder(
                              controller: _scrollController,
                              padding: const EdgeInsets.fromLTRB(
                                  20, 8, 20, 40),
                              itemCount: state.challenges.length +
                                  (state.hasMore ? 1 : 0),
                              itemBuilder: (context, index) {
                                if (index >= state.challenges.length) {
                                  return const Padding(
                                    padding: EdgeInsets.all(16),
                                    child: Center(
                                      child: CircularProgressIndicator(
                                        color: AppColors.primary,
                                        strokeWidth: 2,
                                      ),
                                    ),
                                  );
                                }

                                final challenge = state.challenges[index];
                                return Padding(
                                  padding: const EdgeInsets.only(bottom: 12),
                                  child: ChallengeCard(
                                    challenge: challenge,
                                    onTap: () => context.push(
                                      '/challenges/${challenge.id}',
                                    ),
                                  ),
                                );
                              },
                            ),
                          ),
          ),
        ],
      ),
    );
  }
}

// =============================================================================
// Category filter
// =============================================================================

class _CategoryFilter extends StatelessWidget {
  final List<String> categories;
  final String? selected;
  final ValueChanged<String> onSelected;

  const _CategoryFilter({
    required this.categories,
    required this.selected,
    required this.onSelected,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return SizedBox(
      height: 48,
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16),
        itemCount: categories.length,
        itemBuilder: (context, index) {
          final cat = categories[index];
          final isSelected =
              (selected == null && cat == 'All') || selected == cat;

          return Padding(
            padding: const EdgeInsets.only(right: 8),
            child: FilterChip(
              label: Text(cat),
              selected: isSelected,
              onSelected: (_) => onSelected(cat),
              labelStyle: AppTextStyles.chipLabel.copyWith(
                color: isSelected
                    ? AppColors.white
                    : theme.colorScheme.onSurface,
              ),
              backgroundColor:
                  theme.colorScheme.surfaceContainerHighest,
              selectedColor: AppColors.primary,
              checkmarkColor: AppColors.white,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(20),
              ),
              side: BorderSide.none,
              padding:
                  const EdgeInsets.symmetric(horizontal: 4, vertical: 0),
              showCheckmark: false,
            ),
          );
        },
      ),
    );
  }
}

// =============================================================================
// Empty / Error views
// =============================================================================

class _EmptyView extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.history_rounded,
              size: 64,
              color: AppColors.primary.withValues(alpha: 0.4),
            ),
            const SizedBox(height: 16),
            Text(context.l10n.noPastChallenges, style: AppTextStyles.heading3),
            const SizedBox(height: 8),
            Text(
              'Completed challenges will appear here.',
              style: AppTextStyles.bodyMedium.copyWith(
                color: Theme.of(context)
                    .colorScheme
                    .onSurface
                    .withValues(alpha: 0.6),
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}

class _ErrorView extends StatelessWidget {
  final String message;
  final VoidCallback onRetry;

  const _ErrorView({required this.message, required this.onRetry});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.error_outline_rounded,
              size: 64,
              color: AppColors.error.withValues(alpha: 0.5),
            ),
            const SizedBox(height: 16),
            Text(context.l10n.somethingWentWrong, style: AppTextStyles.heading3),
            const SizedBox(height: 8),
            Text(
              message,
              style: AppTextStyles.bodyMedium,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 24),
            ElevatedButton.icon(
              onPressed: onRetry,
              icon: const Icon(Icons.refresh),
              label: const Text('Retry'),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                foregroundColor: AppColors.white,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
