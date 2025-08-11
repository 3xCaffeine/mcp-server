import { auth } from "@/lib/auth";
import { createMcpHandler } from "mcp-handler";
import { z } from "zod";

import { registerGmailTools, gmailToolsCapabilities } from "./tools/gmail";
import { registerGdriveTools, gdriveToolsCapabilities } from "./tools/gdrive";
import { registerCalendarTools, calendarToolsCapabilities } from "./tools/calendar";
import { registerSheetsTools, sheetsToolsCapabilities } from "./tools/sheets";


const handler = async (req: Request) => {
    // Get the session using the access token sent from the MCP client
    const session = await auth.api.getMcpSession({
        headers: req.headers
    });

    if (!session) {
        // Return 401 with proper WWW-Authenticate header as per RFC 9728
        const baseUrl = process.env.BETTER_AUTH_URL || "http://localhost:3000";

        return new Response(null, {
            status: 401,
            headers: {
                'WWW-Authenticate': `Bearer realm="${baseUrl}", resource_metadata="${baseUrl}/.well-known/oauth-protected-resource"`
            }
        });
    }

    return createMcpHandler(
        (server) => {
            // Echo tool - simple example tool
            server.tool(
                "echo",
                "Echo a message back to the user",
                { message: z.string() },
                async ({ message }) => {
                    return {
                        content: [{ type: "text", text: `Echo: ${message}` }],
                    };
                },
            );

            // User info tool - demonstrates access to user session
            // TODO: this should also give the user email
            server.tool(
                "get_user_info",
                "Get information about the authenticated user",
                {},
                async () => {
                    return {
                        content: [{
                            type: "text",
                            text: `User ID: ${session.userId}\nScopes: ${session.scopes || 'none'}`
                        }],
                    };
                },
            );

            // Roll dice tool - fun example
            server.tool(
                "roll_dice",
                "Roll an N-sided die",
                { sides: z.number().int().min(2).default(6) },
                async ({ sides }) => {
                    const value = 1 + Math.floor(Math.random() * sides);
                    return {
                        content: [{ type: "text", text: `🎲 You rolled a ${value} on a ${sides}-sided die!` }],
                    };
                },
            );

            // Register Gmail tools
            registerGmailTools(server, session);
            // Register Google Drive tools
            registerGdriveTools(server, session);
            // Register Google Calendar tools
            registerCalendarTools(server, session);
            // Register Google Sheets tools
            registerSheetsTools(server, session);
        },
        {
            capabilities: {
                tools: {
                    echo: {
                        description: "Echo a message back to the user",
                    },
                    get_user_info: {
                        description: "Get information about the authenticated user",
                    },
                    roll_dice: {
                        description: "Roll an N-sided die",
                    },
                    ...gmailToolsCapabilities,
                    ...gdriveToolsCapabilities,
                    ...calendarToolsCapabilities,
                    ...sheetsToolsCapabilities,
                },
            },
        },
        {
            basePath: "/api",
            verboseLogs: true,
            maxDuration: 60,
        },
    )(req);
};

export { handler as GET, handler as POST, handler as DELETE };
