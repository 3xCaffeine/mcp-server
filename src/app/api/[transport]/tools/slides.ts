import { z } from "zod";
import {
    CreatePresentationSchema,
    GetPresentationSchema,
    BatchUpdatePresentationSchema,
    GetPageSchema,
    GetPageThumbnailSchema,
    createPresentation,
    getPresentation,
    batchUpdatePresentation,
    getPage,
    getPageThumbnail,
} from "@/lib/toolset/google/slides";

export const slidesToolsCapabilities = {
    create_presentation: {
        description: "Create a new Google Slides presentation",
    },
    get_presentation: {
        description: "Get details about a Google Slides presentation",
    },
    batch_update_presentation: {
        description: "Apply batch updates to a Google Slides presentation",
    },
    get_page: {
        description: "Get details about a specific page (slide) in a presentation",
    },
    get_page_thumbnail: {
        description: "Generate a thumbnail URL for a specific page (slide) in a presentation",
    },
};

// Type inference from Zod schemas
type CreatePresentationInput = z.infer<typeof CreatePresentationSchema>;
type GetPresentationInput = z.infer<typeof GetPresentationSchema>;
type BatchUpdatePresentationInput = z.infer<typeof BatchUpdatePresentationSchema>;
type GetPageInput = z.infer<typeof GetPageSchema>;
type GetPageThumbnailInput = z.infer<typeof GetPageThumbnailSchema>;

export function registerSlidesTools(server: any, session: { userId: string; scopes?: string }) {
    // Create presentation
    server.tool(
        "create_presentation",
        "Create a new Google Slides presentation",
        CreatePresentationSchema.shape,
        async ({ userGoogleEmail, title }: CreatePresentationInput) => {
            try {
                const result = await createPresentation(session.userId, userGoogleEmail, title);

                return {
                    content: [{
                        type: "text",
                        text: `Presentation Created Successfully for ${userGoogleEmail}:\n` +
                            `- Title: ${result.title}\n` +
                            `- Presentation ID: ${result.presentationId}\n` +
                            `- URL: ${result.presentationUrl}\n` +
                            `- Slides: ${result.slides.length} slide(s) created`
                    }],
                };
            } catch (error: any) {
                return {
                    content: [{ type: "text", text: `Error creating presentation: ${error.message}` }],
                };
            }
        },
    );

    // Get presentation
    server.tool(
        "get_presentation",
        "Get details about a Google Slides presentation",
        GetPresentationSchema.shape,
        async ({ userGoogleEmail, presentationId }: GetPresentationInput) => {
            try {
                const result = await getPresentation(session.userId, userGoogleEmail, presentationId);

                const slidesInfo = result.slides.map(slide =>
                    `  Slide ${slide.slideNumber}: ID ${slide.slideId}, ${slide.elementCount} element(s)`
                ).join('\n');

                return {
                    content: [{
                        type: "text",
                        text: `Presentation Details for ${userGoogleEmail}:\n` +
                            `- Title: ${result.title}\n` +
                            `- Presentation ID: ${result.presentationId}\n` +
                            `- URL: ${result.presentationUrl}\n` +
                            `- Total Slides: ${result.slidesCount}\n` +
                            `- Page Size: ${result.pageSize.width} x ${result.pageSize.height} ${result.pageSize.unit}\n\n` +
                            `Slides Breakdown:\n` +
                            (slidesInfo || "  No slides found")
                    }],
                };
            } catch (error: any) {
                return {
                    content: [{ type: "text", text: `Error getting presentation: ${error.message}` }],
                };
            }
        },
    );

    // Batch update presentation
    server.tool(
        "batch_update_presentation",
        "Apply batch updates to a Google Slides presentation",
        BatchUpdatePresentationSchema.shape,
        async ({ userGoogleEmail, presentationId, requests }: BatchUpdatePresentationInput) => {
            try {
                const result = await batchUpdatePresentation(session.userId, userGoogleEmail, presentationId, requests);

                let message = `Batch Update Completed for ${userGoogleEmail}:\n` +
                    `- Presentation ID: ${result.presentationId}\n` +
                    `- URL: https://docs.google.com/presentation/d/${result.presentationId}/edit\n` +
                    `- Requests Applied: ${result.requestsApplied}\n` +
                    `- Replies Received: ${result.repliesReceived}`;

                if (result.results.length > 0) {
                    message += "\n\nUpdate Results:";
                    result.results.forEach(reply => {
                        if (reply.type === "createSlide") {
                            message += `\n  Request ${reply.requestNumber}: Created slide with ID ${reply.objectId}`;
                        } else if (reply.type === "createShape") {
                            message += `\n  Request ${reply.requestNumber}: Created shape with ID ${reply.objectId}`;
                        } else {
                            message += `\n  Request ${reply.requestNumber}: Operation completed`;
                        }
                    });
                }

                return {
                    content: [{ type: "text", text: message }],
                };
            } catch (error: any) {
                return {
                    content: [{ type: "text", text: `Error in batch update: ${error.message}` }],
                };
            }
        },
    );

    // Get page
    server.tool(
        "get_page",
        "Get details about a specific page (slide) in a presentation",
        GetPageSchema.shape,
        async ({ userGoogleEmail, presentationId, pageObjectId }: GetPageInput) => {
            try {
                const result = await getPage(session.userId, userGoogleEmail, presentationId, pageObjectId);

                const elementsInfo = result.elements.map(element => {
                    if (element.type === "shape") {
                        return `  Shape: ID ${element.elementId}, Type: ${element.shapeType}`;
                    } else if (element.type === "table") {
                        return `  Table: ID ${element.elementId}, Size: ${element.rows}x${element.columns}`;
                    } else if (element.type === "line") {
                        return `  Line: ID ${element.elementId}, Type: ${element.lineType}`;
                    } else {
                        return `  Element: ID ${element.elementId}, Type: Unknown`;
                    }
                }).join('\n');

                return {
                    content: [{
                        type: "text",
                        text: `Page Details for ${userGoogleEmail}:\n` +
                            `- Presentation ID: ${result.presentationId}\n` +
                            `- Page ID: ${result.pageObjectId}\n` +
                            `- Page Type: ${result.pageType}\n` +
                            `- Total Elements: ${result.elementCount}\n\n` +
                            `Page Elements:\n` +
                            (elementsInfo || "  No elements found")
                    }],
                };
            } catch (error: any) {
                return {
                    content: [{ type: "text", text: `Error getting page: ${error.message}` }],
                };
            }
        },
    );

    // Get page thumbnail
    server.tool(
        "get_page_thumbnail",
        "Generate a thumbnail URL for a specific page (slide) in a presentation",
        GetPageThumbnailSchema.shape,
        async ({ userGoogleEmail, presentationId, pageObjectId, thumbnailSize }: GetPageThumbnailInput) => {
            try {
                const result = await getPageThumbnail(session.userId, userGoogleEmail, presentationId, pageObjectId, thumbnailSize);

                return {
                    content: [{
                        type: "text",
                        text: `Thumbnail Generated for ${userGoogleEmail}:\n` +
                            `- Presentation ID: ${result.presentationId}\n` +
                            `- Page ID: ${result.pageObjectId}\n` +
                            `- Thumbnail Size: ${result.thumbnailSize}\n` +
                            `- Thumbnail URL: ${result.thumbnailUrl}\n\n` +
                            `You can view or download the thumbnail using the provided URL.`
                    }],
                };
            } catch (error: any) {
                return {
                    content: [{ type: "text", text: `Error generating thumbnail: ${error.message}` }],
                };
            }
        },
    );
}
