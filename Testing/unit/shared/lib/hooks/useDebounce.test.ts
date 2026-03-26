import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import useDebounce from '@/shared/lib/hooks/useDebounce';

describe('useDebounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('hello', 300));
    expect(result.current).toBe('hello');
  });

  it('does not update value before delay expires', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 300),
      { initialProps: { value: 'a' } },
    );

    rerender({ value: 'b' });
    act(() => { vi.advanceTimersByTime(200); });
    expect(result.current).toBe('a');
  });

  it('updates value after delay expires', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 300),
      { initialProps: { value: 'a' } },
    );

    rerender({ value: 'b' });
    act(() => { vi.advanceTimersByTime(300); });
    expect(result.current).toBe('b');
  });

  it('resets timer on rapid value changes (only final value applied)', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 300),
      { initialProps: { value: 'a' } },
    );

    rerender({ value: 'b' });
    act(() => { vi.advanceTimersByTime(100); });
    rerender({ value: 'c' });
    act(() => { vi.advanceTimersByTime(100); });
    rerender({ value: 'd' });
    act(() => { vi.advanceTimersByTime(300); });

    expect(result.current).toBe('d');
  });

  it('uses default delay of 300ms', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value),
      { initialProps: { value: 1 } },
    );

    rerender({ value: 2 });
    act(() => { vi.advanceTimersByTime(299); });
    expect(result.current).toBe(1);
    act(() => { vi.advanceTimersByTime(1); });
    expect(result.current).toBe(2);
  });

  it('respects custom delay', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 500),
      { initialProps: { value: 'x' } },
    );

    rerender({ value: 'y' });
    act(() => { vi.advanceTimersByTime(499); });
    expect(result.current).toBe('x');
    act(() => { vi.advanceTimersByTime(1); });
    expect(result.current).toBe('y');
  });

  it('works with complex types', () => {
    const obj1 = { name: 'Alice' };
    const obj2 = { name: 'Bob' };
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 100),
      { initialProps: { value: obj1 } },
    );

    rerender({ value: obj2 });
    act(() => { vi.advanceTimersByTime(100); });
    expect(result.current).toEqual({ name: 'Bob' });
  });
});
