'use client';

import { useState } from 'react';
import { Download, ChevronDown, FileJson, FileCode, FileText, Image, Presentation } from 'lucide-react';
import { graphService } from '../lib/graphService';
import { exportGraph } from '../services/exportService';

export const ExportMenu = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [isExporting, setIsExporting] = useState(false);

    const handleExport = async (format: 'json' | 'svg' | 'md' | 'html' | 'pptx') => {
        if (!graphService.paper || !graphService.graph) return;

        setIsExporting(true);
        try {
            await exportGraph(graphService.graph, graphService.paper, format, 'ontomap-mission-data');
        } catch (error) {
            console.error(error);
            alert('Extraction Failed');
        } finally {
            setIsExporting(false);
            setIsOpen(false);
        }
    };

    return (
        <div className="relative font-mono">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="hud-btn flex items-center gap-2 group border border-white/10"
            >
                <Download className="w-4 h-4 text-primary group-hover:text-white transition-colors" />
                <span>EXTRACT DATA</span>
                <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute bottom-full right-0 mb-2 w-48 hud-panel flex flex-col gap-1 p-1 z-50">
                    <div className="px-2 py-1 text-[10px] text-muted-foreground uppercase tracking-widest border-b border-white/10 mb-1">
                        Select Format
                    </div>

                    <button onClick={() => handleExport('svg')} className="flex items-center gap-3 px-3 py-2 text-xs text-foreground hover:bg-primary/20 hover:text-primary transition-colors text-left">
                        <Image className="w-3 h-3" /> SVG Vector
                    </button>
                    <button onClick={() => handleExport('json')} className="flex items-center gap-3 px-3 py-2 text-xs text-foreground hover:bg-primary/20 hover:text-primary transition-colors text-left">
                        <FileJson className="w-3 h-3" /> JSON Data
                    </button>
                    <button onClick={() => handleExport('html')} className="flex items-center gap-3 px-3 py-2 text-xs text-foreground hover:bg-primary/20 hover:text-primary transition-colors text-left">
                        <FileCode className="w-3 h-3" /> HTML Report
                    </button>
                    <button onClick={() => handleExport('md')} className="flex items-center gap-3 px-3 py-2 text-xs text-foreground hover:bg-primary/20 hover:text-primary transition-colors text-left">
                        <FileText className="w-3 h-3" /> Intel Docs (.MD)
                    </button>
                    <button onClick={() => handleExport('pptx')} className="flex items-center gap-3 px-3 py-2 text-xs text-foreground hover:bg-primary/20 hover:text-primary transition-colors text-left">
                        <Presentation className="w-3 h-3" /> Briefing (.PPTX)
                    </button>
                </div>
            )}
        </div>
    );
};
