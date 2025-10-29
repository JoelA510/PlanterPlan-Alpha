import React from 'react';
import { render, fireEvent, screen, waitFor, act } from '@testing-library/react';
import { SearchProvider, useSearch } from '../SearchContext';
import { fetchFilteredTasks } from '../../../services/taskService';

jest.mock('../../../services/taskService', () => ({
  fetchFilteredTasks: jest.fn(),
}));

const TestConsumer = () => {
  const { searchTerm, setSearchTerm, results, isSearching, clearSearch } = useSearch();

  return (
    <div>
      <input
        data-testid="search-input"
        value={searchTerm}
        onChange={(event) => setSearchTerm(event.target.value)}
      />
      <span data-testid="results-count">{results.length}</span>
      <span data-testid="results-ids">{results.map((task) => task.id).join(',')}</span>
      {isSearching ? <span data-testid="loading">loading</span> : null}
      <button type="button" data-testid="clear-button" onClick={clearSearch}>
        clear
      </button>
    </div>
  );
};

describe('SearchContext', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    fetchFilteredTasks.mockReset();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('debounces search updates and passes an AbortSignal to fetchFilteredTasks', async () => {
    fetchFilteredTasks.mockResolvedValue({ data: [{ id: 'final' }], count: 1 });

    render(
      <SearchProvider>
        <TestConsumer />
      </SearchProvider>
    );

    expect(fetchFilteredTasks).not.toHaveBeenCalled();

    const input = screen.getByTestId('search-input');

    fireEvent.change(input, { target: { value: 'f' } });
    fireEvent.change(input, { target: { value: 'fo' } });
    fireEvent.change(input, { target: { value: 'foo' } });

    expect(fetchFilteredTasks).not.toHaveBeenCalled();
    expect(screen.queryByTestId('loading')).not.toBeInTheDocument();

    // eslint-disable-next-line testing-library/no-unnecessary-act
    await act(async () => {
      jest.advanceTimersByTime(275);
      await Promise.resolve();
    });

    await waitFor(() => expect(fetchFilteredTasks).toHaveBeenCalledTimes(1));
    const args = fetchFilteredTasks.mock.calls[0][0];
    expect(args.q).toBe('foo');
    expect(args.from).toBe(0);
    expect(args.limit).toBe(100);
    expect(args.signal).toBeInstanceOf(AbortSignal);

    await waitFor(() =>
      expect(screen.getByTestId('results-count').textContent).toBe('1')
    );
    expect(screen.queryByTestId('loading')).not.toBeInTheDocument();
  });

  it('clears results when the search term is emptied', async () => {
    fetchFilteredTasks.mockResolvedValue({ data: [{ id: 'match' }], count: 1 });

    render(
      <SearchProvider>
        <TestConsumer />
      </SearchProvider>
    );

    const input = screen.getByTestId('search-input');
    fireEvent.change(input, { target: { value: 'plants' } });

    // eslint-disable-next-line testing-library/no-unnecessary-act
    await act(async () => {
      jest.advanceTimersByTime(275);
      await Promise.resolve();
    });

    await waitFor(() =>
      expect(screen.getByTestId('results-count').textContent).toBe('1')
    );

    const clearButton = screen.getByTestId('clear-button');
    fireEvent.click(clearButton);

    await waitFor(() =>
      expect(screen.getByTestId('results-count').textContent).toBe('0')
    );

    expect(fetchFilteredTasks).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('loading')).not.toBeInTheDocument();
  });

  it('ignores stale search responses and keeps the latest results', async () => {
    let resolveFirst;
    let resolveSecond;

    fetchFilteredTasks
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveFirst = resolve;
          })
      )
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveSecond = resolve;
          })
      );

    render(
      <SearchProvider>
        <TestConsumer />
      </SearchProvider>
    );

    const input = screen.getByTestId('search-input');

    fireEvent.change(input, { target: { value: 'first' } });

    // eslint-disable-next-line testing-library/no-unnecessary-act
    await act(async () => {
      jest.advanceTimersByTime(275);
      await Promise.resolve();
    });

    await waitFor(() => expect(fetchFilteredTasks).toHaveBeenCalledTimes(1));

    fireEvent.change(input, { target: { value: 'second' } });

    // eslint-disable-next-line testing-library/no-unnecessary-act
    await act(async () => {
      jest.advanceTimersByTime(275);
      await Promise.resolve();
    });

    await waitFor(() => expect(fetchFilteredTasks).toHaveBeenCalledTimes(2));

    resolveSecond({ data: [{ id: 'second-result' }], count: 1 });

    await waitFor(() =>
      expect(screen.getByTestId('results-ids').textContent).toBe('second-result')
    );

    resolveFirst({ data: [{ id: 'first-result' }], count: 1 });

    await waitFor(() =>
      expect(screen.getByTestId('results-ids').textContent).toBe('second-result')
    );
  });
});
