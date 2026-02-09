import { OAuth2Client } from 'google-auth-library';
import { AuthenticationError } from '../../shared/errors';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;

const client = new OAuth2Client(GOOGLE_CLIENT_ID);

export interface GoogleProfile {
  provider_user_id: string;
  email: string;
  name: string;
  avatar_url: string | null;
}

/**
 * Verifies a Google Sign-In ID token and extracts the user profile.
 *
 * @throws AuthenticationError when the token is invalid or missing claims.
 */
export async function verifyGoogleToken(
  idToken: string,
): Promise<GoogleProfile> {
  try {
    const ticket = await client.verifyIdToken({
      idToken,
      audience: GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();

    if (!payload) {
      throw new AuthenticationError('Invalid Google ID token: no payload');
    }

    if (!payload.sub) {
      throw new AuthenticationError(
        'Invalid Google ID token: missing subject claim',
      );
    }

    if (!payload.email) {
      throw new AuthenticationError(
        'Invalid Google ID token: missing email claim',
      );
    }

    return {
      provider_user_id: payload.sub,
      email: payload.email,
      name: payload.name || payload.email.split('@')[0],
      avatar_url: payload.picture || null,
    };
  } catch (err) {
    if (err instanceof AuthenticationError) {
      throw err;
    }
    throw new AuthenticationError(
      'Google token verification failed. Please try again.',
    );
  }
}
