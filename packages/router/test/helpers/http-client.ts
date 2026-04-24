import * as http from 'http';
import { NotificationPayload } from 'remote-notifier-shared';

interface HttpResponse {
  status: number;
  body: string;
}

export async function sendNotification(
  port: number,
  token: string,
  payload: NotificationPayload,
): Promise<{ status: number; body: Record<string, unknown> }> {
  const res = await sendRaw(
    port,
    'POST',
    '/notify',
    {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    JSON.stringify(payload),
  );
  return { status: res.status, body: JSON.parse(res.body) };
}

export async function checkHealth(
  port: number,
): Promise<{ status: number; body: Record<string, unknown> }> {
  const res = await sendRaw(port, 'GET', '/health', {});
  return { status: res.status, body: JSON.parse(res.body) };
}

export function sendRaw(
  port: number,
  method: string,
  path: string,
  headers: Record<string, string>,
  body?: string,
): Promise<HttpResponse> {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port,
        path,
        method,
        headers,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => {
          resolve({
            status: res.statusCode ?? 0,
            body: Buffer.concat(chunks).toString('utf-8'),
          });
        });
      },
    );
    req.on('error', reject);
    if (body) {
      req.write(body);
    }
    req.end();
  });
}
