'use client';

import useStore from '../store/useStore';
import { Plus, X, FileText } from 'lucide-react';
import { useState } from 'react';

export const MissionTabs = () => {
    const { tabs, activeTabId, addTab, setActiveTab, closeTab, updateTabName } = useStore();
    const [editingId, setEditingId] = useState<string | null>(null);

    const handleAdd = () => {
        const count = tabs.length + 1;
        addTab(`OP-${String(count).padStart(2, '0')}`);
    };

    return (
        <div className="flex items-center gap-1 h-10 bg-black/80 backdrop-blur-md border-b border-white/10 px-2 font-mono select-none overflow-x-auto w-full max-w-[calc(100vw-400px)] scrollbar-none">
            {tabs.map((tab) => {
                const isActive = tab.id === activeTabId;
                return (
                    <div
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`
                            relative flex items-center gap-2 px-4 h-8 text-xs cursor-pointer transition-all border-t-2 clip-path-slant
                            ${isActive
                                ? 'bg-primary/20 border-primary text-white font-bold'
                                : 'bg-white/5 border-transparent text-neutral-500 hover:text-neutral-300 hover:bg-white/10'}
                        `}
                        style={{
                            clipPath: 'polygon(0 0, 100% 0, 95% 100%, 5% 100%)'
                        }}
                    >
                        <FileText className={`w-3 h-3 ${isActive ? 'text-primary' : 'text-neutral-600'}`} />

                        {editingId === tab.id ? (
                            <input
                                autoFocus
                                className="bg-transparent border-none outline-none w-20 text-center uppercase tracking-wider"
                                value={tab.name}
                                onChange={(e) => updateTabName(tab.id, e.target.value)}
                                onBlur={() => setEditingId(null)}
                                onKeyDown={(e) => e.key === 'Enter' && setEditingId(null)}
                            />
                        ) : (
                            <span
                                onDoubleClick={() => setEditingId(tab.id)}
                                className="uppercase tracking-wider"
                            >
                                {tab.name}
                            </span>
                        )}

                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                closeTab(tab.id);
                            }}
                            className={`ml-1 p-0.5 rounded hover:bg-red-500/20 hover:text-red-500 transition-colors ${tabs.length === 1 ? 'hidden' : ''}`}
                        >
                            <X className="w-3 h-3" />
                        </button>
                    </div>
                );
            })}

            <button
                onClick={handleAdd}
                className="flex items-center justify-center w-8 h-8 ml-2 text-neutral-500 hover:text-primary hover:bg-primary/10 rounded transition-colors"
                title="New Operation"
            >
                <Plus className="w-4 h-4" />
            </button>
        </div>
    );
};
