import type { IncomingHttpHeaders } from 'node:http';

export interface VercelRequest {
  method?: string;
  headers: IncomingHttpHeaders;
  body?: unknown;
  query: Record<string, string | string[] | undefined>;
}

export interface VercelResponse {
  status(statusCode: number): VercelResponse;
  json(body: unknown): VercelResponse;
  redirect(statusCode: number, url: string): VercelResponse;
}
