import React from 'react';
import PropTypes from 'prop-types';
import { Layout } from 'lucide-react';
import { FolderPlus } from 'lucide-react';

export default function EmptyProjectState({ onCreateProject }) {
    return (
        <div className="flex flex-col items-center justify-center h-full text-slate-500 py-20">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                <Layout className="w-8 h-8 text-slate-400" />
            </div>
            <h2 className="text-xl font-semibold mb-2 text-slate-700">No Project Selected</h2>
            <p className="max-w-md text-center mb-6">Select a project to view tasks.</p>
            <button
                onClick={onCreateProject}
                className="flex items-center space-x-2 px-6 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 shadow-sm font-medium transition-colors"
            >
                <FolderPlus className="w-5 h-5" />
                <span>Create New Project</span>
            </button>
        </div>
    );
}

EmptyProjectState.propTypes = {
    onCreateProject: PropTypes.func.isRequired,
};
