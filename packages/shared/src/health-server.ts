// ============================================
// StreamZ - Worker Health Check Server
// ============================================
// Lightweight HTTP server for k8s/container health checks.

import { createServer, type Server } from 'http';

const START_TIME = Date.now();

// Read version from env or default
const VERSION = process.env.npm_package_version || process.env.APP_VERSION || '0.1.0';

export interface HealthCheckResponse {
  status: 'ok';
  worker: string;
  uptime: number;
  timestamp: string;
  version: string;
}

/**
 * Start a health check HTTP server on the given port.
 * Returns GET /health with status, worker name, uptime, and version.
 * Gracefully shuts down on SIGTERM.
 */
export function startHealthServer(port: number, workerName: string): Server {
  const server = createServer((req, res) => {
    if (req.method === 'GET' && req.url === '/health') {
      const response: HealthCheckResponse = {
        status: 'ok',
        worker: workerName,
        uptime: Math.floor((Date.now() - START_TIME) / 1000),
        timestamp: new Date().toISOString(),
        version: VERSION,
      };
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(response));
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not found' }));
    }
  });

  server.listen(port, () => {
    console.log(`[Health] Health check server listening on port ${port} for worker: ${workerName}`);
  });

  // Graceful shutdown on SIGTERM
  process.on('SIGTERM', () => {
    console.log(`[Health] SIGTERM received, closing health server for ${workerName}`);
    server.close();
  });

  return server;
}
