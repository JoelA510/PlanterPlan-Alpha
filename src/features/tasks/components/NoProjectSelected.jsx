import React from 'react';

export default function NoProjectSelected({ onCreateProject }) {
    return (
        <div className="flex flex-col items-center justify-center h-full text-slate-500 py-20">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                <svg
                    className="w-8 h-8 text-slate-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                    />
                </svg>
            </div>
            <h2 className="text-xl font-semibold mb-2 text-slate-700">No Project Selected</h2>
            <p className="max-w-md text-center mb-6">Select a project to view tasks.</p>
            <button
                onClick={onCreateProject}
                className="px-6 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 shadow-sm font-medium"
            >
                Create New Project
            </button>
        </div>
    );
}
