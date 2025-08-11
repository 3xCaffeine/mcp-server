import { z } from "zod";
import { redis } from '@/lib/upstash';

// Define the input schema for the sequential thinking tool
export const SequentialThinkingSchema = z.object({
    thought: z.string().describe("Your current thinking step"),
    nextThoughtNeeded: z.boolean().describe("Whether another thought step is needed"),
    thoughtNumber: z.number().int().min(1).describe("Current thought number"),
    totalThoughts: z.number().int().min(1).describe("Estimated total thoughts needed"),
    isRevision: z.boolean().optional().describe("Whether this revises previous thinking"),
    revisesThought: z.number().int().min(1).optional().describe("Which thought is being reconsidered"),
    branchFromThought: z.number().int().min(1).optional().describe("Branching point thought number"),
    branchId: z.string().optional().describe("Branch identifier"),
    needsMoreThoughts: z.boolean().optional().describe("If more thoughts are needed"),
});

export type ThoughtData = z.infer<typeof SequentialThinkingSchema>;
type SequentialState = {
    thoughtHistory: ThoughtData[];
    branches: Record<string, ThoughtData[]>;
};

const getStateKey = (userId: string) => `sequentialthinking:${userId}`;

export async function sequentialThinkingTool(userId: string, input: ThoughtData) {
    const key = getStateKey(userId);
    // Load state from Redis
    let state: SequentialState | null = null;
    try {
        const raw = await redis.get(key);
        if (raw) {
            state = typeof raw === 'string' ? JSON.parse(raw) : raw;
        }
    } catch (e) {
        // ignore, treat as no state
    }
    if (!state) {
        state = { thoughtHistory: [], branches: {} };
    }

    // Update state
    state.thoughtHistory.push(input);
    if (input.branchFromThought && input.branchId) {
        if (!state.branches[input.branchId]) {
            state.branches[input.branchId] = [];
        }
        state.branches[input.branchId].push(input);
    }

    // Persist state to Redis
    await redis.set(key, JSON.stringify(state));

    return JSON.stringify({
        received: input,
        thoughtHistoryLength: state.thoughtHistory.length,
        branches: Object.keys(state.branches),
        message: "Sequential thinking processed and persisted via Upstash Redis."
    }, null, 2);
}
