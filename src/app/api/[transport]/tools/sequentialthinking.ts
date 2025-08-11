import { SequentialThinkingSchema, sequentialThinkingTool } from '@/lib/toolset/sequentialthinking';

export function registerSequentialThinkingTool(server: any, session: { userId: string; scopes?: string }) {
    server.tool(
        "sequentialthinking",
        "A detailed tool for dynamic and reflective problem-solving through thoughts.",
        SequentialThinkingSchema.shape,
        async (input: any) => {
            return {
                content: [{ type: "text", text: await sequentialThinkingTool(session.userId, input) }],
            };
        },
    );
}

export const sequentialThinkingToolsCapabilities = {
    sequentialthinking: {
        description: "A detailed tool for dynamic and reflective problem-solving through thoughts.",
    },
};
