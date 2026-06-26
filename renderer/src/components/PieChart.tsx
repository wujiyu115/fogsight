import React from 'react';
import {spring, useCurrentFrame, useVideoConfig} from 'remotion';
import type {ThemeConfig} from '../types';

interface PieChartProps {
	segments: Array<{label: string; value: number; color?: string}>;
	donut?: boolean;
	theme: ThemeConfig;
}

const DEFAULT_COLORS = [
	'#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
	'#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
	'#BB8FCE', '#85C1E9', '#F0B27A', '#82E0AA',
];

export const PieChart: React.FC<PieChartProps> = ({segments, donut = false, theme}) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();

	const total = segments.reduce((sum, s) => sum + s.value, 0);
	if (total === 0) return null;

	const cx = 200;
	const cy = 200;
	const radius = 140;
	const strokeWidth = donut ? 50 : radius;
	const drawRadius = donut ? radius : radius / 2;

	const circumference = 2 * Math.PI * drawRadius;
	let cumulativeAngle = -90;

	return (
		<div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 40}}>
			<svg viewBox="0 0 400 400" width={360} height={360}>
				{segments.map((segment, index) => {
					const fraction = segment.value / total;
					const arcLength = fraction * circumference;
					const startAngle = cumulativeAngle;
					cumulativeAngle += fraction * 360;

					const progress = spring({
						frame: frame - index * 5,
						fps,
						config: {damping: 15, stiffness: 100},
					});

					const dashOffset = circumference - arcLength * progress;

					return (
						<circle
							key={index}
							cx={cx}
							cy={cy}
							r={drawRadius}
							fill="none"
							stroke={segment.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length]}
							strokeWidth={strokeWidth}
							strokeDasharray={`${arcLength} ${circumference}`}
							strokeDashoffset={dashOffset}
							transform={`rotate(${startAngle} ${cx} ${cy})`}
							style={{opacity: progress}}
						/>
					);
				})}
			</svg>

			<div style={{display: 'flex', flexDirection: 'column', gap: 12}}>
				{segments.map((segment, index) => {
					const progress = spring({
						frame: frame - index * 5 - 10,
						fps,
						config: {damping: 15, stiffness: 120},
					});

					return (
						<div
							key={index}
							style={{
								display: 'flex',
								alignItems: 'center',
								gap: 10,
								opacity: progress,
								transform: `translateX(${20 * (1 - progress)}px)`,
							}}
						>
							<div
								style={{
									width: 16,
									height: 16,
									borderRadius: 4,
									backgroundColor: segment.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length],
									flexShrink: 0,
								}}
							/>
							<span style={{color: theme.textColor, fontSize: 20, fontFamily: theme.fontFamily, whiteSpace: 'nowrap'}}>
								{segment.label} ({Math.round((segment.value / total) * 100)}%)
							</span>
						</div>
					);
				})}
			</div>
		</div>
	);
};
