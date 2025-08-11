
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin, mcp } from "better-auth/plugins";
import { db } from "./db";
import * as schema from "./db/schema";

export const auth = betterAuth({
    database: drizzleAdapter(db, {
        provider: "pg", // PostgreSQL
        schema,
    }),
    emailAndPassword: {
        enabled: false,
    },
    socialProviders: {
        google: {
            clientId: process.env.GOOGLE_CLIENT_ID as string,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
            accessType: "offline", // Always get refresh token
            prompt: "select_account+consent", // Always ask for consent
            scope: [
                "openid",
                "email",
                "profile",
                // Gmail scopes
                "https://www.googleapis.com/auth/gmail.modify",
                "https://www.googleapis.com/auth/gmail.settings.basic",
                "https://www.googleapis.com/auth/userinfo.email",
                "https://www.googleapis.com/auth/userinfo.profile",
                "https://www.googleapis.com/auth/gmail.send",
                "https://mail.google.com/",
                "https://www.googleapis.com/auth/gmail.compose",
                // Drive scopes
                "https://www.googleapis.com/auth/drive.readonly",
                "https://www.googleapis.com/auth/drive",
                "https://www.googleapis.com/auth/drive.file",
                // Calendar scopes
                "https://www.googleapis.com/auth/calendar",
                "https://www.googleapis.com/auth/calendar.events",
                "https://www.googleapis.com/auth/calendar.readonly",
                "https://www.googleapis.com/auth/calendar.events.readonly",
                // Sheets scopes
                "https://www.googleapis.com/auth/spreadsheets",
                "https://www.googleapis.com/auth/spreadsheets.readonly",
                // Slides scopes
                "https://www.googleapis.com/auth/presentations",
                "https://www.googleapis.com/auth/presentations.readonly",
                // Tasks scopes
                "https://www.googleapis.com/auth/tasks",
                "https://www.googleapis.com/auth/tasks.readonly",
                "https://www.googleapis.com/auth/calendar.events.readonly",
                // Forms scopes
                "https://www.googleapis.com/auth/forms.body",
                "https://www.googleapis.com/auth/forms.body.readonly",
                "https://www.googleapis.com/auth/forms.responses.readonly",
                // Docs scopes
                'https://www.googleapis.com/auth/documents',
                "https://www.googleapis.com/auth/documents.readonly",
            ],
        },
    },
    plugins: [
        admin(),
        mcp({
            loginPage: "/auth" // path to your login page
        })
    ]
});
