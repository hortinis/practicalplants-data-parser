import type { ValueStatus } from '../model/types.js';

export function cleanText(value: string): string { return value.replace(/\s+/g, ' ').trim(); }
export function valueStatus(raw: string): ValueStatus { const value = cleanText(raw); if (!value) return 'empty'; if (value === '?') return 'unknown'; if (/^none listed\.?$/i.test(value)) return 'none_listed'; return 'known'; }

export function normalizeSafe(raw: string): unknown {
  const value = cleanText(raw);
  if (!value || value === '?' || /^none listed\.?$/i.test(value)) return undefined;
  const size = value.match(/^(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)\s*([A-Za-zµ°]+(?:\s+[A-Za-z]+)?)?$/i);
  if (size) return { value1: Number(size[1]), value2: Number(size[2]), ...(size[3] ? { unit: size[3].toLowerCase() } : {}) };
  return undefined;
}
