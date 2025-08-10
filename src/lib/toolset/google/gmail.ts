import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { db } from '@/lib/db';
import { account } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

// Gmail API types
interface GmailMessagePart {
    partId?: string;
    mimeType?: string;
    filename?: string;
    headers?: Array<{
        name: string;
        value: string;
    }>;
    body?: {
        attachmentId?: string;
        size?: number;
        data?: string;
    };
    parts?: GmailMessagePart[];
}

interface EmailContent {
    text: string;
    html: string;
}

// Schema definitions for Gmail tools
export const SearchGmailEmailsSchema = z.object({
    query: z.string().describe("Gmail search query (e.g., 'from:example@gmail.com', 'is:unread', 'has:attachment')"),
    maxResults: z.number().optional().default(10).describe("Maximum number of results to return (default: 10, max: 100)"),
});

export const ReadGmailEmailSchema = z.object({
    messageId: z.string().describe("ID of the email message to retrieve"),
});

export const ModifyGmailEmailSchema = z.object({
    messageId: z.string().describe("ID of the email message to modify"),
    addLabelIds: z.array(z.string()).optional().describe("List of label IDs to add to the message"),
    removeLabelIds: z.array(z.string()).optional().describe("List of label IDs to remove from the message"),
});

export const DeleteGmailEmailSchema = z.object({
    messageId: z.string().describe("ID of the email message to delete"),
});

export const ListGmailLabelsSchema = z.object({});

export const CreateGmailLabelSchema = z.object({
    name: z.string().describe("Name for the new label"),
    messageListVisibility: z.enum(['show', 'hide']).optional().describe("Whether to show or hide the label in the message list"),
    labelListVisibility: z.enum(['labelShow', 'labelShowIfUnread', 'labelHide']).optional().describe("Visibility of the label in the label list"),
});

export const UpdateGmailLabelSchema = z.object({
    id: z.string().describe("ID of the label to update"),
    name: z.string().optional().describe("New name for the label"),
    messageListVisibility: z.enum(['show', 'hide']).optional().describe("Whether to show or hide the label in the message list"),
    labelListVisibility: z.enum(['labelShow', 'labelShowIfUnread', 'labelHide']).optional().describe("Visibility of the label in the label list"),
});

export const DeleteGmailLabelSchema = z.object({
    id: z.string().describe("ID of the label to delete"),
});

export const GetOrCreateGmailLabelSchema = z.object({
    name: z.string().describe("Name of the label to get or create"),
    messageListVisibility: z.enum(['show', 'hide']).optional().describe("Whether to show or hide the label in the message list"),
    labelListVisibility: z.enum(['labelShow', 'labelShowIfUnread', 'labelHide']).optional().describe("Visibility of the label in the label list"),
});

export const SendGmailEmailSchema = z.object({
    to: z.array(z.string()).describe("List of recipient email addresses"),
    subject: z.string().describe("Email subject"),
    body: z.string().describe("Email body content"),
    htmlBody: z.string().optional().describe("HTML version of the email body"),
    cc: z.array(z.string()).optional().describe("List of CC recipients"),
    bcc: z.array(z.string()).optional().describe("List of BCC recipients"),
    threadId: z.string().optional().describe("Thread ID to reply to"),
});

export const DraftGmailEmailSchema = z.object({
    to: z.array(z.string()).describe("List of recipient email addresses"),
    subject: z.string().describe("Email subject"),
    body: z.string().describe("Email body content"),
    htmlBody: z.string().optional().describe("HTML version of the email body"),
    cc: z.array(z.string()).optional().describe("List of CC recipients"),
    bcc: z.array(z.string()).optional().describe("List of BCC recipients"),
    threadId: z.string().optional().describe("Thread ID to reply to"),
});

export const BatchModifyGmailEmailsSchema = z.object({
    messageIds: z.array(z.string()).describe("List of message IDs to modify"),
    addLabelIds: z.array(z.string()).optional().describe("List of label IDs to add to all messages"),
    removeLabelIds: z.array(z.string()).optional().describe("List of label IDs to remove from all messages"),
    batchSize: z.number().optional().default(50).describe("Number of messages to process in each batch (default: 50)"),
});

export const BatchDeleteGmailEmailsSchema = z.object({
    messageIds: z.array(z.string()).describe("List of message IDs to delete"),
    batchSize: z.number().optional().default(50).describe("Number of messages to process in each batch (default: 50)"),
});

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

/**
 * Recursively extract email body content from MIME message parts
 */
