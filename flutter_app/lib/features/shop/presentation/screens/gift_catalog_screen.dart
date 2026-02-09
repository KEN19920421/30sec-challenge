import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/router/route_names.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../core/utils/extensions.dart';
import '../../../../l10n/l10n.dart';
import '../../domain/subscription_plan.dart';
import '../providers/shop_provider.dart';
import '../widgets/gift_animation_overlay.dart';

/// Gift catalog screen (can be shown as bottom sheet or full screen).
///
/// Shows gift items organized by category with current Sparks balance.
class GiftCatalogScreen extends ConsumerStatefulWidget {
  final String submissionId;

  const GiftCatalogScreen({
    super.key,
    required this.submissionId,
  });

  @override
  ConsumerState<GiftCatalogScreen> createState() =>
      _GiftCatalogScreenState();
}

class _GiftCatalogScreenState extends ConsumerState<GiftCatalogScreen>
    with SingleTickerProviderStateMixin {
  late final TabController _tabController;
  GiftItem? _selectedGift;
  final _messageController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    Future.microtask(() {
      ref.read(giftProvider.notifier).loadCatalog();
      ref.read(coinProvider.notifier).refreshBalance();
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    _messageController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final giftState = ref.watch(giftProvider);
    final coinState = ref.watch(coinProvider);
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      appBar: AppBar(
        title: Text(context.l10n.sendAGift),
        bottom: TabBar(
          controller: _tabController,
          tabs: [
            Tab(text: context.l10n.quickTab),
            Tab(text: context.l10n.standardTab),
            Tab(text: context.l10n.premiumTab),
          ],
        ),
      ),
      body: Column(
        children: [
          // Balance bar
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            color: isDark
                ? AppColors.darkSurfaceVariant
                : AppColors.lightSurfaceVariant,
            child: Row(
              children: [
                const Icon(Icons.auto_awesome,
                    color: AppColors.accent, size: 18),
                const SizedBox(width: 6),
                Text(
                  '${coinState.balance} Sparks',
                  style: AppTextStyles.bodyMediumBold.copyWith(
                    color: AppColors.accent,
                  ),
                ),
                const Spacer(),
                TextButton.icon(
                  onPressed: () => context.pushNamed(RouteNames.shopCoins),
                  icon: const Icon(Icons.add, size: 16),
                  label: Text(context.l10n.getMore),
                  style: TextButton.styleFrom(
                    padding: const EdgeInsets.symmetric(horizontal: 8),
                    minimumSize: Size.zero,
                    tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                  ),
                ),
              ],
            ),
          ),

          // Catalog grid
          Expanded(
            child: giftState.isLoading && giftState.catalog.isEmpty
                ? const Center(
                    child:
                        CircularProgressIndicator(color: AppColors.primary),
                  )
                : TabBarView(
                    controller: _tabController,
                    children: [
                      _GiftGrid(
                        gifts: giftState.quickReactions,
                        selectedGift: _selectedGift,
                        onSelect: (g) => setState(() => _selectedGift = g),
                      ),
                      _GiftGrid(
                        gifts: giftState.standardGifts,
                        selectedGift: _selectedGift,
                        onSelect: (g) => setState(() => _selectedGift = g),
                      ),
                      _GiftGrid(
                        gifts: giftState.premiumGifts,
                        selectedGift: _selectedGift,
                        onSelect: (g) => setState(() => _selectedGift = g),
                      ),
                    ],
                  ),
          ),

          // Send section
          if (_selectedGift != null)
            _buildSendSection(coinState.balance, isDark),
        ],
      ),
    );
  }

  Widget _buildSendSection(int balance, bool isDark) {
    final gift = _selectedGift!;
    final canAfford = balance >= gift.coinCost;
    final isSending = ref.watch(giftProvider).status == GiftStatus.sending;

    return Container(
      padding: EdgeInsets.fromLTRB(
          16, 12, 16, MediaQuery.of(context).padding.bottom + 12),
      decoration: BoxDecoration(
        color: isDark ? AppColors.darkSurface : AppColors.lightSurface,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.1),
            blurRadius: 8,
            offset: const Offset(0, -2),
          ),
        ],
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Selected gift info
          Row(
            children: [
              _buildGiftIcon(gift, 36),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(gift.name, style: AppTextStyles.bodyMediumBold),
                    Row(
                      children: [
                        const Icon(Icons.auto_awesome,
                            color: AppColors.accent, size: 14),
                        const SizedBox(width: 4),
                        Text(
                          '${gift.coinCost} Sparks',
                          style: AppTextStyles.caption.copyWith(
                            color: AppColors.accent,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),

          const SizedBox(height: 12),

          // Optional message
          TextField(
            controller: _messageController,
            decoration: InputDecoration(
              hintText: context.l10n.giftMessageHint,
              isDense: true,
              contentPadding:
                  EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            ),
            maxLength: 100,
            maxLines: 1,
          ),

          const SizedBox(height: 8),

          // Send button
          SizedBox(
            width: double.infinity,
            child: canAfford
                ? ElevatedButton(
                    onPressed: isSending ? null : _sendGift,
                    child: isSending
                        ? const SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: Colors.white,
                            ),
                          )
                        : Text(context.l10n.sendGiftButton(gift.name, gift.coinCost)),
                  )
                : ElevatedButton(
                    onPressed: () =>
                        context.pushNamed(RouteNames.shopCoins),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.accent,
                    ),
                    child: Text(context.l10n.getMoreSparks),
                  ),
          ),
        ],
      ),
    );
  }

  Future<void> _sendGift() async {
    final gift = _selectedGift;
    if (gift == null) return;

    final result = await ref.read(giftProvider.notifier).sendGift(
          giftId: gift.id,
          submissionId: widget.submissionId,
          message: _messageController.text.trim().isEmpty
              ? null
              : _messageController.text.trim(),
        );

    if (result != null && mounted) {
      // Refresh balance.
      ref.read(coinProvider.notifier).refreshBalance();

      // Show animation overlay.
      if (mounted) {
        GiftAnimationOverlay.show(
          context,
          giftName: gift.name,
          animationUrl: gift.animationUrl,
          iconUrl: gift.iconUrl,
        );
      }

      // Reset selection.
      setState(() {
        _selectedGift = null;
        _messageController.clear();
      });

      if (mounted) {
        context.showSuccessSnackBar('Gift sent!');
      }
    } else if (mounted) {
      final error = ref.read(giftProvider).errorMessage;
      context.showErrorSnackBar(error ?? 'Failed to send gift.');
    }
  }

  Widget _buildGiftIcon(GiftItem gift, double size) {
    if (gift.iconUrl.isNotEmpty) {
      return CachedNetworkImage(
        imageUrl: gift.iconUrl,
        width: size,
        height: size,
        placeholder: (_, __) => Icon(
          Icons.card_giftcard,
          size: size * 0.6,
          color: AppColors.accent,
        ),
        errorWidget: (_, __, ___) => Icon(
          Icons.card_giftcard,
          size: size * 0.6,
          color: AppColors.accent,
        ),
      );
    }
    return Icon(Icons.card_giftcard, size: size * 0.6, color: AppColors.accent);
  }
}

