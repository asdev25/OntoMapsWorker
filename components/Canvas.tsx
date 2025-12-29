'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import useStore from '../store/useStore';
import { graphService } from '../lib/graphService';
import { expandNode, fetchNodeDetails } from '../services/aiService';
import { SettingsModal } from './SettingsModal';
import { ControlPanel } from './ControlPanel';
import { ExportMenu } from './ExportMenu';
import { MissionTabs } from './MissionTabs';

export default function Canvas() {
    const canvasRef = useRef<HTMLDivElement>(null);
    const {
        apiKey, baseUrl, modelName, demoMode,
        layoutMode, activeTabId, tabs, updateTabData, addTab, setActiveTab
    } = useStore();

    const activeTab = tabs.find((t) => t.id === activeTabId);

    // Track previous tab to save before switching
    const prevTabRef = useRef(activeTabId);

    // Ref to access latest tabs inside effect without triggering it
    const tabsRef = useRef(tabs);
    useEffect(() => {
        tabsRef.current = tabs;
    }, [tabs]);

    // Hover State
    const [hoveredNode, setHoveredNode] = useState<{
        label: string;
        x: number;
        y: number;
        desc?: string;
    } | null>(null);

    // Interaction State
    const isPanning = useRef(false);
    const lastMousePos = useRef({ x: 0, y: 0 });

    // Initialize Graph
    useEffect(() => {
        if (canvasRef.current) {
            const paper = graphService.initializePaper(canvasRef.current);
            // Default layout
            const initialDir = layoutMode === 'MINDMAP' ? 'MINDMAP' : layoutMode;
            graphService.layout(initialDir);

            // Hover logic via Paper Events
            paper.on('element:mouseenter', async (cellView, evt) => {
                const model = cellView.model;
                const label = model.attr('label/text');

                graphService.highlightNeighbors(model.id as string);

                // Show basic tooltip immediately
                const clientRect = cellView.el.getBoundingClientRect();

                // Initial State with Loading
                setHoveredNode({
                    label: label,
                    x: clientRect.right + 20,
                    y: clientRect.top,
                    desc: "Analyzing concept..."
                });

                // Fetch Details
                try {
                    const desc = await fetchNodeDetails(label, { apiKey, baseUrl, modelName, demoMode });

                    setHoveredNode(prev => {
                        if (prev && prev.label === label) {
                            return { ...prev, desc };
                        }
                        return prev;
                    });

                } catch (e) {
                    setHoveredNode(prev => prev && prev.label === label ? { ...prev, desc: "Details unavailable." } : prev);
                }
            });

            paper.on('element:mouseleave', () => {
                graphService.resetHighlight();
                setHoveredNode(null);
            });
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Run once on mount

    // --- Tab Hot-Swapping Logic ---
    useEffect(() => {
        if (!graphService.graph) return;

        // 1. Save data to the PREVIOUS tab
        const cells = graphService.graph.toJSON().cells;
        // Only save if we have content or it's not a fresh init (avoid wiping data if effect runs weirdly)
        if (cells) {
            updateTabData(prevTabRef.current, { cells });
        }

        // 2. Load data from the NEW active tab (Access via Ref)
        const currentTab = tabsRef.current.find(t => t.id === activeTabId);
        if (currentTab) {
            graphService.graph.clear();
            if (currentTab.data && currentTab.data.cells && currentTab.data.cells.length > 0) {
                graphService.graph.fromJSON(currentTab.data);
            } else {
                // If new/empty tab, add a root node
                if (!currentTab.data?.cells?.length) {
                    graphService.addNode('', currentTab.name, 400, 300, '0');
                }
            }

            // Apply layout for the new tab
            const direction = currentTab.layoutMode === 'MINDMAP' ? 'MINDMAP' : currentTab.layoutMode;
            setTimeout(() => graphService.layout(direction), 50); // Small delay to ensuring rendering
        }

        // Update ref
        prevTabRef.current = activeTabId;
    }, [activeTabId, updateTabData]); // DEPS: ONLY activeTabId (and stable actions)

    // Manual Pan/Zoom Handlers on the container div
    const handleWheel = (e: React.WheelEvent) => {
        const delta = e.deltaY * -0.001;
        graphService.zoom(delta, 0, 0);
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        if (e.target === canvasRef.current || (e.target as HTMLElement).tagName === 'svg') {
            isPanning.current = true;
            lastMousePos.current = { x: e.clientX, y: e.clientY };
        }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isPanning.current) return;
        const dx = e.clientX - lastMousePos.current.x;
        const dy = e.clientY - lastMousePos.current.y;

        graphService.pan(dx, dy);
        lastMousePos.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseUp = () => {
        isPanning.current = false;
    };

    // Layout updates
    useEffect(() => {
        const direction = layoutMode === 'MINDMAP' ? 'MINDMAP' : layoutMode;
        graphService.layout(direction);
    }, [layoutMode]);

    // Handlers
    const handleExpand = useCallback(async (id: string, label: string) => {
        if (!id || !label) return;

        try {
            const subTopics = await expandNode(label, { apiKey, baseUrl, modelName, demoMode });
            if (subTopics.length === 0) return;

            // RACE CONDITION CHECK: Verify the parent node still exists
            if (!graphService.exists(id)) {
                console.warn("Parent node removed during expansion. Aborting update.");
                return;
            }

            // Calculate Hierarchical Numbering
            const parentCell = graphService.graph.getCell(id);
            const parentNumber = (parentCell.get('data') && parentCell.get('data').number) || '';

            const currentChildren = graphService.getChildren(id);
            const startIndex = currentChildren.length + 1; // Fixed: const

            subTopics.forEach((topic, i) => {
                let newNumber = '';
                if (parentNumber === '0') {
                    newNumber = `${startIndex + i}`;
                } else if (parentNumber) {
                    newNumber = `${parentNumber}.${startIndex + i}`;
                }

                const newId = graphService.addNode('', topic, 0, 0, newNumber);
                graphService.addLink(id, newId);
            });

            const direction = layoutMode === 'MINDMAP' ? 'MINDMAP' : layoutMode;
            graphService.layout(direction);

        } catch (error) {
            console.error(error);
            alert("Failed to expand node");
        }
    }, [apiKey, baseUrl, modelName, demoMode, layoutMode]);

    const handleRetract = useCallback((id: string) => {
        if (!id) return;

        graphService.removeDescendants(id);

        const direction = layoutMode === 'MINDMAP' ? 'MINDMAP' : layoutMode;
        graphService.layout(direction);
    }, [layoutMode]);

    // --- Interactive Tools & Events ---
    useEffect(() => {
        if (canvasRef.current && graphService.paper) {
            const paper = graphService.paper;

            // Remove previous listeners to avoid duplicates
            paper.off('element:pointerup');
            paper.off('blank:pointerdown');
            paper.off('link:mouseenter');
            paper.off('link:mouseleave');
            paper.off('element:contextmenu');

            // Interactive Tools Selection
            paper.on('element:pointerup', (elementView) => {
                const id = elementView.model.id.toString();
                // When selecting, attach tools
                graphService.selectNode(id, {
                    onExpand: () => {
                        const node = graphService.graph.getCell(id);
                        const data = node.get('data') || {};
                        handleExpand(id, data.cleanLabel || node.attr('label/text'));
                    },
                    onRetract: () => {
                        handleRetract(id);
                    }
                });
            });

            // Blank Click -> Deselect
            paper.on('blank:pointerdown', () => {
                graphService.deselectAll();
            });

            // Link Tools
            paper.on('link:mouseenter', (linkView) => {
                graphService.addLinkTools(linkView);
            });

            paper.on('link:mouseleave', (linkView) => {
                graphService.removeLinkTools(linkView);
            });

            // Prevent default context menu, rely on Halo tools
            paper.on('element:contextmenu', (elementView, evt) => {
                evt.preventDefault();
                // Optional: Select on right click too
                const id = elementView.model.id.toString();
                graphService.selectNode(id, {
                    onExpand: () => {
                        const node = graphService.graph.getCell(id);
                        const data = node.get('data') || {};
                        handleExpand(id, data.cleanLabel || node.attr('label/text'));
                    },
                    onRetract: () => handleRetract(id),
                    // Feature: Promote to New Operation
                    onPromote: () => {
                        const node = graphService.graph.getCell(id);
                        const label = node.attr('label/text');

                        // Create new tab
                        const newTabName = label.length > 20 ? label.substring(0, 17) + '...' : label;
                        // We don't have the ID immediately if using `addTab` this way without return, 
                        // but `addTab` sets active automatically in our store logic.
                        // We just need to inject the initial data properly.

                        // Hack: Create a simplified graph JSON with one node
                        // Actually, our store `addTab` accepts initialData.

                        // Create fresh node structure for the new tab
                        // We manually build a simplified JSON for JointJS
                        const initialData = {
                            cells: [{
                                type: 'ontomaps.Node',
                                position: { x: 400, y: 300 },
                                size: { width: 140, height: 50 },
                                attrs: {
                                    label: { text: label },
                                    body: { strokeWidth: 2, rx: 0, ry: 0 }
                                },
                                data: { number: '0', cleanLabel: label }
                            }]
                        };

                        addTab(newTabName, initialData);
                    }
                });
            });
        }
    }, [handleExpand, handleRetract]);

    return (
        <div className="h-full w-full flex flex-col bg-background text-foreground">
            <header className="flex items-center justify-between h-12 border-b border-border bg-background/95 backdrop-blur px-3">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-md bg-primary/10 flex items-center justify-center text-[10px] font-semibold text-primary">
                            OM
                        </div>
                        <div className="flex flex-col leading-tight">
                            <span className="text-xs font-medium">Ontomaps</span>
                            <span className="text-[10px] text-muted-foreground">AI mind canvas</span>
                        </div>
                    </div>
                    <div className="hidden md:flex items-center pl-4 border-l border-border text-xs text-muted-foreground truncate">
                        {activeTab?.name ?? 'Untitled mission'}
                    </div>
                </div>

                <div className="flex-1 flex justify-center px-4">
                    <MissionTabs />
                </div>

                <div className="flex items-center gap-2">
                    <ExportMenu />
                    <SettingsModal />
                </div>
            </header>

            <div className="flex flex-1 overflow-hidden">
                <aside className="hidden md:flex w-72 border-r border-border bg-background/95 flex-col">
                    <div className="px-3 py-2 border-b border-border text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                        Mission setup
                    </div>
                    <div className="flex-1 overflow-auto px-3 py-3">
                        <ControlPanel />
                    </div>
                </aside>

                <main
                    className="relative flex-1 bg-[#111827] cursor-grab active:cursor-grabbing"
                    onWheel={handleWheel}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                >
                    <div className="absolute inset-0">
                        <div ref={canvasRef} className="w-full h-full pointer-events-none [&>*]:pointer-events-auto" />
                    </div>

                    {hoveredNode && (
                        <div
                            style={{ top: hoveredNode.y, left: hoveredNode.x }}
                            className="fixed z-50 w-72 p-3 rounded-md border border-border bg-popover/95 backdrop-blur text-xs shadow-lg"
                        >
                            <h4 className="font-medium text-sm mb-1">
                                {hoveredNode.label}
                            </h4>
                            <div className="text-[11px] text-muted-foreground leading-relaxed">
                                <span className="block text-[10px] font-medium uppercase tracking-wide mb-1 text-primary">
                                    AI insight
                                </span>
                                {hoveredNode.desc}
                            </div>
                        </div>
                    )}
                </main>

                <aside className="hidden lg:flex w-80 border-l border-border bg-background/95 flex-col">
                    <div className="px-3 py-2 border-b border-border text-[11px] font-medium text-muted-foreground uppercase tracking-wide flex items-center justify-between">
                        <span>Layout</span>
                        <span className="text-[10px] text-muted-foreground">
                            {layoutMode}
                        </span>
                    </div>
                    <div className="flex-1 overflow-auto px-3 py-3 text-[11px] text-muted-foreground space-y-3">
                        <p>
                            Use Mission setup to generate your initial concept, then drag nodes
                            around the canvas. The layout mode changes how the map is arranged,
                            similar to frames in Figma.
                        </p>
                        <p>
                            You can switch layouts at any time without losing structure. Exports
                            are available from the top right.
                        </p>
                    </div>
                </aside>
            </div>
        </div>
    );
}