function extractEmailContent(messagePart: GmailMessagePart): EmailContent {
    let textContent = '';
    let htmlContent = '';

    if (messagePart.body && messagePart.body.data) {
        const content = Buffer.from(messagePart.body.data, 'base64').toString('utf8');

        if (messagePart.mimeType === 'text/plain') {
            textContent = content;
        } else if (messagePart.mimeType === 'text/html') {
            htmlContent = content;
        }
    }

    if (messagePart.parts && messagePart.parts.length > 0) {
        for (const part of messagePart.parts) {
            const { text, html } = extractEmailContent(part);
            if (text) textContent += text;
            if (html) htmlContent += html;
        }
    }

    return { text: textContent, html: htmlContent };
}

/**
 * Create email message in RFC 2822 format
 */
function createEmailMessage(emailData: any): string {
    const lines = [];

    // Add headers
    lines.push(`To: ${emailData.to.join(', ')}`);
    if (emailData.cc && emailData.cc.length > 0) {
        lines.push(`Cc: ${emailData.cc.join(', ')}`);
    }
    if (emailData.bcc && emailData.bcc.length > 0) {
        lines.push(`Bcc: ${emailData.bcc.join(', ')}`);
    }
    lines.push(`Subject: ${emailData.subject}`);

    if (emailData.htmlBody) {
        lines.push('Content-Type: text/html; charset=utf-8');
    } else {
        lines.push('Content-Type: text/plain; charset=utf-8');
    }

    lines.push(''); // Empty line between headers and body
    lines.push(emailData.htmlBody || emailData.body);

    return lines.join('\r\n');
}

/**
 * Search Gmail emails
 */
export async function searchGmailEmails(userId: string, query: string, maxResults: number = 10) {
    const oauth2Client = await getGoogleOAuthClient(userId);
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    const response = await gmail.users.messages.list({
        userId: 'me',
        q: query,
        maxResults: Math.min(maxResults, 100), // Limit to 100 max
    });

    const messages = response.data.messages || [];
    const results = await Promise.all(
        messages.map(async (msg) => {
            const detail = await gmail.users.messages.get({
                userId: 'me',
                id: msg.id!,
                format: 'metadata',
                metadataHeaders: ['Subject', 'From', 'Date', 'To'],
            });
            const headers = detail.data.payload?.headers || [];
            return {
                id: msg.id,
                threadId: msg.threadId,
                subject: headers.find(h => h.name === 'Subject')?.value || '',
                from: headers.find(h => h.name === 'From')?.value || '',
                to: headers.find(h => h.name === 'To')?.value || '',
                date: headers.find(h => h.name === 'Date')?.value || '',
                snippet: detail.data.snippet || '',
            };
        })
    );

    return results;
}

/**
 * Read a specific Gmail email
 */
export async function readGmailEmail(userId: string, messageId: string) {
    const oauth2Client = await getGoogleOAuthClient(userId);
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    const response = await gmail.users.messages.get({
        userId: 'me',
        id: messageId,
        format: 'full',
    });

    const headers = response.data.payload?.headers || [];
    const subject = headers.find(h => h.name?.toLowerCase() === 'subject')?.value || '';
    const from = headers.find(h => h.name?.toLowerCase() === 'from')?.value || '';
    const to = headers.find(h => h.name?.toLowerCase() === 'to')?.value || '';
    const date = headers.find(h => h.name?.toLowerCase() === 'date')?.value || '';
    const threadId = response.data.threadId || '';

    // Extract email content
    const { text, html } = extractEmailContent(response.data.payload as GmailMessagePart || {});
    let body = text || html || '';

    const contentTypeNote = !text && html ?
        '[Note: This email is HTML-formatted. Plain text version not available.]\n\n' : '';

    return {
        id: messageId,
        threadId,
        subject,
        from,
        to,
        date,
        body: contentTypeNote + body,
        labels: response.data.labelIds || [],
    };
}

/**
 * Modify Gmail email labels
 */
export async function modifyGmailEmail(userId: string, messageId: string, addLabelIds?: string[], removeLabelIds?: string[]) {
    const oauth2Client = await getGoogleOAuthClient(userId);
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    const requestBody: any = {};

    if (addLabelIds && addLabelIds.length > 0) {
        requestBody.addLabelIds = addLabelIds;
    }

    if (removeLabelIds && removeLabelIds.length > 0) {
        requestBody.removeLabelIds = removeLabelIds;
    }

    await gmail.users.messages.modify({
        userId: 'me',
        id: messageId,
        requestBody: requestBody,
    });

    return { success: true, messageId };
}

/**
 * Delete Gmail email
 */
export async function deleteGmailEmail(userId: string, messageId: string) {
    const oauth2Client = await getGoogleOAuthClient(userId);
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    await gmail.users.messages.delete({
        userId: 'me',
        id: messageId,
    });

    return { success: true, messageId };
}

/**
 * List Gmail labels
 */
