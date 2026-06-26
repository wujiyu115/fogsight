import React from 'react';
import {spring, useCurrentFrame, useVideoConfig} from 'remotion';
import type {ThemeConfig, TreeNode} from '../types';

interface TreeVisualProps {
	root: TreeNode;
	highlight?: string[];
	theme: ThemeConfig;
}

interface LayoutTreeNode {
	id: string;
	label: string;
	x: number;
	y: number;
	depth: number;
	children: LayoutTreeNode[];
}

function countLeaves(node: TreeNode): number {
	if (!node.children || node.children.length === 0) return 1;
	return node.children.reduce((sum, c) => sum + countLeaves(c), 0);
}

function layoutTree(
	node: TreeNode,
	depth: number,
	xStart: number,
	xEnd: number,
	levelHeight: number,
	topPadding: number,
): LayoutTreeNode {
	const x = (xStart + xEnd) / 2;
	const y = topPadding + depth * levelHeight;

	const children: LayoutTreeNode[] = [];
	if (node.children && node.children.length > 0) {
		const totalLeaves = node.children.reduce((s, c) => s + countLeaves(c), 0);
		let currentX = xStart;
		for (const child of node.children) {
			const childLeaves = countLeaves(child);
			const childWidth = ((childLeaves / totalLeaves) * (xEnd - xStart));
			children.push(
				layoutTree(child, depth + 1, currentX, currentX + childWidth, levelHeight, topPadding),
			);
			currentX += childWidth;
		}
	}

	return {id: node.id, label: node.label, x, y, depth, children};
}

function getMaxDepth(node: TreeNode, depth = 0): number {
	if (!node.children || node.children.length === 0) return depth;
	return Math.max(...node.children.map((c) => getMaxDepth(c, depth + 1)));
}

function flattenNodes(node: LayoutTreeNode): LayoutTreeNode[] {
	return [node, ...node.children.flatMap((c) => flattenNodes(c))];
}

interface EdgeInfo {
	parentX: number;
	parentY: number;
	childX: number;
	childY: number;
	depth: number;
}

function collectEdges(node: LayoutTreeNode): EdgeInfo[] {
	const edges: EdgeInfo[] = [];
	for (const child of node.children) {
		edges.push({
			parentX: node.x,
			parentY: node.y,
			childX: child.x,
			childY: child.y,
			depth: child.depth,
		});
		edges.push(...collectEdges(child));
	}
	return edges;
}

const NODE_RADIUS = 28;

export const TreeVisual: React.FC<TreeVisualProps> = ({root, highlight = [], theme}) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();

	const width = 800;
	const height = 450;
	const maxDepth = Math.min(getMaxDepth(root), 5);
	const levelHeight = Math.min(90, (height - 80) / Math.max(maxDepth, 1));

	const layoutRoot = layoutTree(root, 0, 40, width - 40, levelHeight, 50);
	const allNodes = flattenNodes(layoutRoot);
	const allEdges = collectEdges(layoutRoot);

	const highlightSet = new Set(highlight);

	return (
		<div style={{position: 'relative', width, height}}>
			<svg
				viewBox={`0 0 ${width} ${height}`}
				width={width}
				height={height}
				style={{position: 'absolute', top: 0, left: 0}}
			>
				{allEdges.map((edge, i) => {
					const edgeProgress = spring({
						frame: frame - edge.depth * 8,
						fps,
						config: {damping: 15, stiffness: 80},
					});

					const midY = (edge.parentY + edge.childY) / 2;
					const path = `M ${edge.parentX} ${edge.parentY + NODE_RADIUS}
						C ${edge.parentX} ${midY}, ${edge.childX} ${midY}, ${edge.childX} ${edge.childY - NODE_RADIUS}`;

					return (
						<path
							key={`edge-${i}`}
							d={path}
							fill="none"
							stroke={`${theme.primary}88`}
							strokeWidth={2}
							opacity={edgeProgress}
							strokeDasharray={200}
							strokeDashoffset={200 * (1 - edgeProgress)}
						/>
					);
				})}

				{allNodes.map((node) => {
					const nodeProgress = spring({
						frame: frame - node.depth * 8,
						fps,
						config: {damping: 12, stiffness: 120},
					});

					const isHighlighted = highlightSet.has(node.id);
					const fillColor = isHighlighted ? theme.accent : theme.primary;

					return (
						<g key={node.id} opacity={nodeProgress} transform={`translate(${node.x}, ${node.y})`}>
							<circle
								r={NODE_RADIUS * nodeProgress}
								fill={`${fillColor}25`}
								stroke={fillColor}
								strokeWidth={2}
							/>
							{isHighlighted && (
								<circle
									r={NODE_RADIUS * nodeProgress + 4}
									fill="none"
									stroke={theme.accent}
									strokeWidth={1}
									opacity={0.4}
								/>
							)}
							<text
								fill={theme.textColor}
								fontSize={15}
								fontFamily={theme.fontFamily}
								fontWeight={600}
								textAnchor="middle"
								dominantBaseline="central"
								opacity={nodeProgress}
							>
								{node.label}
							</text>
						</g>
					);
				})}
			</svg>
		</div>
	);
};
