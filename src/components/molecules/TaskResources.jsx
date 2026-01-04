import React, { useState, useEffect, useRef } from 'react';
import {
  listTaskResources,
  createTaskResource,
  deleteTaskResource,
  setPrimaryResource,
} from '../../services/taskResourcesService';
import { supabase } from '../../supabaseClient';
import { STORAGE_BUCKETS } from '../../constants';

const TaskResources = ({ taskId, primaryResourceId, onUpdate }) => {
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState(null);

  // Form state
  const [type, setType] = useState('url'); // 'url', 'text', 'pdf'
  const [urlData, setUrlData] = useState('');
  const [textData, setTextData] = useState('');
  const [fileData, setFileData] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef(null);

  // Stabilized fetch hook
  const fetchResources = React.useCallback(async () => {
    try {
      setLoading(true);
      const data = await listTaskResources(taskId);
      setResources(data || []);
    } catch (e) {
      console.error('Failed to load resources', e);
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    fetchResources();
  }, [fetchResources]);

  const resetForm = () => {
    setType('url');
    setUrlData('');
    setTextData('');
    setFileData(null);
    setError(null);
    setIsAdding(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = React.useCallback(
    async (e) => {
      e.preventDefault();
      setSubmitting(true);
      setError(null);

      try {
        let storage_path = null;
        if (type === 'pdf') {
          if (!fileData) throw new Error('Please select a PDF file');

          // Simple bucket assumption. Make sure 'resources' bucket exists in Supabase.
          const fileExt = fileData.name.split('.').pop();
          const fileName = `${taskId}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

          const { error: uploadError } = await supabase.storage
            .from(STORAGE_BUCKETS.RESOURCES)
            .upload(fileName, fileData);

          if (uploadError) throw uploadError;
          storage_path = fileName;
        } else if (type === 'url') {
          if (!urlData) throw new Error('Please enter a URL');
        } else if (type === 'text') {
          if (!textData) throw new Error('Please enter text content');
        }

        await createTaskResource(taskId, {
          type,
          url: type === 'url' ? urlData : null,
          text_content: type === 'text' ? textData : null,
          storage_path,
        });

        resetForm();
        fetchResources();
        if (onUpdate) onUpdate();
      } catch (e) {
        setError(e.message || 'Failed to create resource');
      } finally {
        setSubmitting(false);
      }
    },
    [type, fileData, taskId, urlData, textData, fetchResources, onUpdate]
  );

  const handleDelete = React.useCallback(
    async (id) => {
      if (!window.confirm('Are you sure you want to delete this resource?')) return;
      try {
        await deleteTaskResource(id);
        fetchResources();
        if (onUpdate) onUpdate();
      } catch (e) {
        console.error('Failed to delete resource', e);
        setError('Failed to delete resource');
      }
    },
    [fetchResources, onUpdate]
  );

  const handleSetPrimary = React.useCallback(
    async (resource) => {
      try {
        const newPrimaryId = resource.id === primaryResourceId ? null : resource.id;
        await setPrimaryResource(taskId, newPrimaryId);
        if (onUpdate) onUpdate();
      } catch (e) {
        console.error('Failed to set primary resource', e);
        setError('Failed to set primary resource');
      }
    },
    [primaryResourceId, taskId, onUpdate]
  );

  return (
    <div className="detail-section">
      <div className="flex items-center justify-between mb-2">
        <h3 className="detail-section-title mb-0">Resources</h3>
        {!isAdding && (
          <button
            type="button"
            onClick={() => setIsAdding(true)}
            className="text-xs font-medium text-blue-600 hover:text-blue-800"
          >
            + Add Resource
          </button>
        )}
      </div>

      {error && <div className="mb-2 text-xs text-red-600">{error}</div>}

      {/* Resource List */}
      <div className="space-y-2 mb-4">
        {!loading && resources.length === 0 && !isAdding && (
          <div className="text-center py-4 border border-dashed border-slate-200 rounded-lg bg-slate-50">
            <p className="text-sm text-slate-500 mb-2">No resources attached yet.</p>
            <button
              onClick={() => setIsAdding(true)}
              className="text-xs px-3 py-1.5 bg-white border border-slate-300 rounded text-blue-600 font-medium hover:bg-blue-50 transition-colors shadow-sm"
            >
              + Add First Resource
            </button>
          </div>
        )}

        {resources.map((res) => {
          const isPrimary = res.id === primaryResourceId;
          return (
            <div
              key={res.id}
              className={`flex items-start justify-between p-2 rounded border ${isPrimary ? 'border-blue-200 bg-blue-50' : 'border-slate-200 bg-white'}`}
            >
              <div className="flex-1 min-w-0 pr-2">
                <div className="flex items-center gap-2">
                  {/* Resource Badge */}
                  <span
                    className={`
                        text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border
                        ${res.resource_type === 'url'
                        ? 'bg-blue-50 text-blue-600 border-blue-200'
                        : res.resource_type === 'pdf'
                          ? 'bg-orange-100 text-orange-700 border-orange-200'
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                      }
                      `}
                  >
                    {res.resource_type}
                  </span>
                  <span className="text-sm font-medium truncate text-slate-800">
                    {res.resource_type === 'url'
                      ? 'External Link'
                      : res.resource_type === 'pdf'
                        ? 'Document'
                        : 'Note'}
                  </span>
                </div>
                {res.resource_type === 'url' && (
                  <a
                    href={res.resource_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-500 hover:underline truncate block"
                  >
                    {res.resource_url}
                  </a>
                )}
                {res.resource_type === 'text' && (
                  <p className="text-xs text-slate-600 line-clamp-2">{res.resource_text}</p>
                )}
                {res.resource_type === 'pdf' && (
                  <span className="text-xs text-slate-500">PDF Resource</span>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  title={isPrimary ? 'Primary Resource' : 'Make Primary'}
                  onClick={() => handleSetPrimary(res)}
                  className={`text-xs ${isPrimary ? 'text-yellow-500' : 'text-slate-300 hover:text-yellow-400'}`}
                >
                  ★
                </button>
                <button
                  onClick={() => handleDelete(res.id)}
                  className="text-slate-400 hover:text-red-600"
                  title="Delete"
                >
                  🗑
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Form */}
      {isAdding && (
        <form onSubmit={handleSubmit} className="p-3 bg-slate-50 rounded border border-slate-200">
          <div className="mb-3">
            <label className="block text-xs font-medium text-slate-700 mb-1">Type</label>
            <div className="flex gap-4">
              <label className="inline-flex items-center text-sm">
                <input
                  type="radio"
                  value="url"
                  checked={type === 'url'}
                  onChange={(e) => setType(e.target.value)}
                  className="mr-1"
                />{' '}
                URL
              </label>
              <label className="inline-flex items-center text-sm">
                <input
                  type="radio"
                  value="text"
                  checked={type === 'text'}
                  onChange={(e) => setType(e.target.value)}
                  className="mr-1"
                />{' '}
                Text
              </label>
              <label className="inline-flex items-center text-sm">
                <input
                  type="radio"
                  value="pdf"
                  checked={type === 'pdf'}
                  onChange={(e) => setType(e.target.value)}
                  className="mr-1"
                />{' '}
                PDF
              </label>
            </div>
          </div>

          {type === 'url' && (
            <div className="mb-3">
              <label className="block text-xs font-medium text-slate-700 mb-1">URL</label>
              <input
                type="url"
                required
                className="form-input text-sm"
                value={urlData}
                onChange={(e) => setUrlData(e.target.value)}
                placeholder="https://..."
              />
            </div>
          )}

          {type === 'text' && (
            <div className="mb-3">
              <label className="block text-xs font-medium text-slate-700 mb-1">Content</label>
              <textarea
                required
                className="form-textarea text-sm"
                rows="3"
                value={textData}
                onChange={(e) => setTextData(e.target.value)}
                placeholder="Enter details..."
              />
            </div>
          )}

          {type === 'pdf' && (
            <div className="mb-3">
              <label className="block text-xs font-medium text-slate-700 mb-1">File</label>
              <input
                type="file"
                ref={fileInputRef}
                required
                accept="application/pdf"
                className="text-sm"
                onChange={(e) => setFileData(e.currentTarget.files?.[0] ?? null)}
              />
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={resetForm}
              className="btn-secondary text-xs px-2 py-1"
              disabled={submitting}
            >
              Cancel
            </button>
            <button type="submit" className="btn-primary text-xs px-2 py-1" disabled={submitting}>
              {submitting ? 'Saving...' : 'Add'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default TaskResources;
