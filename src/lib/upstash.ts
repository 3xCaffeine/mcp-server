import { Redis } from '@upstash/redis';

// Singleton Upstash Redis client
export const redis = Redis.fromEnv();
