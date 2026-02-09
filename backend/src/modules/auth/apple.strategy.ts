import appleSignIn from 'apple-signin-auth';
import { AuthenticationError } from '../../shared/errors';

const APPLE_CLIENT_ID = process.env.APPLE_CLIENT_ID || '';

export interface AppleProfile {
  provider_user_id: string;
  email: string;
  name: string;
}

/**
 * Verifies an Apple Sign-In ID token and extracts the user profile.
 *
 * @throws AuthenticationError when the token is invalid or missing claims.
 */
export async function verifyAppleToken(
  idToken: string,
): Promise<AppleProfile> {
  try {
    const payload = await appleSignIn.verifyIdToken(idToken, {
      audience: APPLE_CLIENT_ID,
      ignoreExpiration: false,
    });

    if (!payload.sub) {
      throw new AuthenticationError(
        'Invalid Apple ID token: missing subject claim',
      );
    }

    // Apple may not always return an email (e.g., private relay),
    // so we fall back to a placeholder derived from the subject.
    const email = payload.email || `${payload.sub}@privaterelay.appleid.com`;

    return {
      provider_user_id: payload.sub,
      email,
      name: email.split('@')[0],
    };
  } catch (err) {
    if (err instanceof AuthenticationError) {
      throw err;
    }
    throw new AuthenticationError(
      'Apple token verification failed. Please try again.',
    );
  }
}
