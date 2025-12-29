import * as joint from 'jointjs';
import * as dagre from 'dagre';
import * as graphlib from 'graphlib';

// Custom Node Shape Definition
class OntoNode extends joint.shapes.standard.Rectangle {
    defaults() {
        return joint.util.deepSupplement({
            type: 'ontomaps.Node',
            attrs: {
                root: {
                    magnet: false
                },
                body: {
                    rx: 0, // Sharp corners for R6 style
                    ry: 0,
                    strokeWidth: 1,
                    fill: '#1e293b', // Slate-800
                    stroke: '#334155' // Slate-700
                },
                label: {
                    fontSize: 12,
                    fontFamily: 'Geist Mono, monospace', // R6 Font
                    fill: '#f8fafc', // Slate-50
                    textWrap: {
                        width: 180,
                        height: null,
                        ellipsis: true
                    }
                },
                badge: {
                    r: 10,
                    fill: '#06b6d4', // Cyan
                    stroke: '#fff',
                    strokeWidth: 1,
                    refX: -10,
                    refY: -10,
                    zIndex: 10,
                    display: 'none'
                },
                badgeLabel: {
                    fontSize: 10,
                    fontWeight: 'bold',
                    fontFamily: 'monospace',
                    fill: '#000',
                    refX: -10,
                    refY: -10,
                    textAnchor: 'middle',
                    yAlignment: 'middle',
                    zIndex: 11
                }
            }
        }, super.defaults);
    }

    markup = [{
        tagName: 'rect',
        selector: 'body'
    }, {
        tagName: 'text',
        selector: 'label'
    }, {
        tagName: 'circle',
        selector: 'badge'
    }, {
        tagName: 'text',
        selector: 'badgeLabel'
    }];
}

const shapeNamespace = {
    ...joint.shapes,
    ontomaps: {
        Node: OntoNode
    }
};

export class GraphService {
    graph: joint.dia.Graph;
    paper: joint.dia.Paper | null = null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    layoutEngine: any;

    constructor() {
        this.graph = new joint.dia.Graph({}, { cellNamespace: shapeNamespace });
    }

    initializePaper(element: HTMLElement) {
        this.paper = new joint.dia.Paper({
            el: element,
            model: this.graph,
            width: '100%',
            height: '100%',
            gridSize: 20,
            drawGrid: {
                name: 'mesh',
                args: { color: '#334155', thickness: 0.5 } // Tactical Grid
            },
            background: {
                color: '#0f172a' // Slate-950
            },
            cellViewNamespace: shapeNamespace,
            interactive: { linkMove: false },
            defaultConnectionPoint: { name: 'boundary' },
            defaultRouter: { name: 'manhattan' },
            defaultConnector: { name: 'rounded' },
        });

        // Setup events
        this.paper.on('element:contextmenu', (cellView, evt) => {
            evt.preventDefault();
        });

        // Hover effect
        this.paper.on('element:mouseenter', (cellView) => {
            cellView.model.attr('body/stroke', '#06b6d4'); // Cyan highlight
            cellView.model.attr('body/strokeWidth', 2);
        });

        this.paper.on('element:mouseleave', (cellView) => {
            cellView.model.attr('body/stroke', '#334155');
            cellView.model.attr('body/strokeWidth', 1);
        });

        return this.paper;
    }

    addNode(id: string, label: string, x: number = 0, y: number = 0, numberLabel: string = '') {
        const node = new OntoNode();
        node.position(x, y);

        const baseWidth = 220;
        const baseHeight = 60; // Sleeker
        const lineHeight = 16;
        const charsPerLine = 28;

        const lines = Math.ceil(label.length / charsPerLine);
        const extraLines = Math.max(0, lines - 2);
        const newHeight = baseHeight + (extraLines * lineHeight);

        node.resize(baseWidth, newHeight);

        node.attr({
            label: {
                text: label,
                textWrap: {
                    width: baseWidth - 20,
                    height: newHeight - 10,
                    ellipsis: true
                }
            },
            badgeLabel: {
                text: numberLabel
            },
            badge: {
                display: numberLabel ? 'block' : 'none'
            }
        });

        node.set('data', { number: numberLabel, cleanLabel: label });
        node.addTo(this.graph);
        return node.id;
    }

