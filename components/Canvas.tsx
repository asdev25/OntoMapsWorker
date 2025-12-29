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
        <div
            className="h-screen w-screen bg-[#1a1a1a] overflow-hidden relative cursor-grab active:cursor-grabbing"
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
        >
            <div ref={canvasRef} className="w-full h-full pointer-events-none [&>*]:pointer-events-auto" />

            {/* D3 Style AI Content Tooltip */}
            {hoveredNode && (
                <div
                    style={{ top: hoveredNode.y, left: hoveredNode.x }}
                    className="fixed z-50 w-72 p-4 rounded-lg border border-cyan-500/50 bg-black/85 backdrop-blur-md text-cyan-50 shadow-[0_0_20px_rgba(6,182,212,0.2)] animate-in fade-in zoom-in-95 duration-200"
                >
                    <h4 className="font-bold text-lg text-cyan-400 mb-2 border-b border-cyan-500/30 pb-2">
                        {hoveredNode.label}
                    </h4>
                    <div className="text-xs text-neutral-300 leading-relaxed">
                        <span className="text-cyan-500/70 font-semibold text-[10px] uppercase tracking-wider mb-1 block">
                            AI Generated Insight
                        </span>
                        {hoveredNode.desc}
                    </div>
                </div>
            )}

            {/* UI Overlays */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40">
                <MissionTabs />
            </div>
            <div className="absolute top-4 right-4 z-40">
                <SettingsModal />
            </div>
            <div className="absolute top-4 left-4 z-40">
                <ControlPanel />
            </div>
            <div className="absolute bottom-4 right-4 z-40">
                <ExportMenu />
            </div>
        </div>
    );
}
