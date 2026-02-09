import 'package:intl/intl.dart';
import 'package:timeago/timeago.dart' as timeago;

/// Date / time formatting helpers used throughout the UI.
class AppDateUtils {
  AppDateUtils._();

  // ---------------------------------------------------------------------------
  // Formatters (reused to avoid repeated object creation)
  // ---------------------------------------------------------------------------

  static final DateFormat _fullDate = DateFormat('MMMM d, yyyy');
  static final DateFormat _shortDate = DateFormat('MMM d, yyyy');
  static final DateFormat _numericDate = DateFormat('MM/dd/yyyy');
  static final DateFormat _time12h = DateFormat('h:mm a');
  static final DateFormat _dateTime = DateFormat('MMM d, yyyy h:mm a');
  static final DateFormat _monthYear = DateFormat('MMMM yyyy');
  static final DateFormat _dayMonth = DateFormat('MMM d');
  static final DateFormat _iso8601 = DateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'");

  // ---------------------------------------------------------------------------
  // Standard formatting
  // ---------------------------------------------------------------------------

  /// e.g. "January 15, 2025"
  static String fullDate(DateTime date) => _fullDate.format(date);

  /// e.g. "Jan 15, 2025"
  static String shortDate(DateTime date) => _shortDate.format(date);

  /// e.g. "01/15/2025"
  static String numericDate(DateTime date) => _numericDate.format(date);

  /// e.g. "3:45 PM"
  static String time12h(DateTime date) => _time12h.format(date);

  /// e.g. "Jan 15, 2025 3:45 PM"
  static String dateTime(DateTime date) => _dateTime.format(date);

  /// e.g. "January 2025"
  static String monthYear(DateTime date) => _monthYear.format(date);

  /// e.g. "Jan 15"
  static String dayMonth(DateTime date) => _dayMonth.format(date);

  /// ISO-8601 UTC string for API payloads.
  static String toIso8601(DateTime date) => _iso8601.format(date.toUtc());

  // ---------------------------------------------------------------------------
  // Relative / timeago
  // ---------------------------------------------------------------------------

  /// Human-readable relative time, e.g. "5 minutes ago", "2 days ago".
  static String relative(DateTime date) {
    return timeago.format(date, allowFromNow: false);
  }

  /// Short relative time, e.g. "5m", "2d".
  static String relativeShort(DateTime date) {
    return timeago.format(date, locale: 'en_short');
  }

  // ---------------------------------------------------------------------------
  // Countdown
  // ---------------------------------------------------------------------------

  /// Formats a [Duration] as "HH:MM:SS" for countdown displays.
  static String countdown(Duration duration) {
    if (duration.isNegative) return '00:00:00';

    final hours = duration.inHours.toString().padLeft(2, '0');
    final minutes = (duration.inMinutes % 60).toString().padLeft(2, '0');
    final seconds = (duration.inSeconds % 60).toString().padLeft(2, '0');

    if (duration.inHours > 0) {
      return '$hours:$minutes:$seconds';
    }
    return '$minutes:$seconds';
  }

  /// Formats a [Duration] as "MM:SS" for video/recording timers.
  static String videoTimer(Duration duration) {
    final minutes = duration.inMinutes.toString().padLeft(2, '0');
    final seconds = (duration.inSeconds % 60).toString().padLeft(2, '0');
    return '$minutes:$seconds';
  }

  /// Formats remaining seconds as "0:SS" for the 30-second recording timer.
  static String recordingTimer(int remainingSeconds) {
    final minutes = remainingSeconds ~/ 60;
    final seconds = remainingSeconds % 60;
    return '$minutes:${seconds.toString().padLeft(2, '0')}';
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  /// Whether [date] is today in the local timezone.
  static bool isToday(DateTime date) {
    final now = DateTime.now();
    return date.year == now.year &&
        date.month == now.month &&
        date.day == now.day;
  }

  /// Whether [date] is yesterday in the local timezone.
  static bool isYesterday(DateTime date) {
    final yesterday = DateTime.now().subtract(const Duration(days: 1));
    return date.year == yesterday.year &&
        date.month == yesterday.month &&
        date.day == yesterday.day;
  }

  /// Smart date label: "Today", "Yesterday", or the short date.
  static String smartDate(DateTime date) {
    if (isToday(date)) return 'Today';
    if (isYesterday(date)) return 'Yesterday';
    return shortDate(date);
  }
}
