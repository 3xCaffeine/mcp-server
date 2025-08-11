import { OAuth2Client } from 'google-auth-library';
import { db } from '@/lib/db';
import { account } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

/**
 * Get Google OAuth client for a user using their stored tokens
 */
export async function getGoogleOAuthClient(userId: string): Promise<OAuth2Client> {
    // Retrieve the user's Google account tokens from the database
    const googleAccount = await db
        .select()
        .from(account)
        .where(
            and(
                eq(account.userId, userId),
                eq(account.providerId, 'google')
            )
        )
        .limit(1);

    if (!googleAccount.length) {
        throw new Error('No Google account found for user');
    }

    const accountData = googleAccount[0];

    if (!accountData.accessToken) {
        throw new Error('No access token available for Google account');
    }

    // Create OAuth2 client
    const oauth2Client = new OAuth2Client(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET
    );

    // Set the credentials
    oauth2Client.setCredentials({
        access_token: accountData.accessToken,
        refresh_token: accountData.refreshToken,
        expiry_date: accountData.accessTokenExpiresAt?.getTime(),
        scope: accountData.scope || '',
    });

    // Auto-refresh tokens if they're expired
    oauth2Client.on('tokens', async (tokens) => {
        if (tokens.access_token) {
            await db
                .update(account)
                .set({
                    accessToken: tokens.access_token,
                    accessTokenExpiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
                    refreshToken: tokens.refresh_token || accountData.refreshToken,
                    updatedAt: new Date(),
                })
                .where(eq(account.id, accountData.id));
        }
    });

    return oauth2Client;
}
