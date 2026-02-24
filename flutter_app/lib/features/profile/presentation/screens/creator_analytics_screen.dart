import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shimmer/shimmer.dart';

import '../../../../core/network/api_client.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../l10n/l10n.dart';
import '../../../auth/presentation/providers/auth_provider.dart';

// =============================================================================
// Analytics data model
// =============================================================================

/// Analytics stats returned by GET /api/v1/users/:id/analytics.
class _AnalyticsData {
  final int totalSubmissions;
  final int totalVotes;
  final double avgVotesPerSubmission;
  final int challengesWon;
  final int totalCoinsEarned;

  const _AnalyticsData({
    required this.totalSubmissions,
    required this.totalVotes,
    required this.avgVotesPerSubmission,
    required this.challengesWon,
    required this.totalCoinsEarned,
  });

  factory _AnalyticsData.fromJson(Map<String, dynamic> json) {
    return _AnalyticsData(
      totalSubmissions: (json['total_submissions'] as num?)?.toInt() ?? 0,
      totalVotes: (json['total_votes'] as num?)?.toInt() ?? 0,
      avgVotesPerSubmission:
          (json['avg_votes_per_submission'] as num?)?.toDouble() ?? 0.0,
      challengesWon: (json['challenges_won'] as num?)?.toInt() ?? 0,
      totalCoinsEarned: (json['total_coins_earned'] as num?)?.toInt() ?? 0,
    );
  }
}

// =============================================================================
// Screen
// =============================================================================

/// Displays creator analytics for the authenticated user (or an explicit
/// [userId] when provided).
///
/// Fetches data from GET /api/v1/users/:id/analytics and shows each metric in
/// a two-column grid of [_StatCard] widgets. Shows a shimmer skeleton while
/// data is loading. A [_CreatorTierSection] is shown at the top using the
/// creator_tier from the current user profile or a separate profile fetch.
class CreatorAnalyticsScreen extends ConsumerStatefulWidget {
  /// The user whose analytics to display.  When null the authenticated user's
  /// id is used.
  final String? userId;

  const CreatorAnalyticsScreen({super.key, this.userId});

  @override
  ConsumerState<CreatorAnalyticsScreen> createState() =>
      _CreatorAnalyticsScreenState();
}

