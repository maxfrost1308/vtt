import { describe, it, expect } from 'vitest';
import { ADJECTIVES, NOUNS, DESCRIPTORS, generateRoomCode } from '../words';

const WORD_PATTERN = /^[a-z]+$/;

describe('word lists', () => {
  it('ADJECTIVES has at least 200 entries', () => {
    expect(ADJECTIVES.length).toBeGreaterThanOrEqual(200);
  });

  it('NOUNS has at least 200 entries', () => {
    expect(NOUNS.length).toBeGreaterThanOrEqual(200);
  });

  it('DESCRIPTORS has at least 200 entries', () => {
    expect(DESCRIPTORS.length).toBeGreaterThanOrEqual(200);
  });

  it('all ADJECTIVES are lowercase, 3-8 chars, no special characters', () => {
    for (const word of ADJECTIVES) {
      expect(word).toMatch(WORD_PATTERN);
      expect(word.length).toBeGreaterThanOrEqual(3);
      expect(word.length).toBeLessThanOrEqual(8);
    }
  });

  it('all NOUNS are lowercase, 3-8 chars, no special characters', () => {
    for (const word of NOUNS) {
      expect(word).toMatch(WORD_PATTERN);
      expect(word.length).toBeGreaterThanOrEqual(3);
      expect(word.length).toBeLessThanOrEqual(8);
    }
  });

  it('all DESCRIPTORS are lowercase, 3-8 chars, no special characters', () => {
    for (const word of DESCRIPTORS) {
      expect(word).toMatch(WORD_PATTERN);
      expect(word.length).toBeGreaterThanOrEqual(3);
      expect(word.length).toBeLessThanOrEqual(8);
    }
  });
});

describe('generateRoomCode', () => {
  it('returns a 3-word hyphenated string', () => {
    const code = generateRoomCode(new Set());
    expect(code).toMatch(/^[a-z]+-[a-z]+-[a-z]+$/);
  });

  it('1000 generations produce no duplicates', () => {
    const codes = new Set<string>();
    for (let i = 0; i < 1000; i++) {
      const code = generateRoomCode(codes);
      expect(codes.has(code)).toBe(false);
      codes.add(code);
    }
    expect(codes.size).toBe(1000);
  });

  it('avoids codes already in existingCodes', () => {
    const existing = new Set<string>();
    const first = generateRoomCode(existing);
    existing.add(first);
    for (let i = 0; i < 50; i++) {
      const code = generateRoomCode(existing);
      expect(code).not.toBe(first);
    }
  });
});
