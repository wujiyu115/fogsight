import React from 'react';
import {AbsoluteFill, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import type {ThemeConfig, QuoteScene as QuoteSceneType} from '../types';

interface Props {
	scene: QuoteSceneType;
	theme: ThemeConfig;
}

export const QuoteScene: React.FC<Props> = ({scene, theme}) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();

	const cardProgress = spring({
		frame,
		fps,
		config: {damping: 15, stiffness: 80},
	});

	const quoteProgress = spring({
		frame: frame - 10,
		fps,
		config: {damping: 15, stiffness: 100},
	});

	const attrProgress = spring({
		frame: frame - 25,
		fps,
		config: {damping: 15, stiffness: 100},
	});

	return (
		<AbsoluteFill
			style={{
				fontFamily: theme.fontFamily,
				justifyContent: 'center',
				alignItems: 'center',
				padding: '100px 200px',
			}}
		>
			<div
				style={{
					position: 'relative',
					backgroundColor: `${theme.textColor}08`,
					borderRadius: 24,
					padding: '80px 80px 60px',
					maxWidth: 1200,
					width: '100%',
					opacity: cardProgress,
					transform: `scale(${0.9 + 0.1 * cardProgress})`,
					boxShadow: scene.highlight
						? `0 0 60px ${theme.accent}20, 0 0 120px ${theme.accent}10`
						: 'none',
					borderLeft: `4px solid ${theme.accent}`,
				}}
			>
				<div
					style={{
						position: 'absolute',
						top: 20,
						left: 40,
						fontSize: 120,
						fontFamily: 'Georgia, serif',
						color: theme.accent,
						opacity: 0.25 * quoteProgress,
						lineHeight: 1,
					}}
				>
					&ldquo;
				</div>

				<div
					style={{
						fontSize: 36,
						fontStyle: 'italic',
						color: theme.textColor,
						lineHeight: 1.7,
						textAlign: 'center',
						opacity: quoteProgress,
						transform: `translateY(${20 * (1 - quoteProgress)}px)`,
						position: 'relative',
						zIndex: 1,
					}}
				>
					{scene.quote}
				</div>

				{scene.attribution && (
					<div
						style={{
							marginTop: 40,
							fontSize: 24,
							color: theme.primary,
							textAlign: 'right',
							opacity: attrProgress,
							transform: `translateX(${20 * (1 - attrProgress)}px)`,
						}}
					>
						{scene.attribution}
					</div>
				)}
			</div>
		</AbsoluteFill>
	);
};
