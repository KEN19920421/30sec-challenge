import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/router/route_names.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../providers/shop_provider.dart';

/// Compact badge showing the user's current Sparks (coin) balance.
///
/// Tapping navigates to the coin store. Can be placed in app bars, profile
/// headers, or any other location.
class CoinBalanceBadge extends ConsumerStatefulWidget {
  /// Optional fixed size override.
  final double? height;

  /// Whether to show the "+" icon for quick navigation.
  final bool showAddIcon;

  const CoinBalanceBadge({
    super.key,
    this.height,
    this.showAddIcon = true,
  });

  @override
  ConsumerState<CoinBalanceBadge> createState() => _CoinBalanceBadgeState();
}

class _CoinBalanceBadgeState extends ConsumerState<CoinBalanceBadge> {
  @override
  void initState() {
    super.initState();
    // Ensure balance is loaded.
    Future.microtask(() {
      final state = ref.read(coinProvider);
      if (state.status == CoinStatus.initial) {
        ref.read(coinProvider.notifier).load();
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final coinState = ref.watch(coinProvider);
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return GestureDetector(
      onTap: () => context.pushNamed(RouteNames.shopCoins),
      child: Container(
        height: widget.height ?? 32,
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
        decoration: BoxDecoration(
          color: isDark
              ? AppColors.darkSurfaceVariant
              : AppColors.lightSurfaceVariant,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: AppColors.accent.withValues(alpha: 0.3),
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(
              Icons.auto_awesome,
              color: AppColors.accent,
              size: 16,
            ),
            const SizedBox(width: 4),
            Text(
              _formatBalance(coinState.balance),
              style: AppTextStyles.bodySmallBold.copyWith(
                color: AppColors.accent,
              ),
            ),
            if (widget.showAddIcon) ...[
              const SizedBox(width: 4),
              Container(
                width: 16,
                height: 16,
                decoration: BoxDecoration(
                  color: AppColors.accent.withValues(alpha: 0.2),
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.add,
                  size: 12,
                  color: AppColors.accent,
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  String _formatBalance(int balance) {
    if (balance >= 1000000) {
      return '${(balance / 1000000).toStringAsFixed(1)}M';
    }
    if (balance >= 10000) {
      return '${(balance / 1000).toStringAsFixed(1)}K';
    }
    return balance.toString();
  }
}

/// A larger variant of the coin balance badge for use in headers and cards.
class CoinBalanceLarge extends ConsumerWidget {
  const CoinBalanceLarge({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final coinState = ref.watch(coinProvider);

    return GestureDetector(
      onTap: () => context.pushNamed(RouteNames.shopCoins),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        decoration: BoxDecoration(
          gradient: const LinearGradient(
            colors: [Color(0xFFFFD166), Color(0xFFFFA500)],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
          borderRadius: BorderRadius.circular(12),
          boxShadow: [
            BoxShadow(
              color: AppColors.accent.withValues(alpha: 0.3),
              blurRadius: 8,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.auto_awesome, color: Colors.white, size: 24),
            const SizedBox(width: 8),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  '${coinState.balance}',
                  style: AppTextStyles.heading3.copyWith(
                    color: Colors.white,
                  ),
                ),
                Text(
                  'Sparks',
                  style: AppTextStyles.caption.copyWith(
                    color: Colors.white.withValues(alpha: 0.85),
                  ),
                ),
              ],
            ),
            const SizedBox(width: 12),
            Container(
              width: 28,
              height: 28,
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.2),
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.add,
                color: Colors.white,
                size: 18,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
