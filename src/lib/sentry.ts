import * as Sentry from '@sentry/node';
import os from 'os';

export function initSentry(dsn: string | undefined): void {
  if (!dsn) return;
  Sentry.init({
    dsn,
    environment: 'production',
    serverName: os.hostname(),
    tracesSampleRate: 0,
  });
}
