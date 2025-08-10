import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
    const baseUrl = process.env.BETTER_AUTH_URL || "http://localhost:3000";
    
    return NextResponse.json({
        "resource": `${baseUrl}/api/mcp`,
        "authorization_servers": [
            baseUrl
        ],
        "scopes_supported": [
            "openid",
            "profile", 
            "email",
            "offline_access"
        ],
        "bearer_methods_supported": [
            "header"
        ],
        "resource_documentation": `${baseUrl}/docs`,
        "revocation_endpoint": `${baseUrl}/api/auth/mcp/revoke`
    }, {
        headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'public, max-age=3600'
        }
    });
}
