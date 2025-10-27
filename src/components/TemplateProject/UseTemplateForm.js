import { useEffect, useMemo, useState } from 'react';
import { useTasks } from '../contexts/TaskContext';
import { log, logError } from '../../utils/logger';

const TemplatePreview = ({ template, childTemplates = [] }) => (
  <div
    style={{
      border: '1px solid #d1d5db',
      borderRadius: '4px',
      padding: '12px',
      backgroundColor: '#f9fafb'
    }}
  >
    <h5 style={{ margin: '0 0 8px 0', fontWeight: 'bold', color: '#1f2937' }}>{template.title}</h5>
    <p style={{ margin: 0, color: '#4b5563' }}>{template.description || 'No description provided.'}</p>
    {childTemplates.length > 0 && (
      <div style={{ marginTop: '12px' }}>
        <p style={{ margin: '0 0 8px 0', fontWeight: 'bold', color: '#2563eb' }}>Includes</p>
        <ul style={{ margin: 0, paddingLeft: '18px', color: '#4b5563' }}>
          {childTemplates.slice(0, 5).map(child => (
            <li key={child.id}>{child.title}</li>
          ))}
          {childTemplates.length > 5 && <li>...and more</li>}
        </ul>
      </div>
    )}
  </div>
);

const UseTemplateForm = ({ template = null, onSuccess, onCancel }) => {
  const {
    createProjectFromTemplate,
    applyLicenseKey,
    templateTasks = [],
    userHasProjects: hasProjects
  } = useTasks();

  const userHasProjects = Boolean(hasProjects);

  const [projectName, setProjectName] = useState(template ? template.title : '');
  const [startDate, setStartDate] = useState('');
  const [licenseKey, setLicenseKey] = useState('');
  const [licenseStatus, setLicenseStatus] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState('');
  const [formError, setFormError] = useState(null);

  useEffect(() => {
    const today = new Date();
    setStartDate(today.toISOString().split('T')[0]);
  }, []);

  const childTemplates = useMemo(() => {
    if (!template?.id) {
      return [];
    }

    return templateTasks.filter(task => task.parent_task_id === template.id);
  }, [template?.id, templateTasks]);

  const handleLicenseKeyChange = (event) => {
    setLicenseKey(event.target.value);
    setLicenseStatus('');
    setFormError(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!template) {
      setFormError('A template must be selected.');
      return;
    }

    if (!projectName.trim()) {
      setFormError('Project name is required');
      return;
    }

    if (!startDate) {
      setFormError('Start date is required');
      return;
    }

    if (userHasProjects && !licenseKey.trim()) {
      setFormError('License key is required for additional projects');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      let licenseId = null;

      if (userHasProjects) {
        setStatus('Validating license key...');
        const licenseResult = await applyLicenseKey(licenseKey.trim());
        log('License key validation response received.');

        if (!licenseResult?.success) {
          setLicenseStatus('error');
          throw new Error(licenseResult?.error || 'Invalid license key');
        }

        licenseId = licenseResult.licenseId || licenseResult.id || null;
        log('License key validated successfully.');

        setLicenseStatus('success');
        setStatus('License key applied successfully. Creating project...');
      } else {
        setStatus('Creating project from template...');
      }

      const projectData = {
        name: projectName,
        startDate
      };

      const result = await createProjectFromTemplate(template.id, projectData, licenseId);

      if (result?.error) {
        throw new Error(result.error);
      }

      setStatus('Project created successfully!');

      if (onSuccess && result?.data) {
        onSuccess(result.data);
      }
    } catch (err) {
      logError('Error creating project from template:', err);
      setStatus('');
      setFormError(`Error: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        backgroundColor: '#f9fafb',
        borderRadius: '4px',
        border: '1px solid #e5e7eb',
        height: '100%',
        overflow: 'auto'
      }}
    >
      <div
        style={{
          backgroundColor: '#3b82f6',
          color: 'white',
          padding: '16px',
          borderTopLeftRadius: '4px',
          borderTopRightRadius: '4px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        <h3 style={{ margin: 0, fontWeight: 'bold' }}>Create Project from Template</h3>
        <button
          type="button"
          onClick={onCancel}
          style={{
            background: 'rgba(255, 255, 255, 0.2)',
            border: 'none',
            borderRadius: '50%',
            color: 'white',
            cursor: 'pointer',
            width: '24px',
            height: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '12px'
          }}
        >
          ✕
        </button>
      </div>

      <form onSubmit={handleSubmit} style={{ padding: '16px' }}>
        {template ? (
          <div style={{ marginBottom: '20px' }}>
            <h4
              style={{
                margin: '0 0 12px 0',
                color: '#2563EB',
                fontWeight: 'bold'
              }}
            >
              Selected Template
            </h4>
            <TemplatePreview template={template} childTemplates={childTemplates} />
          </div>
        ) : (
          <div
            style={{
              marginBottom: '20px',
              padding: '16px',
              borderRadius: '4px',
              backgroundColor: '#f3f4f6',
              color: '#6b7280'
            }}
          >
            Select a template to start creating your project.
          </div>
        )}

        {userHasProjects && (
          <div style={{ marginBottom: '16px' }}>
            <label
              htmlFor="licenseKey"
              style={{
                display: 'block',
                fontWeight: 'bold',
                marginBottom: '4px'
              }}
            >
              License Key *
            </label>
            <div style={{ marginBottom: '8px' }}>
              <p
                style={{
                  fontSize: '14px',
                  color: '#6b7280',
                  margin: '0 0 8px 0'
                }}
              >
                You already have a project. A license key is required to create additional projects.
              </p>
            </div>
            <input
              id="licenseKey"
              name="licenseKey"
              type="text"
              value={licenseKey}
              onChange={handleLicenseKeyChange}
              placeholder="Enter your license key"
              style={{
                width: '100%',
                padding: '8px',
                borderRadius: '4px',
                border: `1px solid ${formError && formError.includes('license') ? '#ef4444' :
                  licenseStatus === 'success' ? '#10b981' :
                  licenseStatus === 'error' ? '#ef4444' : '#d1d5db'}`,
                outline: 'none',
                backgroundColor: licenseStatus === 'success' ? '#d1fae5' : 'white'
              }}
            />
          </div>
        )}

        <div style={{ marginBottom: '16px' }}>
          <label
            htmlFor="projectName"
            style={{
              display: 'block',
              fontWeight: 'bold',
              marginBottom: '4px'
            }}
          >
            Project Name *
          </label>
          <input
            id="projectName"
            name="projectName"
            type="text"
            value={projectName}
            onChange={(event) => setProjectName(event.target.value)}
            style={{
              width: '100%',
              padding: '8px',
              borderRadius: '4px',
              border: `1px solid ${formError && formError.includes('name') ? '#ef4444' : '#d1d5db'}`,
              outline: 'none'
            }}
          />
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label
            htmlFor="startDate"
            style={{
              display: 'block',
              fontWeight: 'bold',
              marginBottom: '4px'
            }}
          >
            Start Date *
          </label>
          <input
            id="startDate"
            name="startDate"
            type="date"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
            style={{
              width: '100%',
              padding: '8px',
              borderRadius: '4px',
              border: `1px solid ${formError && formError.includes('date') ? '#ef4444' : '#d1d5db'}`,
              outline: 'none'
            }}
          />
        </div>

        {formError && (
          <div
            style={{
              marginBottom: '16px',
              padding: '8px',
              borderRadius: '4px',
              backgroundColor: '#fee2e2',
              color: '#b91c1c'
            }}
          >
            {formError}
          </div>
        )}

        {status && (
          <div
            style={{
              marginBottom: '16px',
              padding: '8px',
              borderRadius: '4px',
              backgroundColor: status.includes('Error') ? '#fee2e2' :
                status.includes('License key applied') ? '#d1fae5' :
                status.includes('Validating') ? '#fff7ed' : '#d1fae5',
              color: status.includes('Error') ? '#b91c1c' :
                status.includes('License key applied') ? '#065f46' :
                status.includes('Validating') ? '#c2410c' : '#065f46'
            }}
          >
            {status}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button
            type="button"
            onClick={onCancel}
            style={{
              padding: '8px 16px',
              borderRadius: '4px',
              border: '1px solid #d1d5db',
              background: 'white',
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              padding: '8px 16px',
              borderRadius: '4px',
              border: 'none',
              background: '#10b981',
              color: 'white',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              opacity: isSubmitting ? 0.7 : 1
            }}
          >
            {isSubmitting ? 'Creating...' : 'Create Project'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default UseTemplateForm;
