import { describe, it, expect } from 'vitest';
import { initSentry } from '../sentry';

describe('initSentry', () => {
  it('does not throw when DSN is undefined', () => {
    expect(() => initSentry(undefined)).not.toThrow();
  });

  it('does not throw when DSN is an empty string', () => {
    expect(() => initSentry('')).not.toThrow();
  });
});
