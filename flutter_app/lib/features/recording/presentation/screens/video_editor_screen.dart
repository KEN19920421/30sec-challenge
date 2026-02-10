import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:video_player/video_player.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../l10n/l10n.dart';
import '../../data/video_export_service.dart';

/// Available video filter presets.
enum VideoFilter {
  none,
  vivid,
  mono,
  sepia,
  warm,
  cool,
  fade,
  vintage,
}

/// Video editor screen with trimming, filters, and text overlay.
class VideoEditorScreen extends ConsumerStatefulWidget {
  final String challengeId;
  final String filePath;
  final int? durationMs;

  const VideoEditorScreen({
    super.key,
    required this.challengeId,
    required this.filePath,
    this.durationMs,
  });

  @override
  ConsumerState<VideoEditorScreen> createState() => _VideoEditorScreenState();
}

class _VideoEditorScreenState extends ConsumerState<VideoEditorScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  VideoPlayerController? _videoController;
  bool _isInitialized = false;
  bool _isExporting = false;
  double _exportProgress = 0.0;

  // Trimming state
  late double _videoDurationMs;
  double _trimStartMs = 0;
  double _trimEndMs = 30000; // 30 seconds max

  // Filter state
  VideoFilter _selectedFilter = VideoFilter.none;

  // Text overlay state
  String _overlayText = '';
  Color _textColor = Colors.white;
  Offset _textPosition = const Offset(0.5, 0.5); // Normalized 0-1

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _initializeVideo();
  }

  Future<void> _initializeVideo() async {
    _videoController = VideoPlayerController.file(File(widget.filePath));
    await _videoController!.initialize();
    await _videoController!.setLooping(true);
    await _videoController!.play();

    if (mounted) {
      setState(() {
        _isInitialized = true;
        _videoDurationMs =
            _videoController!.value.duration.inMilliseconds.toDouble();
        // Clamp trim range to actual duration, max 30s
        _trimEndMs = _videoDurationMs.clamp(5000, 30000);
      });
    }
  }

  @override
  void dispose() {
    _tabController.dispose();
    _videoController?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.black,
      appBar: AppBar(
        backgroundColor: AppColors.black,
        foregroundColor: AppColors.white,
        title: Text(context.l10n.editVideo),
        actions: [
          TextButton(
            onPressed: _isExporting ? null : _onNext,
            child: Text(
              context.l10n.next,
              style: AppTextStyles.bodyMediumBold.copyWith(
                color: _isExporting ? AppColors.lightDisabled : AppColors.primary,
              ),
            ),
          ),
        ],
      ),
      body: Column(
        children: [
          // Video preview
          Expanded(
            flex: 3,
            child: _buildVideoPreview(),
          ),

          // Export progress
          if (_isExporting)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
              child: Column(
                children: [
                  LinearProgressIndicator(
                    value: _exportProgress,
                    backgroundColor: AppColors.darkSurfaceVariant,
                    color: AppColors.primary,
                  ),
                  const SizedBox(height: 4),
                  Text(
                    context.l10n.exporting,
                    style: AppTextStyles.caption
                        .copyWith(color: AppColors.white.withValues(alpha: 0.7)),
                  ),
                ],
              ),
            ),

          // Tab bar
          TabBar(
            controller: _tabController,
            indicatorColor: AppColors.primary,
            labelColor: AppColors.white,
            unselectedLabelColor: AppColors.white.withValues(alpha: 0.5),
            tabs: [
              Tab(text: context.l10n.trimVideo),
              Tab(text: context.l10n.filters),
              Tab(text: context.l10n.addText),
            ],
          ),

          // Tab content
          Expanded(
            flex: 2,
            child: TabBarView(
              controller: _tabController,
              children: [
                _buildTrimTab(),
                _buildFilterTab(),
                _buildTextTab(),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildVideoPreview() {
    if (!_isInitialized || _videoController == null) {
      return const Center(
        child: CircularProgressIndicator(color: AppColors.primary),
      );
    }

    return Center(
      child: AspectRatio(
        aspectRatio: 9 / 16,
        child: Stack(
          fit: StackFit.expand,
          children: [
            // Video with filter applied visually
            ColorFiltered(
              colorFilter: _getColorFilter(_selectedFilter),
              child: VideoPlayer(_videoController!),
            ),
            // Text overlay preview
            if (_overlayText.isNotEmpty)
              Positioned(
                left: _textPosition.dx *
                    (MediaQuery.of(context).size.width * 0.6),
                top: _textPosition.dy * (MediaQuery.of(context).size.width),
                child: GestureDetector(
                  onPanUpdate: (details) {
                    setState(() {
                      final size = MediaQuery.of(context).size;
                      _textPosition = Offset(
                        (_textPosition.dx +
                                details.delta.dx / (size.width * 0.6))
                            .clamp(0.0, 1.0),
                        (_textPosition.dy + details.delta.dy / size.width)
                            .clamp(0.0, 1.0),
                      );
                    });
                  },
                  child: Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: Colors.black38,
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: Text(
                      _overlayText,
                      style: TextStyle(
                        color: _textColor,
                        fontSize: 24,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ),
              ),
            // Play/pause toggle
            GestureDetector(
              onTap: () {
                setState(() {
                  if (_videoController!.value.isPlaying) {
                    _videoController!.pause();
                  } else {
                    _videoController!.play();
                  }
                });
              },
              child: Container(
                color: Colors.transparent,
                child: Center(
                  child: AnimatedOpacity(
                    opacity: _videoController!.value.isPlaying ? 0 : 0.7,
                    duration: const Duration(milliseconds: 200),
                    child: const Icon(
                      Icons.play_circle_fill,
                      size: 64,
                      color: Colors.white,
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

  // ---------------------------------------------------------------------------
  // Trim tab
  // ---------------------------------------------------------------------------

  Widget _buildTrimTab() {
    if (!_isInitialized) {
      return const SizedBox.shrink();
    }

    final durationSec = _videoDurationMs / 1000;
    final startSec = _trimStartMs / 1000;
    final endSec = _trimEndMs / 1000;

    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            '${startSec.toStringAsFixed(1)}s - ${endSec.toStringAsFixed(1)}s',
            style: AppTextStyles.bodyMediumBold.copyWith(color: AppColors.white),
          ),
          const SizedBox(height: 4),
          Text(
            '${(endSec - startSec).toStringAsFixed(1)}s / ${durationSec.toStringAsFixed(1)}s',
            style: AppTextStyles.caption.copyWith(
                color: AppColors.white.withValues(alpha: 0.6)),
          ),
          const SizedBox(height: 12),
          RangeSlider(
            values: RangeValues(_trimStartMs, _trimEndMs),
            min: 0,
            max: _videoDurationMs,
            activeColor: AppColors.primary,
            inactiveColor: AppColors.darkSurfaceVariant,
            onChanged: (values) {
              final durationMs = values.end - values.start;
              // Enforce 5-30 second range
              if (durationMs >= 5000 && durationMs <= 30000) {
                setState(() {
                  _trimStartMs = values.start;
                  _trimEndMs = values.end;
                });
                _videoController?.seekTo(
                    Duration(milliseconds: values.start.round()));
              }
            },
          ),
          const SizedBox(height: 8),
          Text(
            '5-30s range',
            style: AppTextStyles.caption.copyWith(
                color: AppColors.white.withValues(alpha: 0.5)),
          ),
        ],
      ),
    );
  }

  // ---------------------------------------------------------------------------
  // Filter tab
  // ---------------------------------------------------------------------------

  Widget _buildFilterTab() {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: GridView.builder(
        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: 4,
          crossAxisSpacing: 12,
          mainAxisSpacing: 12,
          childAspectRatio: 0.8,
        ),
        itemCount: VideoFilter.values.length,
        itemBuilder: (context, index) {
          final filter = VideoFilter.values[index];
          final isSelected = _selectedFilter == filter;

          return GestureDetector(
            onTap: () => setState(() => _selectedFilter = filter),
            child: Column(
              children: [
                Container(
                  width: 56,
                  height: 56,
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color:
                          isSelected ? AppColors.primary : Colors.transparent,
                      width: 2,
                    ),
                    color: _filterPreviewColor(filter),
                  ),
                  child: isSelected
                      ? const Icon(Icons.check,
                          color: AppColors.white, size: 20)
                      : null,
                ),
                const SizedBox(height: 4),
                Text(
                  _filterName(filter),
                  style: AppTextStyles.caption.copyWith(
                    color: isSelected
                        ? AppColors.primary
                        : AppColors.white.withValues(alpha: 0.7),
                    fontWeight:
                        isSelected ? FontWeight.bold : FontWeight.normal,
                  ),
                  maxLines: 1,
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  // ---------------------------------------------------------------------------
  // Text tab
  // ---------------------------------------------------------------------------

  Widget _buildTextTab() {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        children: [
          TextField(
            onChanged: (value) => setState(() => _overlayText = value),
            style: const TextStyle(color: AppColors.white),
            decoration: InputDecoration(
              hintText: context.l10n.addText,
              hintStyle: TextStyle(
                  color: AppColors.white.withValues(alpha: 0.4)),
              enabledBorder: OutlineInputBorder(
                borderSide: BorderSide(
                    color: AppColors.white.withValues(alpha: 0.3)),
                borderRadius: BorderRadius.circular(8),
              ),
              focusedBorder: OutlineInputBorder(
                borderSide: const BorderSide(color: AppColors.primary),
                borderRadius: BorderRadius.circular(8),
              ),
            ),
            maxLength: 50,
          ),
          const SizedBox(height: 12),
          // Color picker row
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              Colors.white,
              Colors.black,
              Colors.red,
              Colors.yellow,
              Colors.green,
              Colors.blue,
              Colors.purple,
            ].map((color) {
              return GestureDetector(
                onTap: () => setState(() => _textColor = color),
                child: Container(
                  width: 32,
                  height: 32,
                  decoration: BoxDecoration(
                    color: color,
                    shape: BoxShape.circle,
                    border: Border.all(
                      color: _textColor == color
                          ? AppColors.primary
                          : Colors.transparent,
                      width: 3,
                    ),
                  ),
                ),
              );
            }).toList(),
          ),
          const SizedBox(height: 8),
          Text(
            'Drag text on preview to reposition',
            style: AppTextStyles.caption.copyWith(
                color: AppColors.white.withValues(alpha: 0.5)),
          ),
        ],
      ),
    );
  }

  // ---------------------------------------------------------------------------
  // Export & navigation
  // ---------------------------------------------------------------------------

  Future<void> _onNext() async {
    setState(() {
      _isExporting = true;
      _exportProgress = 0.0;
    });

    try {
      final outputPath = await VideoExportService.export(
        inputPath: widget.filePath,
        trimStartMs: _trimStartMs.round(),
        trimEndMs: _trimEndMs.round(),
        filter: _selectedFilter,
        overlayText: _overlayText.isNotEmpty ? _overlayText : null,
        textColor: _textColor,
        textX: _textPosition.dx,
        textY: _textPosition.dy,
        onProgress: (progress) {
          if (mounted) {
            setState(() => _exportProgress = progress);
          }
        },
      );

      if (mounted) {
        context.push(
          '/record/preview',
          extra: {
            'challengeId': widget.challengeId,
            'filePath': outputPath,
            'durationMs': (_trimEndMs - _trimStartMs).round(),
          },
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Export failed: $e')),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isExporting = false);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Filter helpers
  // ---------------------------------------------------------------------------

  ColorFilter _getColorFilter(VideoFilter filter) {
    switch (filter) {
      case VideoFilter.none:
        return const ColorFilter.mode(Colors.transparent, BlendMode.dst);
      case VideoFilter.vivid:
        return const ColorFilter.matrix(<double>[
          1.3, 0, 0, 0, 0, 0, 1.3, 0, 0, 0, 0, 0, 1.3, 0, 0, 0, 0, 0, 1, 0,
        ]);
      case VideoFilter.mono:
        return const ColorFilter.matrix(<double>[
          0.2126, 0.7152, 0.0722, 0, 0,
          0.2126, 0.7152, 0.0722, 0, 0,
          0.2126, 0.7152, 0.0722, 0, 0,
          0, 0, 0, 1, 0,
        ]);
      case VideoFilter.sepia:
        return const ColorFilter.matrix(<double>[
          0.393, 0.769, 0.189, 0, 0,
          0.349, 0.686, 0.168, 0, 0,
          0.272, 0.534, 0.131, 0, 0,
          0, 0, 0, 1, 0,
        ]);
      case VideoFilter.warm:
        return const ColorFilter.matrix(<double>[
          1.2, 0, 0, 0, 10, 0, 1.0, 0, 0, 0, 0, 0, 0.8, 0, -10, 0, 0, 0, 1, 0,
        ]);
      case VideoFilter.cool:
        return const ColorFilter.matrix(<double>[
          0.8, 0, 0, 0, -10, 0, 1.0, 0, 0, 0, 0, 0, 1.2, 0, 10, 0, 0, 0, 1, 0,
        ]);
      case VideoFilter.fade:
        return const ColorFilter.matrix(<double>[
          1, 0, 0, 0, 30, 0, 1, 0, 0, 30, 0, 0, 1, 0, 30, 0, 0, 0, 0.9, 0,
        ]);
      case VideoFilter.vintage:
        return const ColorFilter.matrix(<double>[
          0.9, 0.1, 0.1, 0, 0,
          0.05, 0.85, 0.1, 0, 0,
          0.05, 0.1, 0.7, 0, 20,
          0, 0, 0, 1, 0,
        ]);
    }
  }

  String _filterName(VideoFilter filter) {
    switch (filter) {
      case VideoFilter.none:
        return 'None';
      case VideoFilter.vivid:
        return 'Vivid';
      case VideoFilter.mono:
        return 'Mono';
      case VideoFilter.sepia:
        return 'Sepia';
      case VideoFilter.warm:
        return 'Warm';
      case VideoFilter.cool:
        return 'Cool';
      case VideoFilter.fade:
        return 'Fade';
      case VideoFilter.vintage:
        return 'Vintage';
    }
  }

  Color _filterPreviewColor(VideoFilter filter) {
    switch (filter) {
      case VideoFilter.none:
        return AppColors.darkSurfaceVariant;
      case VideoFilter.vivid:
        return Colors.deepOrange.shade700;
      case VideoFilter.mono:
        return Colors.grey.shade700;
      case VideoFilter.sepia:
        return Colors.brown.shade600;
      case VideoFilter.warm:
        return Colors.orange.shade700;
      case VideoFilter.cool:
        return Colors.blue.shade700;
      case VideoFilter.fade:
        return Colors.blueGrey.shade400;
      case VideoFilter.vintage:
        return Colors.amber.shade800;
    }
  }
}