// =============================================================================
// Gift Grid
// =============================================================================

class _GiftGrid extends StatelessWidget {
  final List<GiftItem> gifts;
  final GiftItem? selectedGift;
  final void Function(GiftItem) onSelect;

  const _GiftGrid({
    required this.gifts,
    this.selectedGift,
    required this.onSelect,
  });

  @override
  Widget build(BuildContext context) {
    if (gifts.isEmpty) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.card_giftcard_outlined,
                size: 48, color: AppColors.lightOnSurfaceVariant),
            const SizedBox(height: 12),
            Text('No gifts in this category',
                style: AppTextStyles.bodyMedium),
          ],
        ),
      );
    }

    return GridView.builder(
      padding: const EdgeInsets.all(16),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 4,
        mainAxisSpacing: 12,
        crossAxisSpacing: 12,
        childAspectRatio: 0.75,
      ),
      itemCount: gifts.length,
      itemBuilder: (context, index) {
        final gift = gifts[index];
        final isSelected = selectedGift?.id == gift.id;

        return GestureDetector(
          onTap: () => onSelect(gift),
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 150),
            padding: const EdgeInsets.all(6),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: isSelected
                    ? AppColors.primary
                    : Colors.transparent,
                width: 2,
              ),
              color: isSelected
                  ? AppColors.primary.withValues(alpha: 0.08)
                  : null,
            ),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                if (gift.iconUrl.isNotEmpty)
                  CachedNetworkImage(
                    imageUrl: gift.iconUrl,
                    width: 36,
                    height: 36,
                    errorWidget: (_, __, ___) => const Icon(
                      Icons.card_giftcard,
                      size: 28,
                      color: AppColors.accent,
                    ),
                  )
                else
                  const Icon(Icons.card_giftcard,
                      size: 28, color: AppColors.accent),
                const SizedBox(height: 4),
                Text(
                  gift.name,
                  style: const TextStyle(fontSize: 11),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 2),
                Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.auto_awesome,
                        size: 10, color: AppColors.accent),
                    const SizedBox(width: 2),
                    Text(
                      '${gift.coinCost}',
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.w600,
                        color: AppColors.accent,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}
