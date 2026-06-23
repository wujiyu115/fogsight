import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import type {ThemeConfig} from '../types';

export const Background: React.FC<{theme: ThemeConfig}> = ({theme}) => {
	const frame = useCurrentFrame();
	const gradientAngle = interpolate(frame, [0, 600], [135, 225], {
		extrapolateRight: 'extend',
	});

	return (
		<AbsoluteFill
			style={{
				background: `linear-gradient(${gradientAngle}deg, ${theme.background}, ${adjustBrightness(theme.background, 20)})`,
			}}
		>
			<svg
				width="100%"
				height="100%"
				style={{position: 'absolute', opacity: 0.05}}
			>
				<defs>
					<pattern
						id="grid"
						width="60"
						height="60"
						patternUnits="userSpaceOnUse"
					>
						<path
							d="M 60 0 L 0 0 0 60"
							fill="none"
							stroke={theme.textColor}
							strokeWidth="0.5"
						/>
					</pattern>
				</defs>
				<rect width="100%" height="100%" fill="url(#grid)" />
			</svg>
		</AbsoluteFill>
	);
};

function adjustBrightness(hex: string, amount: number): string {
	const num = parseInt(hex.replace('#', ''), 16);
	const r = Math.min(255, Math.max(0, ((num >> 16) & 0xff) + amount));
	const g = Math.min(255, Math.max(0, ((num >> 8) & 0xff) + amount));
	const b = Math.min(255, Math.max(0, (num & 0xff) + amount));
	return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}