class _CreatorAnalyticsScreenState
    extends ConsumerState<CreatorAnalyticsScreen> {
  _AnalyticsData? _data;
  String? _creatorTier;
  bool _isLoading = true;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    Future.microtask(_loadAnalytics);
  }

  String get _userId {
    return widget.userId ?? ref.read(currentUserProvider)?.id ?? '';
  }

  /// Returns true when this screen is showing the currently logged-in user's
  /// own analytics.
  bool get _isOwnProfile {
    final currentId = ref.read(currentUserProvider)?.id;
    return currentId != null &&
        (widget.userId == null || widget.userId == currentId);
  }

  Future<void> _loadAnalytics() async {
    if (!mounted) return;
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    final uid = _userId;
    if (uid.isEmpty) {
      if (mounted) {
        setState(() {
          _isLoading = false;
          _errorMessage = 'User not found.';
        });
      }
      return;
    }

    try {
      final client = ref.read(apiClientProvider);

      // Fetch analytics and (if not own profile) the user profile in parallel
      // to obtain creator_tier.
      final futures = <Future>[
        client.get<Map<String, dynamic>>('/api/v1/users/$uid/analytics'),
        if (!_isOwnProfile)
          client.get<Map<String, dynamic>>('/api/v1/users/$uid'),
      ];

      final results = await Future.wait(futures);

      // Parse analytics
      final analyticsResponse = results[0] as dynamic;
      final responseData =
          analyticsResponse.data as Map<String, dynamic>?;
      final Map<String, dynamic> payload;
      if (responseData != null &&
          responseData['data'] is Map<String, dynamic>) {
        payload = responseData['data'] as Map<String, dynamic>;
      } else if (responseData != null) {
        payload = responseData;
      } else {
        payload = {};
      }

      // Determine creator_tier
      String? tier;
      if (_isOwnProfile) {
        // Use the already-loaded current user if possible.
        // creator_tier is not on the User entity, so check the profile response.
        tier = null;
      } else {
        // Parse from the separate profile fetch
        final profileResponse = results[1] as dynamic;
        final profileData =
            profileResponse.data as Map<String, dynamic>?;
        final Map<String, dynamic> profilePayload;
        if (profileData != null &&
            profileData['data'] is Map<String, dynamic>) {
          profilePayload = profileData['data'] as Map<String, dynamic>;
        } else if (profileData != null) {
          profilePayload = profileData;
        } else {
          profilePayload = {};
        }
        tier = profilePayload['creator_tier'] as String?;
      }

      // For own profile, also fetch creator_tier from the profile endpoint.
      if (_isOwnProfile) {
        try {
          final profileResp = await client
              .get<Map<String, dynamic>>('/api/v1/users/$uid');
          final pd = profileResp.data;
          final Map<String, dynamic> pp;
          if (pd != null && pd['data'] is Map<String, dynamic>) {
            pp = pd['data'] as Map<String, dynamic>;
          } else if (pd != null) {
            pp = pd;
          } else {
            pp = {};
          }
          tier = pp['creator_tier'] as String?;
        } catch (_) {
          // Non-fatal — tier remains null
        }
      }

      if (mounted) {
        setState(() {
          _data = _AnalyticsData.fromJson(payload);
          _creatorTier = tier;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isLoading = false;
          _errorMessage = e.toString();
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(context.l10n.creatorAnalytics),
      ),
      body: _buildBody(context),
    );
  }

  Widget _buildBody(BuildContext context) {
    if (_isLoading) {
      return _buildShimmer();
    }

    if (_errorMessage != null) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.error_outline, size: 48, color: AppColors.error),
            const SizedBox(height: 16),
            Text(
              context.l10n.somethingWentWrong,
              style: AppTextStyles.heading4,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 8),
            Text(
              _errorMessage!,
              style: AppTextStyles.bodyMedium,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 16),
            ElevatedButton.icon(
              onPressed: _loadAnalytics,
              icon: const Icon(Icons.refresh_rounded),
              label: Text(context.l10n.retry),
            ),
          ],
        ),
      );
    }

    final data = _data;
    if (data == null) {
      return const SizedBox.shrink();
    }

    return RefreshIndicator(
      color: AppColors.primary,
      onRefresh: _loadAnalytics,
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.only(bottom: 24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Creator tier section at the top
            _CreatorTierSection(tier: _creatorTier),

            Padding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
              child: GridView.count(
                crossAxisCount: 2,
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                crossAxisSpacing: 12,
                mainAxisSpacing: 12,
                childAspectRatio: 1.4,
                children: [
                  _StatCard(
                    label: context.l10n.totalSubmissions,
                    value: data.totalSubmissions.toString(),
                    icon: Icons.video_library,
                  ),
                  _StatCard(
                    label: context.l10n.totalVotes,
                    value: data.totalVotes.toString(),
                    icon: Icons.how_to_vote,
                  ),
                  _StatCard(
                    label: context.l10n.avgVotes,
                    value: data.avgVotesPerSubmission.toStringAsFixed(1),
                    icon: Icons.bar_chart,
                  ),
                  _StatCard(
                    label: context.l10n.challengesWon,
                    value: data.challengesWon.toString(),
                    icon: Icons.emoji_events,
                  ),
                  _StatCard(
                    label: context.l10n.totalCoinsEarned,
                    value: data.totalCoinsEarned.toString(),
                    icon: Icons.monetization_on,
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  /// Shimmer loading skeleton matching the 2-column grid layout.
  Widget _buildShimmer() {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final baseColor =
        isDark ? const Color(0xFF2C2C2C) : const Color(0xFFE0E0E0);
    final highlightColor =
        isDark ? const Color(0xFF3D3D3D) : const Color(0xFFF5F5F5);

    return Shimmer.fromColors(
      baseColor: baseColor,
      highlightColor: highlightColor,
      child: SingleChildScrollView(
        physics: const NeverScrollableScrollPhysics(),
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            // Shimmer for tier section
            Container(
              height: 90,
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
              ),
            ),
            const SizedBox(height: 16),
            GridView.count(
              crossAxisCount: 2,
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              crossAxisSpacing: 12,
              mainAxisSpacing: 12,
              childAspectRatio: 1.4,
              children: List.generate(
                5,
                (_) => Card(
                  elevation: 1,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Container(
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// =============================================================================
// Creator tier section widget
// =============================================================================

class _CreatorTierSection extends StatelessWidget {
  final String? tier;

  const _CreatorTierSection({this.tier});

  @override
  Widget build(BuildContext context) {
    final tierColors = <String, Color>{
      'rookie': const Color(0xFF4CAF50),
      'rising': const Color(0xFF2196F3),
      'partner': const Color(0xFFFF9800),
      'featured': const Color(0xFF9C27B0),
    };
    final tierEmojis = <String, String>{
      'rookie': '⭐',
      'rising': '🌟',
      'partner': '💫',
      'featured': '✨',
    };
    final revenueShares = <String, String>{
      'rookie': '50%',
      'rising': '55%',
      'partner': '60%',
      'featured': '65%',
    };

    final normalizedTier = tier?.toLowerCase();
    final color = normalizedTier != null
        ? (tierColors[normalizedTier] ?? Colors.grey)
        : Colors.grey;
    final emoji =
        normalizedTier != null ? (tierEmojis[normalizedTier] ?? '⭐') : '—';
    final share = normalizedTier != null
        ? (revenueShares[normalizedTier] ?? '0%')
        : '0%';
    final displayName = normalizedTier != null
        ? (normalizedTier[0].toUpperCase() + normalizedTier.substring(1))
        : 'No Tier';
    final subtitle = normalizedTier != null
        ? 'Gift revenue share: $share'
        : 'Work toward Rookie tier!';

    return Container(
      margin: const EdgeInsets.all(16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Row(
        children: [
          Text(emoji, style: const TextStyle(fontSize: 32)),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Creator Tier: $displayName',
                  style: TextStyle(
                    fontWeight: FontWeight.bold,
                    color: color,
                    fontSize: 16,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  subtitle,
                  style: const TextStyle(fontSize: 13, color: Colors.grey),
                ),
              ],
            ),
          ),
          if (normalizedTier != null)
            Icon(Icons.verified, color: color, size: 24),
        ],
      ),
    );
  }
}

// =============================================================================
// Stat card widget
// =============================================================================

class _StatCard extends StatelessWidget {
  final String label;
  final String value;
  final IconData icon;

  const _StatCard({
    required this.label,
    required this.value,
    required this.icon,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Card(
      elevation: 1,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Icon(icon, color: AppColors.primary, size: 28),
            const SizedBox(height: 8),
            Text(
              value,
              style: AppTextStyles.heading3.copyWith(
                color: isDark
                    ? AppColors.darkOnSurface
                    : AppColors.lightOnSurface,
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
            Text(
              label,
              style: AppTextStyles.caption.copyWith(
                color: isDark
                    ? AppColors.darkOnSurfaceVariant
                    : AppColors.lightOnSurfaceVariant,
              ),
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
          ],
        ),
      ),
    );
  }
}
