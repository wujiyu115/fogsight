import React from 'react';
import {interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import type {ThemeConfig} from '../types';

interface LineChartProps {
	points: number[];
	labels?: string[];
	lineColor?: string;
	fillArea?: boolean;
	theme: ThemeConfig;
}

export const LineChart: React.FC<LineChartProps> = ({
	points,
	labels,
	lineColor,
	fillArea = false,
	theme,
}) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();

	if (points.length === 0) return null;

	const padding = {top: 30, right: 30, bottom: 50, left: 60};
	const width = 700;
	const height = 380;
	const chartW = width - padding.left - padding.right;
	const chartH = height - padding.top - padding.bottom;

	const minVal = Math.min(...points);
	const maxVal = Math.max(...points);
	const range = maxVal - minVal || 1;

	const coords = points.map((val, i) => ({
		x: padding.left + (i / Math.max(points.length - 1, 1)) * chartW,
		y: padding.top + chartH - ((val - minVal) / range) * chartH,
	}));

	const linePoints = coords.map((c) => `${c.x},${c.y}`).join(' ');
	const fillPoints = `${padding.left},${padding.top + chartH} ${linePoints} ${coords[coords.length - 1].x},${padding.top + chartH}`;

	const totalLength = coords.reduce((sum, c, i) => {
		if (i === 0) return 0;
		const prev = coords[i - 1];
		return sum + Math.sqrt((c.x - prev.x) ** 2 + (c.y - prev.y) ** 2);
	}, 0);

	const drawProgress = spring({
		frame,
		fps,
		config: {damping: 20, stiffness: 60},
	});

	const dashOffset = totalLength * (1 - drawProgress);
	const color = lineColor || theme.primary;

	const yTicks = 5;
	const yStep = range / (yTicks - 1);

	return (
		<svg viewBox={`0 0 ${width} ${height}`} width="100%" height="100%">
			{Array.from({length: yTicks}).map((_, i) => {
				const val = minVal + yStep * i;
				const y = padding.top + chartH - (i / (yTicks - 1)) * chartH;
				return (
					<g key={`y-${i}`}>
						<line
							x1={padding.left}
							y1={y}
							x2={padding.left + chartW}
							y2={y}
							stroke={`${theme.textColor}15`}
							strokeWidth={1}
						/>
						<text
							x={padding.left - 10}
							y={y + 5}
							fill={`${theme.textColor}88`}
							fontSize={14}
							fontFamily={theme.fontFamily}
							textAnchor="end"
						>
							{Math.round(val)}
						</text>
					</g>
				);
			})}

			{fillArea && (
				<polygon
					points={fillPoints}
					fill={color}
					opacity={0.15 * drawProgress}
				/>
			)}

			<polyline
				points={linePoints}
				fill="none"
				stroke={color}
				strokeWidth={3}
				strokeLinecap="round"
				strokeLinejoin="round"
				strokeDasharray={totalLength}
				strokeDashoffset={dashOffset}
			/>

			{coords.map((c, i) => {
				const dotProgress = spring({
					frame: frame - 10 - i * 3,
					fps,
					config: {damping: 12, stiffness: 120},
				});
				return (
					<circle
						key={i}
						cx={c.x}
						cy={c.y}
						r={5 * dotProgress}
						fill={color}
						stroke={theme.background}
						strokeWidth={2}
					/>
				);
			})}

			{labels &&
				labels.map((label, i) => {
					if (i >= coords.length) return null;
					const labelProgress = spring({
						frame: frame - 15 - i * 3,
						fps,
						config: {damping: 15, stiffness: 120},
					});
					return (
						<text
							key={i}
							x={coords[i].x}
							y={padding.top + chartH + 30}
							fill={`${theme.textColor}aa`}
							fontSize={14}
							fontFamily={theme.fontFamily}
							textAnchor="middle"
							opacity={labelProgress}
						>
							{label}
						</text>
					);
				})}
		</svg>
	);
};
