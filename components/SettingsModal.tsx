'use client';

import { useState, useEffect } from 'react';
import useStore from '../store/useStore';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from './ui/dialog';
import { Switch } from './ui/switch';
import { Settings } from 'lucide-react';

export function SettingsModal() {
    const { apiKey, baseUrl, modelName, setApiConfig, demoMode, setDemoMode } = useStore();
    const [localApiKey, setLocalApiKey] = useState(apiKey);
    const [localBaseUrl, setLocalBaseUrl] = useState(baseUrl);
    const [localModelName, setLocalModelName] = useState(modelName);
    const [open, setOpen] = useState(false);

    // Sync local state when modal opens
    useEffect(() => {
        if (open) {
            setLocalApiKey(apiKey);
            setLocalBaseUrl(baseUrl);
            setLocalModelName(modelName);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    const handleSave = () => {
        setApiConfig({
            apiKey: localApiKey,
            baseUrl: localBaseUrl,
            modelName: localModelName,
        });
        setOpen(false);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="icon" className="hud-btn border-white/20 bg-black/50 hover:bg-white/10">
                    <Settings className="h-4 w-4" />
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] hud-panel bg-black/80 border-white/10 text-white">
                <DialogHeader>
                    <DialogTitle className="uppercase tracking-widest text-primary font-mono text-sm border-b border-primary/30 pb-2">Configuration // API</DialogTitle>
                    <DialogDescription className="text-xs text-neutral-400 font-mono">
                        Set AI provider credentials. Keys are stored locally.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="apiKey" className="text-right text-xs uppercase tracking-wider text-neutral-500">
                            API Key
                        </Label>
                        <Input
                            id="apiKey"
                            type="password"
                            value={localApiKey}
                            onChange={(e) => setLocalApiKey(e.target.value)}
                            className="col-span-3 bg-black/50 border-white/10 text-white font-mono text-xs focus:ring-primary/50"
                            placeholder="sk-..."
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="baseUrl" className="text-right text-xs uppercase tracking-wider text-neutral-500">
                            Base URL
                        </Label>
                        <Input
                            id="baseUrl"
                            value={localBaseUrl}
                            onChange={(e) => setLocalBaseUrl(e.target.value)}
                            className="col-span-3 bg-black/50 border-white/10 text-white font-mono text-xs focus:ring-primary/50"
                            placeholder="https://api.openai.com/v1"
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="modelName" className="text-right text-xs uppercase tracking-wider text-neutral-500">
                            Model
                        </Label>
                        <Input
                            id="modelName"
                            value={localModelName}
                            onChange={(e) => setLocalModelName(e.target.value)}
                            className="col-span-3 bg-black/50 border-white/10 text-white font-mono text-xs focus:ring-primary/50"
                            placeholder="gpt-4"
                        />
                    </div>
                    <div className="flex items-center justify-between space-x-2 pt-4 border-t border-white/10">
                        <Label htmlFor="demo-mode" className="text-xs uppercase tracking-wider text-neutral-400">Demo Mode</Label>
                        <Switch
                            id="demo-mode"
                            checked={demoMode}
                            onCheckedChange={setDemoMode}
                            className="data-[state=checked]:bg-primary"
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button onClick={handleSave} className="hud-btn bg-primary/20 hover:bg-primary/40 text-primary w-full border-l-2 border-primary">Confirm Updates</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
