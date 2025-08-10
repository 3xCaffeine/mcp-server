import { z } from "zod";
import {
    SearchGmailEmailsSchema,
    ReadGmailEmailSchema,
    ModifyGmailEmailSchema,
    DeleteGmailEmailSchema,
    ListGmailLabelsSchema,
    CreateGmailLabelSchema,
    UpdateGmailLabelSchema,
    DeleteGmailLabelSchema,
    GetOrCreateGmailLabelSchema,
    SendGmailEmailSchema,
    DraftGmailEmailSchema,
    BatchModifyGmailEmailsSchema,
    BatchDeleteGmailEmailsSchema,
    searchGmailEmails,
    readGmailEmail,
    modifyGmailEmail,
    deleteGmailEmail,
    listGmailLabels,
    createGmailLabel,
    updateGmailLabel,
    deleteGmailLabel,
    getOrCreateGmailLabel,
    sendGmailEmail,
    draftGmailEmail,
    batchModifyGmailEmails,
    batchDeleteGmailEmails,
} from "@/lib/toolset/google/gmail";

// Type inference from Zod schemas
type SearchGmailEmailsInput = z.infer<typeof SearchGmailEmailsSchema>;
type ReadGmailEmailInput = z.infer<typeof ReadGmailEmailSchema>;
type ModifyGmailEmailInput = z.infer<typeof ModifyGmailEmailSchema>;
type DeleteGmailEmailInput = z.infer<typeof DeleteGmailEmailSchema>;
type CreateGmailLabelInput = z.infer<typeof CreateGmailLabelSchema>;
type UpdateGmailLabelInput = z.infer<typeof UpdateGmailLabelSchema>;
type DeleteGmailLabelInput = z.infer<typeof DeleteGmailLabelSchema>;
type GetOrCreateGmailLabelInput = z.infer<typeof GetOrCreateGmailLabelSchema>;
type SendGmailEmailInput = z.infer<typeof SendGmailEmailSchema>;
type DraftGmailEmailInput = z.infer<typeof DraftGmailEmailSchema>;
type BatchModifyGmailEmailsInput = z.infer<typeof BatchModifyGmailEmailsSchema>;
type BatchDeleteGmailEmailsInput = z.infer<typeof BatchDeleteGmailEmailsSchema>;

