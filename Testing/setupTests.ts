import '@testing-library/jest-dom';
import { vi, beforeEach } from 'vitest';

// Mocks for JSDOM
// Wave 30: Radix Select / Popover uses ResizeObserver; jsdom doesn't ship it.
class ResizeObserverStub {
 observe(): void {}
 unobserve(): void {}
 disconnect(): void {}
}
(globalThis as unknown as { ResizeObserver: typeof ResizeObserverStub }).ResizeObserver ??= ResizeObserverStub;

Object.defineProperty(window, 'matchMedia', {
 writable: true,
 value: vi.fn().mockImplementation(query => ({
 matches: false,
 media: query,
 onchange: null,
 addListener: vi.fn(), // deprecated
 removeListener: vi.fn(), // deprecated
 addEventListener: vi.fn(),
 removeEventListener: vi.fn(),
 dispatchEvent: vi.fn(),
 })),
});

// jsdom 29 ships a persistence-backed localStorage that fails without a
// `--localstorage-file` path (vitest doesn't supply one). Install a plain
// in-memory Storage so tests have the full API and are isolated per run.
class MemoryStorage implements Storage {
 private store = new Map<string, string>();
 get length(): number { return this.store.size; }
 clear(): void { this.store.clear(); }
 getItem(key: string): string | null {
  return this.store.get(key) ?? null;
 }
 key(index: number): string | null {
  const keys = Array.from(this.store.keys());
  return (index >= 0 && index < keys.length) ? keys[index] : null;
 }
 removeItem(key: string): void { this.store.delete(key); }
 setItem(key: string, value: string): void { this.store.set(key, String(value)); }
}

Object.defineProperty(window, 'localStorage', {
 value: new MemoryStorage(),
 writable: true,
 configurable: true,
});
Object.defineProperty(window, 'sessionStorage', {
 value: new MemoryStorage(),
 writable: true,
 configurable: true,
});

beforeEach(() => {
 window.localStorage.clear();
 window.sessionStorage.clear();
});
