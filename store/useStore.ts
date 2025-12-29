import { create } from 'zustand';

export interface Tab {
    id: string;
    name: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: any; // Serialized graph data
    layoutMode: 'MINDMAP' | 'LOGIC' | 'BRACE' | 'ORG' | 'TREE' | 'TIMELINE' | 'FISHBONE' | 'TREETABLE' | 'MATRIX';
}

export interface AppState {
    apiKey: string;
    baseUrl: string;
    modelName: string;
    demoMode: boolean;
    setDemoMode: (enabled: boolean) => void;

    // Tab State
    tabs: Tab[];
    activeTabId: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    addTab: (name, initialData?: any) => void;
    closeTab: (id: string) => void;
    setActiveTab: (id: string) => void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    updateTabData: (id: string, data: any) => void;
    updateTabName: (id: string, name: string) => void;

    // Current Tab Helpers (Proxies to active tab)
    layoutMode: 'MINDMAP' | 'LOGIC' | 'BRACE' | 'ORG' | 'TREE' | 'TIMELINE' | 'FISHBONE' | 'TREETABLE' | 'MATRIX';
    setLayoutMode: (mode: 'MINDMAP' | 'LOGIC' | 'BRACE' | 'ORG' | 'TREE' | 'TIMELINE' | 'FISHBONE' | 'TREETABLE' | 'MATRIX') => void;

    setApiConfig: (config: { apiKey?: string; baseUrl?: string; modelName?: string }) => void;
}

const useStore = create<AppState>((set, get) => ({
    apiKey: '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',
    baseUrl: 'https://openrouter.ai/api/v1',
    modelName: 'xiaomi/mimo-v2-flash:free',
    demoMode: false,

    // Initial Tab State
    tabs: [{
        id: 'mission-1',
        name: 'Mission 1',
        data: { cells: [] },
        layoutMode: 'MINDMAP'
    }],
    activeTabId: 'mission-1',

    // Tab Actions
    addTab: (name, initialData = { cells: [] }) => set((state) => {
        const newId = `mission-${Date.now()}`;
        return {
            tabs: [...state.tabs, {
                id: newId,
                name: name,
                data: initialData,
                layoutMode: 'MINDMAP'
            }],
            activeTabId: newId
        };
    }),

    closeTab: (id) => set((state) => {
        if (state.tabs.length <= 1) return state; // Prevent closing last tab
        const newTabs = state.tabs.filter(t => t.id !== id);
        return {
            tabs: newTabs,
            // If we closed active tab, switch to last one
            activeTabId: state.activeTabId === id ? newTabs[newTabs.length - 1].id : state.activeTabId
        };
    }),

    setActiveTab: (id) => set((state) => {
        const targetTab = state.tabs.find(t => t.id === id);
        return {
            activeTabId: id,
            layoutMode: targetTab ? targetTab.layoutMode : state.layoutMode
        };
    }),

    updateTabData: (id, data) => set((state) => ({
        tabs: state.tabs.map(t => t.id === id ? { ...t, data } : t)
    })),

    updateTabName: (id, name) => set((state) => ({
        tabs: state.tabs.map(t => t.id === id ? { ...t, name } : t)
    })),

    setDemoMode: (demoMode) => set({ demoMode }),

    // Proxy LayoutMode to Active Tab
    layoutMode: 'MINDMAP', // Keep for component compatibility, updated via sync elsewhere or getter
    setLayoutMode: (mode) => set((state) => ({
        layoutMode: mode, // Update local prop for quick access
        tabs: state.tabs.map(t => t.id === state.activeTabId ? { ...t, layoutMode: mode } : t)
    })),

    setApiConfig: (config) => set((state) => ({ ...state, ...config })),
}));

export default useStore;