export function registerGmailTools(server: any, session: { userId: string; scopes?: string }) {
    // Search Gmail emails
    server.tool(
        "search_gmail_emails",
        "Search emails using Gmail query syntax",
        SearchGmailEmailsSchema.shape,
        async ({ query, maxResults }: SearchGmailEmailsInput) => {
            try {
                const results = await searchGmailEmails(session.userId, query, maxResults);

                if (results.length === 0) {
                    return {
                        content: [{ type: "text", text: `No emails found for query: "${query}"` }],
                    };
                }

                const emailsText = results.map(email =>
                    `ID: ${email.id}\n` +
                    `Thread ID: ${email.threadId}\n` +
                    `Subject: ${email.subject}\n` +
                    `From: ${email.from}\n` +
                    `To: ${email.to}\n` +
                    `Date: ${email.date}\n` +
                    `Snippet: ${email.snippet}\n`
                ).join('\n---\n');

                return {
                    content: [{
                        type: "text",
                        text: `Found ${results.length} emails for query: "${query}"\n\n${emailsText}`
                    }],
                };
            } catch (error: any) {
                return {
                    content: [{ type: "text", text: `Error searching emails: ${error.message}` }],
                };
            }
        },
    );

    // Read Gmail email
    server.tool(
        "read_gmail_email",
        "Read an email by its message ID",
        ReadGmailEmailSchema.shape,
        async ({ messageId }: ReadGmailEmailInput) => {
            try {
                const email = await readGmailEmail(session.userId, messageId);

                return {
                    content: [{
                        type: "text",
                        text: `Email Details:\n` +
                            `ID: ${email.id}\n` +
                            `Thread ID: ${email.threadId}\n` +
                            `Subject: ${email.subject}\n` +
                            `From: ${email.from}\n` +
                            `To: ${email.to}\n` +
                            `Date: ${email.date}\n` +
                            `Labels: ${email.labels.join(', ')}\n\n` +
                            `Body:\n${email.body}`
                    }],
                };
            } catch (error: any) {
                return {
                    content: [{ type: "text", text: `Error reading email: ${error.message}` }],
                };
            }
        },
    );

    // Modify Gmail email labels
    server.tool(
        "modify_gmail_email",
        "Modify email labels",
        ModifyGmailEmailSchema.shape,
        async ({ messageId, addLabelIds, removeLabelIds }: ModifyGmailEmailInput) => {
            try {
                await modifyGmailEmail(session.userId, messageId, addLabelIds, removeLabelIds);

                return {
                    content: [{
                        type: "text",
                        text: `Email ${messageId} labels updated successfully`
                    }],
                };
            } catch (error: any) {
                return {
                    content: [{ type: "text", text: `Error modifying email: ${error.message}` }],
                };
            }
        },
    );

    // Delete Gmail email
    server.tool(
        "delete_gmail_email",
        "Delete an email by its message ID",
        DeleteGmailEmailSchema.shape,
        async ({ messageId }: DeleteGmailEmailInput) => {
            try {
                await deleteGmailEmail(session.userId, messageId);

                return {
                    content: [{
                        type: "text",
                        text: `Email ${messageId} deleted successfully`
                    }],
                };
            } catch (error: any) {
                return {
                    content: [{ type: "text", text: `Error deleting email: ${error.message}` }],
                };
            }
        },
    );

    // List Gmail labels
    server.tool(
        "list_gmail_labels",
        "List all Gmail labels",
        ListGmailLabelsSchema.shape,
        async () => {
            try {
                const labelResults = await listGmailLabels(session.userId);

                return {
                    content: [{
                        type: "text",
                        text: `Found ${labelResults.count.total} labels (${labelResults.count.system} system, ${labelResults.count.user} user):\n\n` +
                            "System Labels:\n" +
                            labelResults.system.map(l => `ID: ${l.id}, Name: ${l.name}`).join('\n') +
                            "\n\nUser Labels:\n" +
                            labelResults.user.map(l => `ID: ${l.id}, Name: ${l.name}`).join('\n')
                    }],
                };
            } catch (error: any) {
                return {
                    content: [{ type: "text", text: `Error listing labels: ${error.message}` }],
                };
            }
        },
    );

    // Create Gmail label
    server.tool(
        "create_gmail_label",
        "Create a new Gmail label",
        CreateGmailLabelSchema.shape,
        async ({ name, messageListVisibility, labelListVisibility }: CreateGmailLabelInput) => {
            try {
                const result = await createGmailLabel(session.userId, name, {
                    messageListVisibility,
                    labelListVisibility,
                });

                return {
                    content: [{
                        type: "text",
                        text: `Label created successfully:\nID: ${result.id}\nName: ${result.name}\nType: ${result.type}`
                    }],
                };
            } catch (error: any) {
                return {
                    content: [{ type: "text", text: `Error creating label: ${error.message}` }],
                };
            }
        },
    );

    // Update Gmail label
    server.tool(
        "update_gmail_label",
        "Update an existing Gmail label",
        UpdateGmailLabelSchema.shape,
        async ({ id, name, messageListVisibility, labelListVisibility }: UpdateGmailLabelInput) => {
            try {
                const updates: any = {};
                if (name) updates.name = name;
                if (messageListVisibility) updates.messageListVisibility = messageListVisibility;
                if (labelListVisibility) updates.labelListVisibility = labelListVisibility;

                const result = await updateGmailLabel(session.userId, id, updates);

                return {
                    content: [{
                        type: "text",
                        text: `Label updated successfully:\nID: ${result.id}\nName: ${result.name}\nType: ${result.type}`
                    }],
                };
            } catch (error: any) {
                return {
                    content: [{ type: "text", text: `Error updating label: ${error.message}` }],
                };
            }
        },
    );

    // Delete Gmail label
    server.tool(
        "delete_gmail_label",
        "Delete a Gmail label",
        DeleteGmailLabelSchema.shape,
        async ({ id }: DeleteGmailLabelInput) => {
            try {
                const result = await deleteGmailLabel(session.userId, id);

                return {
                    content: [{
                        type: "text",
                        text: result.message
                    }],
                };
            } catch (error: any) {
                return {
                    content: [{ type: "text", text: `Error deleting label: ${error.message}` }],
                };
            }
        },
    );

    // Get or create Gmail label
    server.tool(
        "get_or_create_gmail_label",
        "Get an existing label or create it if it doesn't exist",
        GetOrCreateGmailLabelSchema.shape,
        async ({ name, messageListVisibility, labelListVisibility }: GetOrCreateGmailLabelInput) => {
            try {
                const result = await getOrCreateGmailLabel(session.userId, name, {
                    messageListVisibility,
                    labelListVisibility,
                });

                const action = result.type === 'user' && result.name === name ? 'found existing' : 'created new';

                return {
                    content: [{
                        type: "text",
                        text: `Successfully ${action} label:\nID: ${result.id}\nName: ${result.name}\nType: ${result.type}`
                    }],
                };
            } catch (error: any) {
                return {
                    content: [{ type: "text", text: `Error getting/creating label: ${error.message}` }],
                };
            }
        },
    );

    // Send Gmail email
    server.tool(
        "send_gmail_email",
        "Send an email using Gmail API with advanced options",
        SendGmailEmailSchema.shape,
        async ({ to, subject, body, htmlBody, cc, bcc, threadId }: SendGmailEmailInput) => {
            try {
                const result = await sendGmailEmail(session.userId, {
                    to, subject, body, htmlBody, cc, bcc, threadId
                });

                return {
                    content: [{
                        type: "text",
                        text: `Email sent successfully with ID: ${result.id}`
                    }],
                };
            } catch (error: any) {
                return {
                    content: [{ type: "text", text: `Error sending email: ${error.message}` }],
                };
            }
        },
    );

    // Draft Gmail email
    server.tool(
        "draft_gmail_email",
        "Create a draft email using Gmail API",
        DraftGmailEmailSchema.shape,
        async ({ to, subject, body, htmlBody, cc, bcc, threadId }: DraftGmailEmailInput) => {
            try {
                const result = await draftGmailEmail(session.userId, {
                    to, subject, body, htmlBody, cc, bcc, threadId
                });

                return {
                    content: [{
                        type: "text",
                        text: `Email draft created successfully with ID: ${result.id}`
                    }],
                };
            } catch (error: any) {
                return {
                    content: [{ type: "text", text: `Error creating draft: ${error.message}` }],
                };
            }
        },
    );

    // Batch modify Gmail emails
    server.tool(
        "batch_modify_gmail_emails",
        "Modify multiple emails at once",
        BatchModifyGmailEmailsSchema.shape,
        async ({ messageIds, addLabelIds, removeLabelIds, batchSize }: BatchModifyGmailEmailsInput) => {
            try {
                const { successes, failures } = await batchModifyGmailEmails(
                    session.userId,
                    messageIds,
                    addLabelIds,
                    removeLabelIds,
                    batchSize
                );

                let resultText = `Batch label modification complete.\n`;
                resultText += `Successfully processed: ${successes.length} messages\n`;

                if (failures.length > 0) {
                    resultText += `Failed to process: ${failures.length} messages\n\n`;
                    resultText += `Failed message IDs:\n`;
                    resultText += failures.map(f => `- ${f.messageId.substring(0, 16)}... (${f.error.message})`).join('\n');
                }

                return {
                    content: [{ type: "text", text: resultText }],
                };
            } catch (error: any) {
                return {
                    content: [{ type: "text", text: `Error in batch modify: ${error.message}` }],
                };
            }
        },
    );

    // Batch delete Gmail emails
    server.tool(
        "batch_delete_gmail_emails",
        "Delete multiple emails at once",
        BatchDeleteGmailEmailsSchema.shape,
        async ({ messageIds, batchSize }: BatchDeleteGmailEmailsInput) => {
            try {
                const { successes, failures } = await batchDeleteGmailEmails(
                    session.userId,
                    messageIds,
                    batchSize
                );

                let resultText = `Batch delete operation complete.\n`;
                resultText += `Successfully deleted: ${successes.length} messages\n`;

                if (failures.length > 0) {
                    resultText += `Failed to delete: ${failures.length} messages\n\n`;
                    resultText += `Failed message IDs:\n`;
                    resultText += failures.map(f => `- ${f.messageId.substring(0, 16)}... (${f.error.message})`).join('\n');
                }

                return {
                    content: [{ type: "text", text: resultText }],
                };
            } catch (error: any) {
                return {
                    content: [{ type: "text", text: `Error in batch delete: ${error.message}` }],
                };
            }
        },
    );
}

export const gmailToolsCapabilities = {
    search_gmail_emails: {
        description: "Search emails using Gmail query syntax",
    },
    read_gmail_email: {
        description: "Read an email by its message ID",
    },
    modify_gmail_email: {
        description: "Modify email labels",
    },
    delete_gmail_email: {
        description: "Delete an email by its message ID",
    },
    list_gmail_labels: {
        description: "List all Gmail labels",
    },
    create_gmail_label: {
        description: "Create a new Gmail label",
    },
    update_gmail_label: {
        description: "Update an existing Gmail label",
    },
    delete_gmail_label: {
        description: "Delete a Gmail label",
    },
    get_or_create_gmail_label: {
        description: "Get an existing label or create it if it doesn't exist",
    },
    send_gmail_email: {
        description: "Send an email using Gmail API with advanced options",
    },
    draft_gmail_email: {
        description: "Create a draft email using Gmail API",
    },
    batch_modify_gmail_emails: {
        description: "Modify multiple emails at once",
    },
    batch_delete_gmail_emails: {
        description: "Delete multiple emails at once",
    },
};
