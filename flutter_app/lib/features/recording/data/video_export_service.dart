import 'dart:io';
import 'dart:ui';

import 'package:path_provider/path_provider.dart';

import '../presentation/screens/video_editor_screen.dart';

/// Service for exporting edited videos.
///
/// Uses a simple copy-based export for simulator builds.
/// For production builds with FFmpeg, re-enable ffmpeg_kit_flutter_new
/// in pubspec.yaml and restore the FFmpeg implementation.
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

    // Stub: copy input to output (no FFmpeg processing)
    // Filters, trimming, and text overlays are not applied.
    onProgress?.call(0.1);
    final inputFile = File(inputPath);
    if (!await inputFile.exists()) {
      throw Exception('Input file not found: $inputPath');
    }
    await inputFile.copy(outputPath);
    onProgress?.call(1.0);

    return outputPath;
  }

}
