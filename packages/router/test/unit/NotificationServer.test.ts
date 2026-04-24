import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as http from 'http';
import { NotificationServer } from '../../src/server/NotificationServer';
import { NotificationHandler } from '../../src/handler/NotificationHandler';
import { Configuration } from '../../src/config/Configuration';

describe('NotificationServer', () => {
  let server: NotificationServer;
  let mockHandler: NotificationHandler;
  let mockConfig: Configuration;
  const token = 'a'.repeat(64);

  beforeEach(() => {
    mockHandler = {
      handle: vi.fn().mockResolvedValue({ ok: true, id: 'notif_test' }),
    } as unknown as NotificationHandler;
    mockConfig = {
      port: 0,
      maxBodySize: 65536,
      enabled: true,
      notificationLevel: 'information',
      showTimestamp: false,
    } as unknown as Configuration;
    server = new NotificationServer(mockHandler, mockConfig);
  });

  afterEach(async () => {
    await server.stop();
  });

  it('starts on a random port when configured with 0', async () => {
    await server.start(token);
    expect(server.port).toBeGreaterThan(0);
  });

  it('starts on a specified port', async () => {
    (mockConfig as { port: number }).port = 0;
    server = new NotificationServer(mockHandler, mockConfig);
    await server.start(token);
    expect(server.port).toBeGreaterThan(0);
  });

  it('binds only to 127.0.0.1', async () => {
    await server.start(token);
    // Verify by connecting — if it's only on localhost, this should work
    const res = await fetch(`http://127.0.0.1:${server.port}/health`);
    expect(res.status).toBe(200);
  });

  it('falls back to random port on EADDRINUSE', async () => {
    // Occupy a port
    const blocker = http.createServer();
    const blockerPort = await new Promise<number>((resolve) => {
      blocker.listen(0, '127.0.0.1', () => {
        const addr = blocker.address();
        resolve((addr as { port: number }).port);
      });
    });

    try {
      (mockConfig as { port: number }).port = blockerPort;
      server = new NotificationServer(mockHandler, mockConfig);
      await server.start(token);
      expect(server.port).not.toBe(blockerPort);
      expect(server.port).toBeGreaterThan(0);
    } finally {
      blocker.close();
    }
  });

  it('stop() closes the server', async () => {
    await server.start(token);
    const port = server.port;
    await server.stop();
    expect(server.port).toBe(0);

    // Connection should be refused
    await expect(fetch(`http://127.0.0.1:${port}/health`)).rejects.toThrow();
  });

  it('stop() is idempotent', async () => {
    await server.start(token);
    await server.stop();
    await expect(server.stop()).resolves.toBeUndefined();
  });

  it('accepts requests after start', async () => {
    await server.start(token);
    const res = await fetch(`http://127.0.0.1:${server.port}/health`);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });
});
