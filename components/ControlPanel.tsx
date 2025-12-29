'use client';

import { useState } from 'react';
import useStore from '../store/useStore';
import { expandNode } from '../services/aiService';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent } from './ui/card';
import { Loader2, Zap, ChevronRight, Menu } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { graphService } from '../lib/graphService';

export function ControlPanel() {
    const { apiKey, baseUrl, modelName, demoMode, layoutMode, setLayoutMode } = useStore();
    const [topic, setTopic] = useState('');
    const [loading, setLoading] = useState(false);
    const [collapsed, setCollapsed] = useState(false); // Default open

    const handleStart = async () => {
        if (!topic) return;

        setLoading(true);
        graphService.reset();
        const rootId = graphService.addNode('root', topic, 0, 0, '0');

        try {
            const subTopics = await expandNode(topic, { apiKey, baseUrl, modelName, demoMode });

            if (subTopics && subTopics.length > 0) {
                subTopics.forEach(sub => {
                    const subId = graphService.addNode('', sub);
                    graphService.addLink(rootId, subId);
                });
                // Layout using store mode
                graphService.layout(layoutMode);
            }
        } catch (error) {
            console.error(error);
            alert("Failed to start.");
        } finally {
            setLoading(false);
        }
    };

    if (collapsed) {
        return (
            <Button
                className="hud-btn border-l-4 border-primary bg-black/80 text-primary"
                onClick={() => setCollapsed(false)}
            >
                <Menu className="mr-2 h-4 w-4" />
                OP_MENU
            </Button>
        );
    }

    return (
        <Card className="w-80 hud-panel bg-black/90 p-0 border-0">
            <CardContent className="p-4 flex flex-col gap-4">
                <div className="flex items-center justify-between border-b border-primary/30 pb-2">
                    <h2 className="font-mono text-sm font-bold text-primary flex items-center gap-2 tracking-widest uppercase">
                        <Zap className="h-4 w-4 text-primary" />
                        Mission Cont.
                    </h2>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0 hover:bg-white/10" onClick={() => setCollapsed(true)}>
                        <div className="h-0.5 w-3 bg-neutral-400"></div>
                    </Button>
                </div>

                <div className="space-y-2">
                    <p className="text-[10px] text-neutral-500 font-mono uppercase tracking-widest">Target Objective</p>
                    <div className="flex gap-2">
                        <Input
                            placeholder="ENTER OBJECTIVE..."
                            value={topic}
                            onChange={(e) => setTopic(e.target.value)}
                            className="bg-black/50 border-white/10 text-white font-mono text-xs focus:ring-primary/50 uppercase placeholder:text-neutral-600"
                        />
                    </div>
                    <Button
                        onClick={handleStart}
                        disabled={loading || (!apiKey && !demoMode) || !topic}
                        className="w-full hud-btn bg-primary/20 hover:bg-primary/30 text-primary border-l-2 border-primary"
                    >
                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <span className="flex items-center">INITIALIZE <ChevronRight className="ml-1 w-3 h-3" /></span>}
                    </Button>
                </div>

                <div className="pt-2">
                    <p className="text-[10px] text-neutral-500 font-mono uppercase tracking-widest mb-2">Tactical View</p>

                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    <Select value={layoutMode} onValueChange={(val: string) => setLayoutMode(val as any)}>
                        <SelectTrigger className="w-full bg-black/50 border-white/10 text-white font-mono text-xs h-8">
                            <SelectValue placeholder="Select Layout" />
                        </SelectTrigger>
                        <SelectContent className="bg-black/90 border-white/10 text-white font-mono text-xs max-h-56">
                            <SelectItem value="MINDMAP">Mind Map (Radial)</SelectItem>
                            <SelectItem value="LOGIC">Logic Chart (Flow)</SelectItem>
                            <SelectItem value="BRACE">Brace Map</SelectItem>
                            <SelectItem value="ORG">Org Chart</SelectItem>
                            <SelectItem value="TREE">Tree Chart</SelectItem>
                            <SelectItem value="TIMELINE">Timeline</SelectItem>
                            <SelectItem value="FISHBONE">Fishbone (Cause/Effect)</SelectItem>
                            <SelectItem value="TREETABLE">Tree Table</SelectItem>
                            <SelectItem value="MATRIX">Matrix Grid</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {!apiKey && !demoMode && (
                    <div className="text-[10px] text-red-400 text-center bg-red-950/20 border border-red-500/30 p-2 font-mono uppercase tracking-wide">
                        ⚠ Uplink Offline
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
