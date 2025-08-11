import { auth } from "@/lib/auth";
import { createMcpHandler } from "mcp-handler";
import { z } from "zod";
import { getUserById } from "@/lib/db/getUserById";


import { registerGmailTools, gmailToolsCapabilities } from "./tools/gmail";
import { registerGdriveTools, gdriveToolsCapabilities } from "./tools/gdrive";
import { registerCalendarTools, calendarToolsCapabilities } from "./tools/calendar";
import { registerSheetsTools, sheetsToolsCapabilities } from "./tools/sheets";
import { registerSlidesTools, slidesToolsCapabilities } from "./tools/slides";
import { registerTasksTools, tasksToolsCapabilities } from "./tools/tasks";
import { registerMemoryTools, memoryToolsCapabilities } from "./tools/memory";
import { registerSequentialThinkingTool, sequentialThinkingToolsCapabilities } from "./tools/sequentialthinking";
import { registerFormsTools, formsToolsCapabilities } from "./tools/gforms";
import { registerDocsTools, docsToolsCapabilities } from "./tools/gdocs";

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
            server.tool(
                "get_user_info",
                "Get information about the authenticated user",
                {},
                async () => {
                    // Fetch user info from DB
                    const userId = session.userId;
                    let userInfoText = `User ID: ${userId}\n`;
                    let name = "Unknown", email = "Unknown", image = "", emailVerified = "", role = "", banned = "", createdAt = "";
                    if (userId) {
                        const user = await getUserById(userId);
                        if (user) {
                            name = user.name || "Unknown";
                            email = user.email || "Unknown";
                            emailVerified = user.emailVerified !== undefined ? String(user.emailVerified) : "";
                            role = user.role || "";
                            banned = user.banned !== undefined ? String(user.banned) : "";
                            createdAt = user.createdAt ? new Date(user.createdAt).toLocaleString() : "";
                        }
                    }
                    userInfoText += `Name: ${name}\nEmail: ${email}\nImage: ${image}\nEmail Verified: ${emailVerified}\nRole: ${role}\nBanned: ${banned}\nCreated At: ${createdAt}\n`;
                    // Session info
                    userInfoText += `Session Scopes: ${session.scopes || "none"}`;
                    return {
                        content: [
                            {
                                type: "text",
                                text: userInfoText
                            }
                        ]
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

            // Validate tool - returns phone number in {country_code}{number} format from env
            server.tool(
                "validate",
                "Validate and format a phone number from environment variables",
                {},
                async () => {
                    // Get phone number and country code from environment variables
                    const number = process.env.PHONE_NUMBER || "";
                    const country_code = process.env.COUNTRY_CODE || "+1";

                    // Remove any non-digit characters from the number
                    const cleanNumber = number.replace(/\D/g, '');
                    const formattedNumber = `${country_code}${cleanNumber}`;

                    return {
                        content: [{
                            type: "text",
                            text: formattedNumber
                        }],
                    };
                },
            );

            // About tool - returns server name and description
            server.tool(
                "about",
                "Get information about this MCP server",
                {},
                async () => {
                    const serverInfo = {
                        name: "VaultAssist MCP",
                        description: "A secure OAuth 2.1 Model Context Protocol (MCP) server providing advanced tools for Google services, memory graph, and sequential thinking capabilities."
                    };

                    return {
                        content: [{
                            type: "text",
                            text: JSON.stringify(serverInfo, null, 2)
                        }],
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
            // Register Google Slides tools
            registerSlidesTools(server, session);
            // Register Google Tasks tools
            registerTasksTools(server, session);
            // Register Memory tools
            registerMemoryTools(server, session);
            // Register Sequential Thinking tool
            registerSequentialThinkingTool(server, session);
            // Register Google Forms tools
            registerFormsTools(server, session);
            registerDocsTools(server, session); // ✅ NEW!
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
                    validate: {
                        description: "Validate and format a phone number from environment variables",
                    },
                    about: {
                        description: "Get information about this MCP server",
                    },
                    ...gmailToolsCapabilities,
                    ...gdriveToolsCapabilities,
                    ...calendarToolsCapabilities,
                    ...sheetsToolsCapabilities,
                    ...slidesToolsCapabilities,
                    ...tasksToolsCapabilities,
                    ...memoryToolsCapabilities,
                    ...sequentialThinkingToolsCapabilities,
                    ...formsToolsCapabilities,
                    ...docsToolsCapabilities,
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
