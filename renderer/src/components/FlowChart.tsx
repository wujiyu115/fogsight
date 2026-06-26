import React from 'react';
import {spring, useCurrentFrame, useVideoConfig} from 'remotion';
import type {ThemeConfig} from '../types';

interface FlowChartProps {
	nodes: Array<{id: string; label: string; style?: 'rectangle' | 'diamond' | 'rounded' | 'circle'}>;
	edges: Array<{from: string; to: string; label?: string}>;
	direction?: 'horizontal' | 'vertical';
	theme: ThemeConfig;
}

interface LayoutNode {
	id: string;
	label: string;
	style: string;
	x: number;
	y: number;
	layer: number;
}

function computeLayout(
	nodes: FlowChartProps['nodes'],
	edges: FlowChartProps['edges'],
	direction: 'horizontal' | 'vertical',
	width: number,
	height: number,
): LayoutNode[] {
	const adj = new Map<string, string[]>();
	const inDegree = new Map<string, number>();
	for (const n of nodes) {
		adj.set(n.id, []);
		inDegree.set(n.id, 0);
	}
	for (const e of edges) {
		adj.get(e.from)?.push(e.to);
		inDegree.set(e.to, (inDegree.get(e.to) || 0) + 1);
	}

	const layers: string[][] = [];
	const layerOf = new Map<string, number>();
	const queue = nodes.filter((n) => (inDegree.get(n.id) || 0) === 0).map((n) => n.id);
	if (queue.length === 0 && nodes.length > 0) queue.push(nodes[0].id);

	const visited = new Set<string>();
	let currentLayer: string[] = [...queue];
	queue.forEach((id) => visited.add(id));

	while (currentLayer.length > 0) {
		layers.push(currentLayer);
		currentLayer.forEach((id) => layerOf.set(id, layers.length - 1));
		const nextLayer: string[] = [];
		for (const id of currentLayer) {
			for (const child of adj.get(id) || []) {
				if (!visited.has(child)) {
					visited.add(child);
					nextLayer.push(child);
				}
			}
		}
		currentLayer = nextLayer;
	}

	for (const n of nodes) {
		if (!visited.has(n.id)) {
			visited.add(n.id);
			const li = layers.length > 0 ? layers.length - 1 : 0;
			if (!layers[li]) layers.push([]);
			layers[li].push(n.id);
			layerOf.set(n.id, li);
		}
	}

	const padding = 80;
	const nodeMap = new Map(nodes.map((n) => [n.id, n]));
	const result: LayoutNode[] = [];

	const layerCount = layers.length || 1;

	for (let li = 0; li < layers.length; li++) {
		const layer = layers[li];
		for (let ni = 0; ni < layer.length; ni++) {
			const nodeId = layer[ni];
			const node = nodeMap.get(nodeId);
			if (!node) continue;

			let x: number, y: number;
			if (direction === 'horizontal') {
				x = padding + (li / Math.max(layerCount - 1, 1)) * (width - 2 * padding);
				y = padding + ((ni + 0.5) / layer.length) * (height - 2 * padding);
			} else {
				x = padding + ((ni + 0.5) / layer.length) * (width - 2 * padding);
				y = padding + (li / Math.max(layerCount - 1, 1)) * (height - 2 * padding);
			}

			result.push({
				id: node.id,
				label: node.label,
				style: node.style || 'rectangle',
				x,
				y,
				layer: li,
			});
		}
	}

	return result;
}

const NODE_W = 140;
const NODE_H = 50;

