import { z } from "zod";
import { google } from "googleapis";
import { getGoogleOAuthClient } from "../googleoauth-client";

// Zod Schema definitions for Google Slides tools
export const CreatePresentationSchema = z.object({
    userGoogleEmail: z.string().email().describe("The user's Google email address"),
    title: z.string().optional().default("Untitled Presentation").describe("The title for the new presentation"),
});

export const GetPresentationSchema = z.object({
    userGoogleEmail: z.string().email().describe("The user's Google email address"),
    presentationId: z.string().describe("The ID of the presentation to retrieve"),
});

export const BatchUpdatePresentationSchema = z.object({
    userGoogleEmail: z.string().email().describe("The user's Google email address"),
    presentationId: z.string().describe("The ID of the presentation to update"),
    requests: z.array(z.record(z.any())).describe("List of update requests to apply"),
});

export const GetPageSchema = z.object({
    userGoogleEmail: z.string().email().describe("The user's Google email address"),
    presentationId: z.string().describe("The ID of the presentation"),
    pageObjectId: z.string().describe("The object ID of the page/slide to retrieve"),
});

export const GetPageThumbnailSchema = z.object({
    userGoogleEmail: z.string().email().describe("The user's Google email address"),
    presentationId: z.string().describe("The ID of the presentation"),
    pageObjectId: z.string().describe("The object ID of the page/slide"),
    thumbnailSize: z.enum(["LARGE", "MEDIUM", "SMALL"]).optional().default("MEDIUM").describe("Size of thumbnail"),
});

/**
 * Create a new Google Slides presentation
 */
export async function createPresentation(userId: string, userGoogleEmail: string, title: string = "Untitled Presentation") {
    const oauth2Client = await getGoogleOAuthClient(userId);
    const slides = google.slides({ version: 'v1', auth: oauth2Client });

    const body = {
        title: title,
    };

    const response = await slides.presentations.create({
        requestBody: body,
    });

    const presentation = response.data;
    return {
        presentationId: presentation.presentationId,
        title: presentation.title,
        slides: presentation.slides || [],
        presentationUrl: `https://docs.google.com/presentation/d/${presentation.presentationId}/edit`,
    };
}

/**
 * Get details about a Google Slides presentation
 */
export async function getPresentation(userId: string, userGoogleEmail: string, presentationId: string) {
    const oauth2Client = await getGoogleOAuthClient(userId);
    const slides = google.slides({ version: 'v1', auth: oauth2Client });

    const response = await slides.presentations.get({
        presentationId: presentationId,
    });

    const presentation = response.data;
    const slidesData = presentation.slides || [];
    const pageSize = presentation.pageSize || {};

    const slidesInfo = slidesData.map((slide, index) => {
        const slideId = slide.objectId || "Unknown";
        const pageElements = slide.pageElements || [];
        return {
            slideNumber: index + 1,
            slideId,
            elementCount: pageElements.length,
        };
    });

    return {
        title: presentation.title || "Untitled",
        presentationId,
        presentationUrl: `https://docs.google.com/presentation/d/${presentationId}/edit`,
        slidesCount: slidesData.length,
        pageSize: {
            width: pageSize.width?.magnitude || "Unknown",
            height: pageSize.height?.magnitude || "Unknown",
            unit: pageSize.width?.unit || "",
        },
        slides: slidesInfo,
    };
}

/**
 * Apply batch updates to a Google Slides presentation
 */
export async function batchUpdatePresentation(userId: string, userGoogleEmail: string, presentationId: string, requests: any[]) {
    const oauth2Client = await getGoogleOAuthClient(userId);
    const slides = google.slides({ version: 'v1', auth: oauth2Client });

    const body = {
        requests: requests,
    };

    const response = await slides.presentations.batchUpdate({
        presentationId: presentationId,
        requestBody: body,
    });

    const replies = response.data.replies || [];

    const results = replies.map((reply, index) => {
        const result: any = { requestNumber: index + 1 };

        if (reply.createSlide) {
            result.type = "createSlide";
            result.objectId = reply.createSlide.objectId;
        } else if (reply.createShape) {
            result.type = "createShape";
            result.objectId = reply.createShape.objectId;
        } else {
            result.type = "operation";
            result.status = "completed";
        }

        return result;
    });

    return {
        presentationId,
        requestsApplied: requests.length,
        repliesReceived: replies.length,
        results,
    };
}

/**
 * Get details about a specific page (slide) in a presentation
 */
export async function getPage(userId: string, userGoogleEmail: string, presentationId: string, pageObjectId: string) {
    const oauth2Client = await getGoogleOAuthClient(userId);
    const slides = google.slides({ version: 'v1', auth: oauth2Client });

    const response = await slides.presentations.pages.get({
        presentationId: presentationId,
        pageObjectId: pageObjectId,
    });

    const page = response.data;
    const pageElements = page.pageElements || [];

    const elementsInfo = pageElements.map(element => {
        const elementId = element.objectId || "Unknown";

        if (element.shape) {
            return {
                type: "shape",
                elementId,
                shapeType: element.shape.shapeType || "Unknown",
            };
        } else if (element.table) {
            return {
                type: "table",
                elementId,
                rows: element.table.rows || 0,
                columns: element.table.columns || 0,
            };
        } else if (element.line) {
            return {
                type: "line",
                elementId,
                lineType: element.line.lineType || "Unknown",
            };
        } else {
            return {
                type: "unknown",
                elementId,
            };
        }
    });

    return {
        presentationId,
        pageObjectId,
        pageType: page.pageType || "Unknown",
        elementCount: pageElements.length,
        elements: elementsInfo,
    };
}

/**
 * Generate a thumbnail URL for a specific page (slide) in a presentation
 */
export async function getPageThumbnail(userId: string, userGoogleEmail: string, presentationId: string, pageObjectId: string, thumbnailSize: "LARGE" | "MEDIUM" | "SMALL" = "MEDIUM") {
    const oauth2Client = await getGoogleOAuthClient(userId);
    const slides = google.slides({ version: 'v1', auth: oauth2Client });

    const response = await slides.presentations.pages.getThumbnail({
        presentationId: presentationId,
        pageObjectId: pageObjectId,
        'thumbnailProperties.thumbnailSize': thumbnailSize,
        'thumbnailProperties.mimeType': 'PNG',
    });

    return {
        presentationId,
        pageObjectId,
        thumbnailSize,
        thumbnailUrl: response.data.contentUrl || "",
    };
}
