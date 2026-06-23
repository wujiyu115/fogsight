import React from 'react';
import {interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import type {ThemeConfig} from '../types';

interface ArrayVisualProps {
	data: (number | string)[];
	highlight?: number[];
	animation?: 'swap' | 'insert' | 'highlight' | 'fade' | 'grow';
	theme: ThemeConfig;
	prevData?: (number | string)[];
}

export const ArrayVisual: React.FC<ArrayVisualProps> = ({
	data,
	highlight = [],
	animation = 'fade',
	theme,
	prevData,
}) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();

	const barMaxHeight = 280;
	const numericData = data.map((d) => (typeof d === 'number' ? d : 0));
	const maxVal = Math.max(...numericData, 1);

	return (
		<div
			style={{
				display: 'flex',
				alignItems: 'flex-end',
				justifyContent: 'center',
				gap: 12,
				height: barMaxHeight + 60,
				padding: '0 40px',
			}}
		>
			{data.map((value, index) => {
				const isHighlighted = highlight.includes(index);
				const barHeight = (Number(value) / maxVal) * barMaxHeight;
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
					const barWidth = 60 + 12;
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
									: theme.primary,
								borderRadius: '8px 8px 4px 4px',
								boxShadow: isHighlighted
									? `0 0 20px ${theme.accent}40`
									: 'none',
								transition: 'background-color 0.3s',
							}}
						/>
						<span
							style={{
								color: isHighlighted ? theme.accent : theme.textColor,
								fontSize: 22,
								fontWeight: 600,
								fontFamily: theme.fontFamily,
								opacity: enterProgress,
							}}
						>
							{value}
						</span>
					</div>
				);
			})}
		</div>
	);
};
