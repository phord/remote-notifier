import { describe, it, expect } from 'vitest';
import { validateToken, extractBearerToken } from '../../src/server/auth';

describe('validateToken', () => {
  const token = 'a'.repeat(64);

  it('returns true for matching tokens', () => {
    expect(validateToken(token, token)).toBe(true);
  });

  it('returns false for non-matching tokens', () => {
    const other = 'b'.repeat(64);
    expect(validateToken(other, token)).toBe(false);
  });

  it('returns false for empty provided token', () => {
    expect(validateToken('', token)).toBe(false);
  });

  it('returns false for different length tokens without crashing', () => {
    expect(validateToken('short', token)).toBe(false);
  });

  it('returns false for empty expected token', () => {
    expect(validateToken(token, '')).toBe(false);
  });
});

describe('extractBearerToken', () => {
  it('extracts token from valid Bearer header', () => {
    expect(extractBearerToken('Bearer abc123')).toBe('abc123');
  });

  it('is case-insensitive for Bearer prefix', () => {
    expect(extractBearerToken('bearer abc123')).toBe('abc123');
    expect(extractBearerToken('BEARER abc123')).toBe('abc123');
  });

  it('returns null for missing header', () => {
    expect(extractBearerToken(undefined)).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(extractBearerToken('')).toBeNull();
  });

  it('returns null for non-Bearer scheme', () => {
    expect(extractBearerToken('Basic abc123')).toBeNull();
  });

  it('returns null for Bearer without a token value', () => {
    expect(extractBearerToken('Bearer ')).toBeNull();
  });

  it('handles tokens with special characters', () => {
    expect(extractBearerToken('Bearer abc+def/ghi=')).toBe('abc+def/ghi=');
  });
});
