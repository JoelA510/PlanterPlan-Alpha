import { useEffect, useState } from 'react';
import { fetchMasterLibraryTasks } from '../../services/taskService';

export default function MasterLibraryList({ limit = 50 }) {
  const [tasks, setTasks] = useState([]);
  const [offset, setOffset] = useState(0);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let isCancelled = false;

    async function loadTasks() {
      setIsLoading(true);
      setError(null);
      try {
        const data = await fetchMasterLibraryTasks({ from: offset, limit });
        if (!isCancelled) {
          setTasks(data ?? []);
        }
      } catch (err) {
        if (!isCancelled) {
          console.error('Failed to load master library tasks', err);
          setError(err.message || 'Failed to load tasks');
          setTasks([]);
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    loadTasks();

    return () => {
      isCancelled = true;
    };
  }, [offset, limit]);

  const handleNext = () => {
    setOffset((prev) => prev + limit);
  };

  const handlePrev = () => {
    setOffset((prev) => Math.max(0, prev - limit));
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2 style={{ margin: 0 }}>Master Library</h2>
        <div style={{ fontSize: '14px', color: '#6b7280' }}>
          Showing {tasks.length} tasks
        </div>
      </div>

      {error && (
        <div style={{ background: '#fee2e2', border: '1px solid #fecaca', color: '#b91c1c', padding: '12px 16px', borderRadius: '6px', marginBottom: '16px' }}>
          {error}
        </div>
      )}

      <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
        <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {isLoading ? (
            <li style={{ padding: '16px', textAlign: 'center', color: '#6b7280' }}>Loading...</li>
          ) : tasks.length === 0 ? (
            <li style={{ padding: '16px', textAlign: 'center', color: '#6b7280' }}>No master library tasks found.</li>
          ) : (
            tasks.map((t) => (
              <li
                key={t.id}
                style={{
                  padding: '16px',
                  borderBottom: '1px solid #e5e7eb',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                }}
              >
                <strong style={{ fontSize: '16px' }}>{t.title}</strong>
                {t.organization_name ? (
                  <span style={{ color: '#4b5563', fontSize: '14px' }}>{t.organization_name}</span>
                ) : (
                  <span style={{ color: '#4b5563', fontSize: '14px' }}>Global</span>
                )}
              </li>
            ))
          )}
        </ul>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px' }}>
        <button
          type="button"
          onClick={handlePrev}
          disabled={offset === 0 || isLoading}
          style={{
            padding: '8px 16px',
            borderRadius: '4px',
            border: '1px solid #d1d5db',
            backgroundColor: offset === 0 || isLoading ? '#f3f4f6' : '#fff',
            color: '#111827',
            cursor: offset === 0 || isLoading ? 'not-allowed' : 'pointer'
          }}
        >
          Prev
        </button>
        <button
          type="button"
          onClick={handleNext}
          disabled={isLoading || tasks.length < limit}
          style={{
            padding: '8px 16px',
            borderRadius: '4px',
            border: '1px solid #2563eb',
            backgroundColor: isLoading || tasks.length < limit ? '#93c5fd' : '#3b82f6',
            color: '#fff',
            cursor: isLoading || tasks.length < limit ? 'not-allowed' : 'pointer'
          }}
        >
          Next
        </button>
      </div>
    </div>
  );
}
