import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Health Check Endpoint
 * 
 * Returns the health status of the application and its dependencies.
 * Useful for:
 * - Monitoring services (UptimeRobot, Vercel Analytics)
 * - Load balancer health checks
 * - Debugging deployment issues
 * 
 * GET /api/health
 */
export async function GET() {
  const startTime = Date.now();
  
  const health: {
    status: 'healthy' | 'degraded' | 'unhealthy';
    timestamp: string;
    version: string;
    uptime: number;
    checks: {
      database: { status: string; latency?: number; error?: string };
      environment: { status: string; missing?: string[] };
    };
  } = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '0.1.0',
    uptime: process.uptime(),
    checks: {
      database: { status: 'unknown' },
      environment: { status: 'ok' },
    },
  };

  // Check required environment variables
  const requiredEnvVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
  ];
  
  const missingEnvVars = requiredEnvVars.filter(
    (envVar) => !process.env[envVar]
  );
  
  if (missingEnvVars.length > 0) {
    health.status = 'unhealthy';
    health.checks.environment = {
      status: 'error',
      missing: missingEnvVars,
    };
  }

  // Check database connection
  try {
    const dbStartTime = Date.now();
    const supabase = await createClient();
    
    // Simple query to check connection
    const { error } = await supabase
      .from('games')
      .select('id')
      .limit(1);
    
    const dbLatency = Date.now() - dbStartTime;
    
    if (error) {
      health.status = 'degraded';
      health.checks.database = {
        status: 'error',
        latency: dbLatency,
        error: error.message,
      };
    } else {
      health.checks.database = {
        status: 'ok',
        latency: dbLatency,
      };
    }
  } catch (error) {
    health.status = 'unhealthy';
    health.checks.database = {
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }

  // Determine HTTP status code
  const httpStatus = health.status === 'healthy' ? 200 : 
                     health.status === 'degraded' ? 200 : 503;

  return NextResponse.json(health, {
    status: httpStatus,
    headers: {
      'Cache-Control': 'no-store, max-age=0',
    },
  });
}
