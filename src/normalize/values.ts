import type { ValueStatus } from '../model/types.js';

export function valueStatus(raw: string): ValueStatus {
  const value = raw.trim();
  if (!value) return 'empty';
  if (value === '?') return 'unknown';
  if (/^none listed\.?$/i.test(value)) return 'none_listed';
  return 'known';
}

export function normalizeSafe(raw: string): unknown {
  const value = raw.trim();
  const size = value.match(/^(\d+(?:[\.,]\d+)?)\s*x\s*(\d+(?:\.\d+)?)\s*([A-Za-z]+)?$/i);
  if (size) return { value1: Number(size[1]), value2: Number(size[2]), ...(size[3] ? { unit: size[3].toLowerCase() } : {}) };
  const single = value.match(/^(\\d+(?:\\.\\d+)?)\\s*([A-Za-z]+)?$/i);
  if (single) return { value: Number(single[1]), ...(single[2] ? { unit: single[2].toLowerCase() } : {}) };
  return undefined;
}
