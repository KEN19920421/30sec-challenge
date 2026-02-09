import 'package:flutter/material.dart';

/// The three tiers of password strength.
enum PasswordStrength { weak, medium, strong }

/// Evaluates [password] and returns a [PasswordStrength] score.
///
/// The criteria:
/// - **strong**: 8+ chars, has uppercase, lowercase, digit, and special char.
/// - **medium**: 8+ chars and meets at least 2 of the 4 criteria above.
/// - **weak**: everything else.
PasswordStrength evaluatePasswordStrength(String password) {
  if (password.isEmpty) return PasswordStrength.weak;

  int score = 0;
  if (password.length >= 8) score++;
  if (RegExp(r'[A-Z]').hasMatch(password)) score++;
  if (RegExp(r'[a-z]').hasMatch(password)) score++;
  if (RegExp(r'[0-9]').hasMatch(password)) score++;
  if (RegExp(r'[!@#\$%\^&\*\(\)_\+\-=\[\]\{\};:,\.<>\?/\\|`~]')
      .hasMatch(password)) {
    score++;
  }

  if (score >= 5) return PasswordStrength.strong;
  if (score >= 3) return PasswordStrength.medium;
  return PasswordStrength.weak;
}

/// A visual bar indicator that shows the strength of a password.
///
/// Displays a colour-coded segmented bar (red / amber / green) with
/// a text label.
class PasswordStrengthIndicator extends StatelessWidget {
  final String password;

  const PasswordStrengthIndicator({super.key, required this.password});

  @override
  Widget build(BuildContext context) {
    if (password.isEmpty) return const SizedBox.shrink();

    final strength = evaluatePasswordStrength(password);
    final (color, label, fraction) = switch (strength) {
      PasswordStrength.weak => (
          const Color(0xFFE53935),
          'Weak',
          1 / 3,
        ),
      PasswordStrength.medium => (
          const Color(0xFFFFA726),
          'Medium',
          2 / 3,
        ),
      PasswordStrength.strong => (
          const Color(0xFF43A047),
          'Strong',
          1.0,
        ),
    };

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SizedBox(height: 8),
        ClipRRect(
          borderRadius: BorderRadius.circular(4),
          child: SizedBox(
            height: 4,
            child: LayoutBuilder(
              builder: (context, constraints) {
                return Stack(
                  children: [
                    // Background track.
                    Container(
                      width: constraints.maxWidth,
                      color: Colors.grey.withValues(alpha: 0.2),
                    ),
                    // Filled portion.
                    AnimatedContainer(
                      duration: const Duration(milliseconds: 300),
                      curve: Curves.easeInOut,
                      width: constraints.maxWidth * fraction,
                      decoration: BoxDecoration(
                        color: color,
                        borderRadius: BorderRadius.circular(4),
                      ),
                    ),
                  ],
                );
              },
            ),
          ),
        ),
        const SizedBox(height: 6),
        Text(
          label,
          style: TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w600,
            color: color,
          ),
        ),
      ],
    );
  }
}
