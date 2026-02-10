import 'dart:io';
import 'dart:ui';

import 'package:ffmpeg_kit_flutter_new/ffmpeg_kit.dart';
import 'package:ffmpeg_kit_flutter_new/ffmpeg_kit_config.dart';
import 'package:ffmpeg_kit_flutter_new/return_code.dart';
import 'package:ffmpeg_kit_flutter_new/statistics.dart';
import 'package:path_provider/path_provider.dart';

import '../presentation/screens/video_editor_screen.dart';

/// Service for exporting edited videos using FFmpeg.
class VideoExportService {
  VideoExportService._();

  /// Exports the edited video with trimming, filter, and text overlay.
  ///
  /// Returns the path to the exported file.
  static Future<String> export({
    required String inputPath,
    required int trimStartMs,
    required int trimEndMs,
    required VideoFilter filter,
    String? overlayText,
    Color textColor = const Color(0xFFFFFFFF),
    double textX = 0.5,
    double textY = 0.5,
    void Function(double progress)? onProgress,
  }) async {
    final dir = await getTemporaryDirectory();
    final outputPath =
        '${dir.path}/export_${DateTime.now().millisecondsSinceEpoch}.mp4';

    final durationMs = trimEndMs - trimStartMs;

    // Build FFmpeg filter chain
    final filters = <String>[];

    // Trimming is handled by -ss and -t flags
    // Scale to 1080x1920 (9:16 portrait)
    filters.add('scale=1080:1920:force_original_aspect_ratio=decrease');
    filters.add('pad=1080:1920:(ow-iw)/2:(oh-ih)/2');

    // Apply color filter
    final colorFilter = _ffmpegFilter(filter);
    if (colorFilter != null) {
      filters.add(colorFilter);
    }

    // Text overlay
    if (overlayText != null && overlayText.isNotEmpty) {
      final hexColor = _colorToHex(textColor);
      final x = '(w*${textX.toStringAsFixed(2)})';
      final y = '(h*${textY.toStringAsFixed(2)})';
      // Escape special characters for FFmpeg drawtext
      final escapedText =
          overlayText.replaceAll("'", "\\'").replaceAll(':', '\\:');
      filters.add(
          "drawtext=text='$escapedText':fontcolor=0x$hexColor:fontsize=48:x=$x:y=$y:borderw=2:bordercolor=black");
    }

    final filterChain = filters.join(',');

    // Build command
    final startSeconds = trimStartMs / 1000.0;
    final durationSeconds = durationMs / 1000.0;

    final command = [
      '-ss', startSeconds.toStringAsFixed(3),
      '-i', inputPath,
      '-t', durationSeconds.toStringAsFixed(3),
      '-vf', filterChain,
      '-c:v', 'libx264',
      '-preset', 'fast',
      '-crf', '23',
      '-c:a', 'aac',
      '-b:a', '128k',
      '-movflags', '+faststart',
      '-y',
      outputPath,
    ].join(' ');

    // Enable statistics for progress tracking
    if (onProgress != null) {
      FFmpegKitConfig.enableStatisticsCallback((Statistics statistics) {
        final time = statistics.getTime();
        if (time > 0 && durationMs > 0) {
          final progress = (time / durationMs).clamp(0.0, 1.0);
          onProgress(progress);
        }
      });
    }

    final session = await FFmpegKit.execute(command);
    final returnCode = await session.getReturnCode();

    if (!ReturnCode.isSuccess(returnCode)) {
      final logs = await session.getOutput();
      // Clean up partial output
      final outputFile = File(outputPath);
      if (await outputFile.exists()) {
        await outputFile.delete();
      }
      throw Exception('FFmpeg export failed: $logs');
    }

    onProgress?.call(1.0);

    return outputPath;
  }

  /// Returns the FFmpeg filter string for a video filter, or null if no filter.
  static String? _ffmpegFilter(VideoFilter filter) {
    switch (filter) {
      case VideoFilter.none:
        return null;
      case VideoFilter.vivid:
        return 'eq=saturation=1.5:contrast=1.2';
      case VideoFilter.mono:
        return 'colorchannelmixer=.3:.4:.3:0:.3:.4:.3:0:.3:.4:.3';
      case VideoFilter.sepia:
        return 'colorchannelmixer=.393:.769:.189:0:.349:.686:.168:0:.272:.534:.131';
      case VideoFilter.warm:
        return 'colortemperature=temperature=5500';
      case VideoFilter.cool:
        return 'colortemperature=temperature=8000';
      case VideoFilter.fade:
        return 'eq=brightness=0.06:saturation=0.8';
      case VideoFilter.vintage:
        return 'curves=vintage';
    }
  }

  /// Converts a Color to a hex string (without alpha) for FFmpeg.
  static String _colorToHex(Color color) {
    final r = (color.r * 255).round().toRadixString(16).padLeft(2, '0');
    final g = (color.g * 255).round().toRadixString(16).padLeft(2, '0');
    final b = (color.b * 255).round().toRadixString(16).padLeft(2, '0');
    return '$r$g$b';
  }
}
