import { describe, it, expect } from 'vitest';
import en from '@/shared/i18n/locales/en.json';

type JsonValue = string | number | boolean | null | JsonObject | JsonValue[];
interface JsonObject {
  [key: string]: JsonValue;
}

const REQUIRED_NAMESPACES = [
  'common',
  'nav',
  'onboarding',
  'auth',
  'tasks',
  'activity',
  'projects',
  'library',
  'settings',
  'notifications',
  'errors',
  'ics',
  'gantt',
  'admin',
] as const;

describe('en.json', () => {
  it('has every required namespace', () => {
    for (const ns of REQUIRED_NAMESPACES) {
      expect(en).toHaveProperty(ns);
    }
  });

  it('no empty string values', () => {
    const walk = (obj: JsonObject, path: string[] = []): void => {
      for (const [k, v] of Object.entries(obj)) {
        const keyPath = [...path, k].join('.');
        if (typeof v === 'string') {
          expect(v.length, keyPath).toBeGreaterThan(0);
        } else if (v && typeof v === 'object' && !Array.isArray(v)) {
          walk(v as JsonObject, [...path, k]);
        }
      }
    };
    walk(en as JsonObject);
  });

  it('does not expose launch-visible coming soon copy', () => {
    const walk = (obj: JsonObject, path: string[] = []): void => {
      for (const [k, v] of Object.entries(obj)) {
        const keyPath = [...path, k].join('.');
        expect(k.toLowerCase(), keyPath).not.toContain('coming_soon');
        if (typeof v === 'string') {
          expect(v.toLowerCase(), keyPath).not.toContain('coming soon');
        } else if (v && typeof v === 'object' && !Array.isArray(v)) {
          walk(v as JsonObject, [...path, k]);
        }
      }
    };
    walk(en as JsonObject);
  });

  it('every plural `_one` key has a matching `_other` sibling', () => {
    const walk = (obj: JsonObject): void => {
      const keys = Object.keys(obj);
      for (const k of keys) {
        if (k.endsWith('_one')) {
          const stem = k.slice(0, -'_one'.length);
          expect(keys, `${stem}_other`).toContain(`${stem}_other`);
        }
        const v = obj[k];
        if (v && typeof v === 'object' && !Array.isArray(v)) {
          walk(v as JsonObject);
        }
      }
    };
    walk(en as JsonObject);
  });
});
