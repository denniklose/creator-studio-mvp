export function externalServicesEnabled(): boolean {
  return process.env.EXTERNAL_SERVICES_ENABLED === 'true';
}

export function requiredServerEnv(...names: string[]): Record<string, string> {
  const missing = names.filter((name) => !process.env[name]?.trim());
  if (missing.length > 0) {
    throw new Error(`MISSING_SERVER_CONFIG:${missing.join(',')}`);
  }

  return Object.fromEntries(names.map((name) => [name, process.env[name]!.trim()]));
}

export function appBaseUrl(): string {
  return process.env.APP_BASE_URL?.trim().replace(/\/$/, '') || 'http://localhost:3000';
}