export async function listGmailLabels(userId: string) {
    const oauth2Client = await getGoogleOAuthClient(userId);
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    const response = await gmail.users.labels.list({
        userId: 'me',
    });

    const labels = response.data.labels || [];
    const systemLabels = labels.filter(label => label.type === 'system');
    const userLabels = labels.filter(label => label.type === 'user');

    return {
        system: systemLabels,
        user: userLabels,
        count: {
            total: labels.length,
            system: systemLabels.length,
            user: userLabels.length,
        },
    };
}

/**
 * Create Gmail label
 */
export async function createGmailLabel(userId: string, name: string, options?: { messageListVisibility?: string; labelListVisibility?: string }) {
    const oauth2Client = await getGoogleOAuthClient(userId);
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    const requestBody: any = {
        name,
        messageListVisibility: options?.messageListVisibility || 'show',
        labelListVisibility: options?.labelListVisibility || 'labelShow',
    };

    const response = await gmail.users.labels.create({
        userId: 'me',
        requestBody,
    });

    return response.data;
}

/**
 * Update Gmail label
 */
export async function updateGmailLabel(userId: string, id: string, updates: { name?: string; messageListVisibility?: string; labelListVisibility?: string }) {
    const oauth2Client = await getGoogleOAuthClient(userId);
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    const response = await gmail.users.labels.update({
        userId: 'me',
        id,
        requestBody: updates,
    });

    return response.data;
}

/**
 * Delete Gmail label
 */
export async function deleteGmailLabel(userId: string, id: string) {
    const oauth2Client = await getGoogleOAuthClient(userId);
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    await gmail.users.labels.delete({
        userId: 'me',
        id,
    });

    return { success: true, message: `Label ${id} deleted successfully` };
}

/**
 * Get or create Gmail label
 */
export async function getOrCreateGmailLabel(userId: string, name: string, options?: { messageListVisibility?: string; labelListVisibility?: string }) {
    const oauth2Client = await getGoogleOAuthClient(userId);
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    // First, try to find existing label
    const labelsResponse = await gmail.users.labels.list({
        userId: 'me',
    });

    const existingLabel = labelsResponse.data.labels?.find(label => label.name === name);

    if (existingLabel) {
        return existingLabel;
    }

    // If not found, create new label
    return await createGmailLabel(userId, name, options);
}

/**
 * Send Gmail email
 */
export async function sendGmailEmail(userId: string, emailData: any) {
    const oauth2Client = await getGoogleOAuthClient(userId);
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    const message = createEmailMessage(emailData);
    const encodedMessage = Buffer.from(message).toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

    const messageRequest: any = {
        raw: encodedMessage,
    };

    if (emailData.threadId) {
        messageRequest.threadId = emailData.threadId;
    }

    const response = await gmail.users.messages.send({
        userId: 'me',
        requestBody: messageRequest,
    });

    return response.data;
}

/**
 * Draft Gmail email
 */
export async function draftGmailEmail(userId: string, emailData: any) {
    const oauth2Client = await getGoogleOAuthClient(userId);
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    const message = createEmailMessage(emailData);
    const encodedMessage = Buffer.from(message).toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

    const messageRequest: any = {
        raw: encodedMessage,
    };

    if (emailData.threadId) {
        messageRequest.threadId = emailData.threadId;
    }

    const response = await gmail.users.drafts.create({
        userId: 'me',
        requestBody: {
            message: messageRequest,
        },
    });

    return response.data;
}

/**
 * Batch modify Gmail emails
 */
export async function batchModifyGmailEmails(userId: string, messageIds: string[], addLabelIds?: string[], removeLabelIds?: string[], batchSize: number = 50) {
    const successes: any[] = [];
    const failures: { messageId: string, error: Error }[] = [];

    // Process in batches
    for (let i = 0; i < messageIds.length; i += batchSize) {
        const batch = messageIds.slice(i, i + batchSize);

        for (const messageId of batch) {
            try {
                await modifyGmailEmail(userId, messageId, addLabelIds, removeLabelIds);
                successes.push({ messageId, success: true });
            } catch (error) {
                failures.push({ messageId, error: error as Error });
            }
        }
    }

    return { successes, failures };
}

/**
 * Batch delete Gmail emails
 */
export async function batchDeleteGmailEmails(userId: string, messageIds: string[], batchSize: number = 50) {
    const successes: any[] = [];
    const failures: { messageId: string, error: Error }[] = [];

    // Process in batches
    for (let i = 0; i < messageIds.length; i += batchSize) {
        const batch = messageIds.slice(i, i + batchSize);

        for (const messageId of batch) {
            try {
                await deleteGmailEmail(userId, messageId);
                successes.push({ messageId, success: true });
            } catch (error) {
                failures.push({ messageId, error: error as Error });
            }
        }
    }

    return { successes, failures };
}
