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
        <div className="flex items-center gap-1 h-9 px-1 font-mono select-none overflow-x-auto max-w-full scrollbar-none">
            {tabs.map((tab) => {
                const isActive = tab.id === activeTabId;
                return (
                    <div
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`
                            flex items-center gap-2 px-3 h-7 rounded-md text-xs cursor-pointer transition-colors
                            ${isActive
                                ? 'bg-zinc-800 text-foreground'
                                : 'text-muted-foreground hover:bg-zinc-800/60'}
                        `}
                    >
                        <FileText className={`w-3 h-3 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />

                        {editingId === tab.id ? (
                            <input
                                autoFocus
                                className="bg-transparent border-none outline-none w-24 text-center text-xs"
                                value={tab.name}
                                onChange={(e) => updateTabName(tab.id, e.target.value)}
                                onBlur={() => setEditingId(null)}
                                onKeyDown={(e) => e.key === 'Enter' && setEditingId(null)}
                            />
                        ) : (
                            <span
                                onDoubleClick={() => setEditingId(tab.id)}
                                className="truncate max-w-[120px]"
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
                className="flex items-center justify-center w-7 h-7 ml-1 rounded-md border border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                title="New Operation"
            >
                <Plus className="w-4 h-4" />
            </button>
        </div>
    );
};
