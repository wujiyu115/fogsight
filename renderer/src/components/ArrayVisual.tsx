import React from 'react';
import {spring, useCurrentFrame, useVideoConfig} from 'remotion';
import type {ThemeConfig} from '../types';

interface ArrayVisualProps {
	data: (number | string)[];
	highlight?: number[];
	colors?: string[];
	labels?: string[];
	animation?: 'swap' | 'insert' | 'highlight' | 'fade' | 'grow';
	theme: ThemeConfig;
	prevData?: (number | string)[];
}

const DEFAULT_COLORS = [
	'#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
	'#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
	'#BB8FCE', '#85C1E9', '#F0B27A', '#82E0AA',
];

export const ArrayVisual: React.FC<ArrayVisualProps> = ({
	data,
	highlight = [],
	colors,
	labels,
	animation = 'fade',
	theme,
	prevData,
}) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();

	const barMaxHeight = 280;
	const numericData = data.map((d) => (typeof d === 'number' ? d : 0));
	const maxVal = Math.max(...numericData, 1);
	const barColors = colors || DEFAULT_COLORS;

	return (
		<div
			style={{
				display: 'flex',
				alignItems: 'flex-end',
				justifyContent: 'center',
				gap: 16,
				height: barMaxHeight + (labels ? 100 : 60),
				padding: '0 40px',
			}}
		>
			{data.map((value, index) => {
				const isHighlighted = highlight.includes(index);
				const barHeight = (Number(value) / maxVal) * barMaxHeight;
				const barColor = barColors[index % barColors.length];
				const enterProgress = spring({
					frame: frame - index * 3,
					fps,
					config: {damping: 15, stiffness: 120},
				});

				let swapOffset = 0;
				if (
					animation === 'swap' &&
					prevData &&
					highlight.length === 2
				) {
					const [i, j] = highlight;
					const swapProgress = spring({
						frame: frame - 10,
						fps,
						config: {damping: 12, stiffness: 80},
					});
					const barWidth = 60 + 16;
					if (index === i) swapOffset = (j - i) * barWidth * swapProgress;
					if (index === j) swapOffset = (i - j) * barWidth * swapProgress;
				}

				return (
					<div
						key={index}
						style={{
							display: 'flex',
							flexDirection: 'column',
							alignItems: 'center',
							gap: 8,
							transform: `translateX(${swapOffset}px)`,
							transition: 'transform 0.3s ease',
						}}
					>
						<div
							style={{
								width: 60,
								height: barHeight * enterProgress,
								backgroundColor: isHighlighted
									? theme.accent
									: barColor,
								borderRadius: '8px 8px 4px 4px',
								boxShadow: isHighlighted
									? `0 0 20px ${theme.accent}40`
									: 'none',
								transition: 'background-color 0.3s',
							}}
						/>
						<span
							style={{
								color: theme.textColor,
								fontSize: 22,
								fontWeight: 600,
								fontFamily: theme.fontFamily,
								opacity: enterProgress,
							}}
						>
							{value}
						</span>
						{labels && labels[index] && (
							<span
								style={{
									color: barColor,
									fontSize: 16,
									fontWeight: 500,
									fontFamily: theme.fontFamily,
									opacity: enterProgress,
									textAlign: 'center',
									maxWidth: 80,
									lineHeight: 1.2,
								}}
							>
								{labels[index]}
							</span>
						)}
					</div>
				);
			})}
		</div>
	);
};
