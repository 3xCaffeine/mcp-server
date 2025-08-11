import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';

export async function GET() {
    try {
        // Check database connectivity
        let dbStatus = 'disconnected';

        try {
            await db.execute(sql`SELECT 1`);
            dbStatus = 'connected';
        } catch (dbError) {
            console.error('Database health check failed:', dbError);
            dbStatus = 'error';
        }

        const healthData = {
            status: dbStatus === 'connected' ? 'healthy' : 'unhealthy',
            services: {
                database: dbStatus,
                mcp: 'active'
            }
        };

        const statusCode = dbStatus === 'connected' ? 200 : 503;

        return NextResponse.json(healthData, { status: statusCode });
    } catch (error) {
        return NextResponse.json(
            {
                status: 'unhealthy',
                services: {
                    database: 'error',
                    mcp: 'error'
                }
            },
            { status: 503 }
        );
    }
}
