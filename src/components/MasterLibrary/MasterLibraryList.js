import { useEffect, useState } from 'react';
import { fetchMasterLibraryTasks } from '../../services/taskService';

export default function MasterLibraryList({ limit = 50 }) {
  const [tasks, setTasks] = useState([]);
  const [offset, setOffset] = useState(0);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    const loadTasks = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await fetchMasterLibraryTasks({
          from: offset,
          limit,
          signal: controller.signal,
        });
        setTasks(data ?? []);
      } catch (err) {
        if (err?.name === 'AbortError') {
          return;
        }
        console.error('Failed to load master library tasks', err);
        setTasks([]);
        setError(err?.message || 'Failed to load tasks');
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    loadTasks();

    return () => {
      controller.abort();
    };
  }, [offset, limit]);

  const handleNext = () => {
    setOffset((prev) => prev + limit);
  };

  const handlePrev = () => {
    setOffset((prev) => Math.max(0, prev - limit));
  };

  const disablePrev = offset === 0 || isLoading;
  const disableNext = isLoading || tasks.length < limit;

  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-gray-900">Master Library</h2>
        <span className="text-sm text-gray-500">
          {isLoading ? 'Loading…' : `Showing ${tasks.length} task${tasks.length !== 1 ? 's' : ''}`}
        </span>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <ul className="divide-y divide-gray-200">
          {isLoading ? (
            <li className="px-4 py-6 text-center text-sm text-gray-500">Loading…</li>
          ) : tasks.length === 0 ? (
            <li className="px-4 py-6 text-center text-sm text-gray-500">
              No master library tasks found.
            </li>
          ) : (
            tasks.map((task) => (
              <li key={task.id} className="px-4 py-4">
                <p className="text-base font-medium text-gray-900">{task.title}</p>
                <p className="text-sm text-gray-500">{task.organization_name || 'Global'}</p>
              </li>
            ))
          )}
        </ul>
      </div>

      <div className="mt-4 flex justify-between">
        <button
          type="button"
          onClick={handlePrev}
          disabled={disablePrev}
          className={`rounded-md border px-4 py-2 text-sm font-medium transition-colors ${
            disablePrev
              ? 'cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400'
              : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
          }`}
        >
          Prev
        </button>
        <button
          type="button"
          onClick={handleNext}
          disabled={disableNext}
          className={`rounded-md border px-4 py-2 text-sm font-medium transition-colors ${
            disableNext
              ? 'cursor-not-allowed border-blue-200 bg-blue-100 text-blue-400'
              : 'border-blue-600 bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          Next
        </button>
      </div>
    </div>
  );
}