    removeNode(id: string) {
        const cell = this.graph.getCell(id);
        if (cell) {
            cell.remove();
        }
    }

    reset() {
        this.graph.clear();
    }

    removeDescendants(id: string) {
        const cell = this.graph.getCell(id);
        if (!cell) return;

        const outboundLinks = this.graph.getConnectedLinks(cell, { outbound: true });
        outboundLinks.forEach(link => {
            const targetId = link.target().id;
            if (targetId) {
                this.removeDescendants(targetId.toString());
                this.removeNode(targetId.toString());
            }
        });
    }

    getChildren(id: string): joint.dia.Cell[] {
        const cell = this.graph.getCell(id);
        if (!cell) return [];
        const outboundLinks = this.graph.getConnectedLinks(cell, { outbound: true });
        return outboundLinks.map(link => {
            const targetId = link.target().id;
            return targetId ? this.graph.getCell(targetId) : null;
        }).filter(c => !!c) as joint.dia.Cell[];
    }

    addLink(sourceId: string | number, targetId: string | number) {
        const sourceCell = this.graph.getCell(sourceId);
        const targetCell = this.graph.getCell(targetId);

        if (!sourceCell || !targetCell) {
            return;
        }

        const link = new joint.shapes.standard.Link();
        link.source({ id: sourceId });
        link.target({ id: targetId });
        link.attr({
            line: {
                stroke: '#64748b', // Slate-500
                strokeWidth: 1,
                targetMarker: {
                    type: 'path',
                    d: 'M 6 -3 0 0 6 3 z'
                }
            }
        });
        link.router('manhattan');
        link.connector('rounded');
        link.addTo(this.graph);
    }

    exists(id: string): boolean {
        return !!this.graph.getCell(id);
    }

    layout(mode: string = 'LR') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let rankDir: any = 'LR';

        switch (mode) {
            case 'MINDMAP':
                this.layoutRadial();
                this.updateRouter('manhattan');
                return;
            case 'TIMELINE':
                this.layoutTimeline();
                this.updateRouter('metro');
                return;
            case 'FISHBONE':
                this.layoutFishbone();
                this.updateRouter('normal');
                return;
            case 'MATRIX':
            case 'TREETABLE':
                this.layoutMatrix();
                this.updateRouter('manhattan');
                return;
            case 'BRACE':
                rankDir = 'LR';
                this.updateRouter('manhattan');
                break;
            case 'LOGIC':
                rankDir = 'LR';
                this.updateRouter('manhattan');
                break;
            case 'ORG':
                rankDir = 'TB';
                this.updateRouter('manhattan');
                break;
            case 'TREE':
                rankDir = 'TB';
                this.updateRouter('normal');
                break;
            case 'LR':
            case 'RL':
            case 'TB':
            case 'BT':
                rankDir = mode;
                this.updateRouter('manhattan');
                break;
            default:
                rankDir = 'LR';
                this.updateRouter('manhattan');
                break;
        }

