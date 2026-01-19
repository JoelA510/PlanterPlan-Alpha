import React from 'react';

export default function ProjectTabs({ activeTab, onTabChange }) {
    const tabs = [
        { id: 'board', label: 'Task Board' },
        { id: 'people', label: 'People & Team' },
        { id: 'budget', label: 'Budget' },
        { id: 'assets', label: 'Assets' },
    ];

    return (
        <div className="flex items-center space-x-1 border-b border-slate-200 mb-6 overflow-x-auto">
            {tabs.map((tab) => (
                <button
                    key={tab.id}
                    onClick={() => onTabChange(tab.id)}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === tab.id
                            ? 'border-brand-600 text-brand-600'
                            : 'border-transparent text-slate-500 hover:text-slate-700'
                        }`}
                >
                    {tab.label}
                </button>
            ))}
        </div>
    );
}