function renderNode(
	node: LayoutNode,
	theme: ThemeConfig,
	progress: number,
) {
	const opacity = progress;
	const scale = 0.8 + 0.2 * progress;

	const commonStyle: React.CSSProperties = {
		position: 'absolute',
		left: node.x - NODE_W / 2,
		top: node.y - NODE_H / 2,
		width: NODE_W,
		height: NODE_H,
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'center',
		opacity,
		transform: `scale(${scale})`,
	};

	const textEl = (
		<span
			style={{
				color: theme.textColor,
				fontSize: 15,
				fontFamily: theme.fontFamily,
				fontWeight: 600,
				textAlign: 'center',
				padding: '0 8px',
				lineHeight: 1.2,
			}}
		>
			{node.label}
		</span>
	);

	switch (node.style) {
		case 'circle':
			return (
				<div
					key={node.id}
					style={{
						...commonStyle,
						width: NODE_H,
						left: node.x - NODE_H / 2,
						borderRadius: '50%',
						border: `2px solid ${theme.primary}`,
						backgroundColor: `${theme.primary}20`,
					}}
				>
					{textEl}
				</div>
			);
		case 'diamond':
			return (
				<div
					key={node.id}
					style={{
						...commonStyle,
						width: NODE_H * 1.4,
						height: NODE_H * 1.4,
						left: node.x - (NODE_H * 1.4) / 2,
						top: node.y - (NODE_H * 1.4) / 2,
						transform: `scale(${scale}) rotate(45deg)`,
						border: `2px solid ${theme.accent}`,
						backgroundColor: `${theme.accent}20`,
					}}
				>
					<span
						style={{
							color: theme.textColor,
							fontSize: 14,
							fontFamily: theme.fontFamily,
							fontWeight: 600,
							textAlign: 'center',
							transform: 'rotate(-45deg)',
							padding: '0 4px',
							lineHeight: 1.2,
						}}
					>
						{node.label}
					</span>
				</div>
			);
		case 'rounded':
			return (
				<div
					key={node.id}
					style={{
						...commonStyle,
						borderRadius: NODE_H / 2,
						border: `2px solid ${theme.primary}`,
						backgroundColor: `${theme.primary}20`,
					}}
				>
					{textEl}
				</div>
			);
		default:
			return (
				<div
					key={node.id}
					style={{
						...commonStyle,
						borderRadius: 8,
						border: `2px solid ${theme.primary}`,
						backgroundColor: `${theme.primary}20`,
					}}
				>
					{textEl}
				</div>
			);
	}
}

export const FlowChart: React.FC<FlowChartProps> = ({
	nodes,
	edges,
	direction = 'vertical',
	theme,
}) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();

	const width = 800;
	const height = 500;

	const layoutNodes = computeLayout(nodes, edges, direction, width, height);
	const nodeMap = new Map(layoutNodes.map((n) => [n.id, n]));

	return (
		<div style={{position: 'relative', width, height}}>
			<svg
				viewBox={`0 0 ${width} ${height}`}
				width={width}
				height={height}
				style={{position: 'absolute', top: 0, left: 0}}
			>
				<defs>
					<marker
						id="arrowhead"
						markerWidth="10"
						markerHeight="7"
						refX="10"
						refY="3.5"
						orient="auto"
					>
						<polygon points="0 0, 10 3.5, 0 7" fill={theme.primary} />
					</marker>
				</defs>

				{edges.map((edge, i) => {
					const fromNode = nodeMap.get(edge.from);
					const toNode = nodeMap.get(edge.to);
					if (!fromNode || !toNode) return null;

					const edgeProgress = spring({
						frame: frame - Math.max(fromNode.layer, toNode.layer) * 8 - 5,
						fps,
						config: {damping: 15, stiffness: 80},
					});

					let x1: number, y1: number, x2: number, y2: number;
					if (direction === 'horizontal') {
						x1 = fromNode.x + NODE_W / 2;
						y1 = fromNode.y;
						x2 = toNode.x - NODE_W / 2;
						y2 = toNode.y;
					} else {
						x1 = fromNode.x;
						y1 = fromNode.y + NODE_H / 2;
						x2 = toNode.x;
						y2 = toNode.y - NODE_H / 2;
					}

					const dx = x2 - x1;
					const dy = y2 - y1;
					const len = Math.sqrt(dx * dx + dy * dy);

					return (
						<g key={`edge-${i}`} opacity={edgeProgress}>
							<line
								x1={x1}
								y1={y1}
								x2={x1 + dx * edgeProgress}
								y2={y1 + dy * edgeProgress}
								stroke={theme.primary}
								strokeWidth={2}
								markerEnd={edgeProgress > 0.9 ? 'url(#arrowhead)' : undefined}
							/>
							{edge.label && (
								<text
									x={x1 + dx / 2}
									y={y1 + dy / 2 - 8}
									fill={`${theme.textColor}cc`}
									fontSize={13}
									fontFamily={theme.fontFamily}
									textAnchor="middle"
									opacity={edgeProgress}
								>
									{edge.label}
								</text>
							)}
						</g>
					);
				})}
			</svg>

			{layoutNodes.map((node) => {
				const progress = spring({
					frame: frame - node.layer * 8,
					fps,
					config: {damping: 15, stiffness: 120},
				});
				return renderNode(node, theme, progress);
			})}
		</div>
	);
};
