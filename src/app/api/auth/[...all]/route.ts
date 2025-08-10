import { auth } from "@/lib/auth";
// import { toNextJsHandler } from "better-auth/next-js";

// Custom handler to patch better-auth MCP plugin redirect issue
// Based on: https://github.com/dead8309/better-auth-mcp-hono/blob/7d552642edc0b82171c023c4e7f45983ef6606d2/src/index.ts#L33
const customHandler = async (req: Request) => {
    // Use the standard better-auth handler
    const response = await auth.handler(req);
    
    // Check if this is a callback route that might need redirect patching
    const url = new URL(req.url);
    if (response.status === 200 && url.pathname.includes("/api/auth/callback/")) {
        try {
            // Clone the response to read the body
            const clonedResponse = response.clone();
            const text = await clonedResponse.text();
            
            // Try to parse as JSON
            let jsonData: { redirect?: boolean; url?: string } = {};
            try {
                jsonData = JSON.parse(text);
            } catch {
                // If it's not JSON, return the original response
                return response;
            }
            
            // If the response indicates a redirect should happen, perform it manually
            if (jsonData && jsonData.redirect === true && jsonData.url) {
                return Response.redirect(jsonData.url, 302);
            }
        } catch (error) {
            // If anything goes wrong, fall back to the original response
            console.error("Error processing auth response:", error);
        }
    }
    
    return response;
};

export const POST = customHandler;
export const GET = customHandler;
