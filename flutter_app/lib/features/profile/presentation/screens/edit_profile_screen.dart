import 'dart:async';

import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../core/utils/extensions.dart';
import '../../../../l10n/l10n.dart';
import '../../data/profile_repository.dart';
import '../providers/profile_provider.dart';

/// Screen for editing the authenticated user's profile.
class EditProfileScreen extends ConsumerStatefulWidget {
  const EditProfileScreen({super.key});

  @override
  ConsumerState<EditProfileScreen> createState() => _EditProfileScreenState();
}

class _EditProfileScreenState extends ConsumerState<EditProfileScreen> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _displayNameController;
  late final TextEditingController _usernameController;
  late final TextEditingController _bioController;

  bool _isSaving = false;
  bool _isCheckingUsername = false;
  bool? _isUsernameAvailable;
  Timer? _usernameDebounce;
  String? _originalUsername;

  @override
  void initState() {
    super.initState();
    final profile = ref.read(myProfileProvider).profile;
    _displayNameController =
        TextEditingController(text: profile?.displayName ?? '');
    _usernameController =
        TextEditingController(text: profile?.username ?? '');
    _bioController = TextEditingController(text: profile?.bio ?? '');
    _originalUsername = profile?.username;
  }

  @override
  void dispose() {
    _displayNameController.dispose();
    _usernameController.dispose();
    _bioController.dispose();
    _usernameDebounce?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final profileState = ref.watch(myProfileProvider);
    final profile = profileState.profile;
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      appBar: AppBar(
        title: Text(context.l10n.editProfile),
        actions: [
          TextButton(
            onPressed: _isSaving ? null : _save,
            child: _isSaving
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : Text(context.l10n.save),
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Form(
          key: _formKey,
          child: Column(
            children: [
              // Avatar picker
              Center(
                child: GestureDetector(
                  onTap: _pickAvatar,
                  child: Stack(
                    children: [
                      CircleAvatar(
                        radius: 56,
                        backgroundColor:
                            AppColors.primary.withValues(alpha: 0.1),
                        backgroundImage: profile?.avatarUrl != null
                            ? CachedNetworkImageProvider(profile!.avatarUrl!)
                            : null,
                        child: profile?.avatarUrl == null
                            ? Text(
                                profile?.displayName.isNotEmpty == true
                                    ? profile!.displayName[0].toUpperCase()
                                    : '?',
                                style: AppTextStyles.displayMedium.copyWith(
                                  color: AppColors.primary,
                                ),
                              )
                            : null,
                      ),
                      Positioned(
                        bottom: 0,
                        right: 0,
                        child: Container(
                          padding: const EdgeInsets.all(8),
                          decoration: const BoxDecoration(
                            color: AppColors.primary,
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(
                            Icons.camera_alt,
                            color: Colors.white,
                            size: 18,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),

              const SizedBox(height: 32),

              // Display name
              TextFormField(
                controller: _displayNameController,
                decoration: InputDecoration(
                  labelText: context.l10n.displayName,
                  prefixIcon: const Icon(Icons.person_outline),
                ),
                textCapitalization: TextCapitalization.words,
                inputFormatters: [LengthLimitingTextInputFormatter(50)],
                validator: (value) {
                  if (value == null || value.trim().isEmpty) {
                    return context.l10n.displayNameRequired;
                  }
                  if (value.trim().length < 2) {
                    return context.l10n.minCharacters(2);
                  }
                  return null;
                },
              ),

              const SizedBox(height: 16),

              // Username with availability check
              TextFormField(
                controller: _usernameController,
                decoration: InputDecoration(
                  labelText: context.l10n.username,
                  prefixIcon: const Icon(Icons.alternate_email),
                  prefixText: '@',
                  suffixIcon: _buildUsernameSuffix(),
                ),
                inputFormatters: [
                  FilteringTextInputFormatter.allow(RegExp(r'[a-zA-Z0-9_]')),
                  LengthLimitingTextInputFormatter(30),
                ],
                onChanged: _onUsernameChanged,
                validator: (value) {
                  if (value == null || value.trim().isEmpty) {
                    return context.l10n.usernameRequired;
                  }
                  if (value.trim().length < 3) {
                    return context.l10n.minCharacters(3);
                  }
                  if (_isUsernameAvailable == false &&
                      value != _originalUsername) {
                    return context.l10n.usernameNotAvailable;
                  }
                  return null;
                },
              ),

              const SizedBox(height: 16),

              // Bio with char counter
              TextFormField(
                controller: _bioController,
                decoration: InputDecoration(
                  labelText: context.l10n.bio,
                  prefixIcon: const Icon(Icons.info_outline),
                  alignLabelWithHint: true,
                  counterText:
                      '${_bioController.text.length}/200',
                ),
                maxLines: 4,
                maxLength: 200,
                buildCounter: (context,
                    {required currentLength,
                    required isFocused,
                    required maxLength}) {
                  return Text(
                    '$currentLength/$maxLength',
                    style: AppTextStyles.caption.copyWith(
                      color: currentLength > 180
                          ? AppColors.error
                          : (isDark
                              ? AppColors.darkOnSurfaceVariant
                              : AppColors.lightOnSurfaceVariant),
                    ),
                  );
                },
                onChanged: (_) => setState(() {}),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget? _buildUsernameSuffix() {
    if (_usernameController.text == _originalUsername) return null;
    if (_isCheckingUsername) {
      return const Padding(
        padding: EdgeInsets.all(12),
        child: SizedBox(
          width: 20,
          height: 20,
          child: CircularProgressIndicator(strokeWidth: 2),
        ),
      );
    }
    if (_isUsernameAvailable == true) {
      return const Icon(Icons.check_circle, color: AppColors.success);
    }
    if (_isUsernameAvailable == false) {
      return const Icon(Icons.cancel, color: AppColors.error);
    }
    return null;
  }

  void _onUsernameChanged(String value) {
    _usernameDebounce?.cancel();
    if (value == _originalUsername) {
      setState(() {
        _isUsernameAvailable = null;
        _isCheckingUsername = false;
      });
      return;
    }

    setState(() {
      _isCheckingUsername = true;
      _isUsernameAvailable = null;
    });

    _usernameDebounce = Timer(const Duration(milliseconds: 500), () async {
      if (value.trim().length < 3) {
        setState(() {
          _isCheckingUsername = false;
          _isUsernameAvailable = null;
        });
        return;
      }

      final available = await ref
          .read(profileRepositoryProvider)
          .checkUsernameAvailability(value.trim());
      if (mounted && _usernameController.text == value) {
        setState(() {
          _isCheckingUsername = false;
          _isUsernameAvailable = available;
        });
      }
    });
  }

  Future<void> _pickAvatar() async {
    final source = await showModalBottomSheet<ImageSource>(
      context: context,
      builder: (ctx) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(Icons.camera_alt),
              title: Text(context.l10n.camera),
              onTap: () => Navigator.of(ctx).pop(ImageSource.camera),
            ),
            ListTile(
              leading: const Icon(Icons.photo_library),
              title: Text(context.l10n.gallery),
              onTap: () => Navigator.of(ctx).pop(ImageSource.gallery),
            ),
          ],
        ),
      ),
    );

    if (source == null) return;

    final picker = ImagePicker();
    final image = await picker.pickImage(
      source: source,
      maxWidth: 512,
      maxHeight: 512,
      imageQuality: 85,
    );
    if (image == null) return;

    setState(() => _isSaving = true);
    final success = await ref
        .read(myProfileProvider.notifier)
        .updateAvatar(image.path);
    setState(() => _isSaving = false);

    if (mounted) {
      if (success) {
        context.showSuccessSnackBar('Avatar updated!');
      } else {
        context.showErrorSnackBar('Failed to update avatar.');
      }
    }
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isSaving = true);
    final success = await ref.read(myProfileProvider.notifier).updateProfile(
          displayName: _displayNameController.text.trim(),
          username: _usernameController.text.trim(),
          bio: _bioController.text.trim(),
        );
    setState(() => _isSaving = false);

    if (mounted) {
      if (success) {
        context.showSuccessSnackBar('Profile updated!');
        Navigator.of(context).pop();
      } else {
        context.showErrorSnackBar('Failed to update profile. Please try again.');
      }
    }
  }
}