        joint.layout.DirectedGraph.layout(this.graph, {
            dagre: dagre,
            graphlib: graphlib,
            setLinkVertices: true,
            rankDir: rankDir,
            marginX: 100,
            marginY: 100,
            nodeSep: 100,
            rankSep: 150,
            resizeClusters: true
        });
    }

    updateRouter(routerName: string) {
        if (!this.graph) return;
        this.graph.getLinks().forEach(link => {
            link.router(routerName);
        });
        if (this.paper) {
            this.paper.options.defaultRouter = { name: routerName };
        }
    }

    // --- Custom Layout Algorithms ---

    layoutRadial() {
        const center = { x: 800, y: 600 };
        const cells = this.graph.getElements();
        if (cells.length === 0) return;

        const root = cells.find(c => this.graph.getConnectedLinks(c, { inbound: true }).length === 0) || cells[0];

        const levels = new Map<string, number>();
        const queue: { id: string, level: number }[] = [{ id: root.id.toString(), level: 0 }];
        levels.set(root.id.toString(), 0);
        const visited = new Set<string>();
        visited.add(root.id.toString());

        while (queue.length > 0) {
            const current = queue.shift()!;
            const children = this.getChildren(current.id);
            children.forEach(child => {
                if (!visited.has(child.id.toString())) {
                    visited.add(child.id.toString());
                    levels.set(child.id.toString(), current.level + 1);
                    queue.push({ id: child.id.toString(), level: current.level + 1 });
                }
            });
        }

        const maxLevel = Math.max(...Array.from(levels.values()));
        root.position(center.x, center.y);

        for (let i = 1; i <= maxLevel; i++) {
            const nodesInLevel = cells.filter(c => levels.get(c.id.toString()) === i);
            const radius = i * 250;
            const angleStep = (2 * Math.PI) / nodesInLevel.length;

            nodesInLevel.forEach((node, idx) => {
                const angle = idx * angleStep;
                const nx = center.x + radius * Math.cos(angle);
                const ny = center.y + radius * Math.sin(angle);
                node.position(nx, ny);
            });
        }
    }

    layoutTimeline() {
        const cells = this.graph.getElements();
        let currentX = 100;
        const yBase = 400;
        const root = cells.find(c => this.graph.getConnectedLinks(c, { inbound: true }).length === 0) || cells[0];

        const traverse = (node: joint.dia.Cell, level: number) => {
            node.position(currentX, yBase + (level % 2 === 0 ? -120 : 120) * (level > 0 ? 1 : 0));
            currentX += 280;

            const children = this.getChildren(node.id.toString());
            children.forEach((child) => {
                traverse(child, level + 1);
            });
        };

        traverse(root, 0);
    }

    layoutFishbone() {
        const startX = 100;
        const spineY = 400;
        let currentX = startX;

        const cells = this.graph.getElements();
        const root = cells.find(c => this.graph.getConnectedLinks(c, { inbound: true }).length === 0) || cells[0];

        root.position(startX, spineY);
        const children = this.getChildren(root.id.toString());

        children.forEach((bone) => {
            currentX += 280;
            bone.position(currentX, spineY);

            const subItems = this.getChildren(bone.id.toString());
            subItems.forEach((item, j) => {
                const yOffset = (j % 2 === 0 ? -100 : 100) * (Math.ceil((j + 1) / 2));
                item.position(currentX - 50, spineY + yOffset);
            });
        });
    }

    layoutMatrix() {
        const cells = this.graph.getElements();
        const cols = Math.ceil(Math.sqrt(cells.length));

        cells.forEach((cell, i) => {
            const col = i % cols;
            const row = Math.floor(i / cols);
            cell.position(100 + col * 250, 100 + row * 150);
        });
    }

    // --- Interactive Tools ---

    deselectAll() {
        if (!this.paper) return;
        this.paper.removeTools();
    }

    selectNode(id: string, callbacks: { onExpand: () => void, onRetract: () => void, onPromote?: () => void }) {
        this.deselectAll();
        if (!this.paper) return;

        const view = this.paper.findViewByModel(id);
        if (!view || !view.model.isElement()) return;

        const boundaryTool = new joint.elementTools.Boundary({
            padding: 5,
            rotate: false,
            useModelGeometry: true,
            attributes: {
                'stroke': '#06b6d4',
                'stroke-dasharray': '5,5'
            }
        });

        const removeTool = new joint.elementTools.Remove({
            offset: { x: 10, y: -10 }
        });

        const expandTool = new joint.elementTools.Button({
            markup: [{
                tagName: 'circle',
                selector: 'button',
                attributes: { 'r': 10, 'fill': '#0ea5e9', 'cursor': 'pointer' }
            }, {
                tagName: 'path',
                selector: 'icon',
                attributes: { 'd': 'M -4 0 L 4 0 M 0 -4 L 0 4', 'fill': 'none', 'stroke': '#fff', 'stroke-width': 2 }
            }],
            x: '100%',
            y: '100%',
            offset: { x: -25, y: -10 },
            action: () => callbacks.onExpand()
        });

        const collapseTool = new joint.elementTools.Button({
            markup: [{
                tagName: 'circle',
                selector: 'button',
                attributes: { 'r': 10, 'fill': '#fbbf24', 'cursor': 'pointer' }
            }, {
                tagName: 'path',
                selector: 'icon',
                attributes: { 'd': 'M -4 0 L 4 0', 'fill': 'none', 'stroke': '#fff', 'stroke-width': 2 }
            }],
            x: '100%',
            y: '100%',
            offset: { x: -5, y: -10 },
            action: () => callbacks.onRetract()
        });

        const promoteTool = new joint.elementTools.Button({
            markup: [{
                tagName: 'circle',
                selector: 'button',
                attributes: { 'r': 10, 'fill': '#22c55e', 'cursor': 'pointer' } // Green
            }, {
                tagName: 'path',
                selector: 'icon',
                attributes: { 'd': 'M -3 2 L 0 -2 L 3 2 M 0 -2 L 0 4', 'fill': 'none', 'stroke': '#fff', 'stroke-width': 2 }
            }],
            x: '100%',
            y: '0%', // Top Right
            offset: { x: -5, y: 10 },
            action: () => { if (callbacks.onPromote) callbacks.onPromote(); }
        });

        const toolsView = new joint.dia.ToolsView({
            tools: [boundaryTool, removeTool, expandTool, collapseTool, promoteTool]
        });

        view.addTools(toolsView);
    }



    addLinkTools(linkView: joint.dia.LinkView) {
        linkView.addTools(new joint.dia.ToolsView({
            tools: [
                new joint.linkTools.Vertices(),
                new joint.linkTools.Segments(),
                new joint.linkTools.TargetArrowhead(),
                new joint.linkTools.Remove({ distance: 20 })
            ]
        }));
    }

    removeLinkTools(linkView: joint.dia.LinkView) {
        if (linkView.hasTools()) linkView.removeTools();
    }

    zoom(delta: number, x: number, y: number) {
        if (!this.paper) return;
        // Suppress TS checks for Paper polymorphic methods
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const paperAny = this.paper as any;
        const scale = paperAny.scale();
        const currentScale = scale.sx;
        const nextScale = Math.max(0.2, Math.min(5, currentScale + delta));

        const beta = currentScale / nextScale;
        const ax = x - (x * beta);
        const ay = y - (y * beta);

        const translate = paperAny.translate();
        const nextTx = translate.tx - ax * nextScale;
        const nextTy = translate.ty - ay * nextScale;

        paperAny.scale(nextScale, nextScale);
        paperAny.translate(nextTx, nextTy);
    }

    pan(dx: number, dy: number) {
        if (!this.paper) return;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const paperAny = this.paper as any;
        const translate = paperAny.translate();
        paperAny.translate(translate.tx + dx, translate.ty + dy);
    }

    highlightNeighbors(nodeId: string) {
        const cell = this.graph.getCell(nodeId);
        if (!cell) return;

        const neighbors = this.graph.getNeighbors(cell);
        const neighborIds = new Set(neighbors.map(n => n.id));
        neighborIds.add(cell.id);

        const connectedLinks = this.graph.getConnectedLinks(cell);
        const linkIds = new Set(connectedLinks.map(l => l.id));

        this.graph.getCells().forEach(c => {
            const view = this.paper?.findViewByModel(c);
            if (!view) return;

            if (c.isLink()) {
                if (linkIds.has(c.id)) {
                    view.el.style.opacity = '1';
                    c.attr('line/stroke', '#06b6d4');
                    c.attr('line/strokeWidth', 2);
                } else {
                    view.el.style.opacity = '0.2';
                    c.attr('line/stroke', '#334155');
                }
            } else {
                if (neighborIds.has(c.id)) {
                    view.el.style.opacity = '1';
                    c.attr('body/stroke', '#06b6d4');
                    // Maintain Slate-800 fill or slightly lighter for selection
                    c.attr('body/fill', '#1e293b');
                    // Ensure text remains visible
                    c.attr('label/fill', '#f8fafc');
                } else {
                    view.el.style.opacity = '0.4'; // Less transparent to keep context visible
                    c.attr('body/stroke', '#334155');
                    c.attr('body/fill', '#0f172a'); // Slate-950 for dimmed
                }
            }
        });
    }

    resetHighlight() {
        this.graph.getCells().forEach(c => {
            const view = this.paper?.findViewByModel(c);
            if (!view) return;
            view.el.style.opacity = '1';

            if (c.isLink()) {
                c.attr('line/stroke', '#64748b');
                c.attr('line/strokeWidth', 1);
            } else {
                c.attr('body/stroke', '#334155');
                c.attr('body/strokeWidth', 1);
            }
        });
    }
}

export const graphService = new GraphService();
