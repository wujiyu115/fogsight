import React from 'react';
import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import type {ThemeConfig, FormulaScene as FormulaSceneType} from '../types';
import {AnimatedText} from '../components/AnimatedText';

interface Props {
	scene: FormulaSceneType;
	theme: ThemeConfig;
}

export const FormulaScene: React.FC<Props> = ({scene, theme}) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();

	const lineProgress = spring({
		frame: frame - 20,
		fps,
		config: {damping: 15, stiffness: 100},
	});

	const formulaChars = scene.formula.length;
	const charsRevealed = Math.floor(
		interpolate(frame, [15, 15 + formulaChars * 2], [0, formulaChars], {
			extrapolateLeft: 'clamp',
			extrapolateRight: 'clamp',
		}),
	);

	const cursorOpacity = Math.round(frame / 15) % 2 === 0 ? 1 : 0;
	const showCursor = charsRevealed < formulaChars;

	const descProgress = spring({
		frame: frame - 20 - formulaChars * 2,
		fps,
		config: {damping: 15, stiffness: 100},
	});

	return (
		<AbsoluteFill
			style={{
				fontFamily: theme.fontFamily,
				flexDirection: 'column',
				justifyContent: 'center',
				alignItems: 'center',
				gap: 40,
				padding: '80px 120px',
			}}
		>
			<AnimatedText
				text={scene.title}
				animation="slideUp"
				style={{
					fontSize: 44,
					fontWeight: 700,
					color: theme.textColor,
				}}
			/>

			<div
				style={{
					width: 120 * lineProgress,
					height: 2,
					backgroundColor: theme.accent,
					borderRadius: 1,
				}}
			/>

			<div
				style={{
					fontSize: 72,
					fontWeight: 300,
					color: theme.textColor,
					fontFamily: "'Georgia', 'Times New Roman', serif",
					letterSpacing: 4,
					textAlign: 'center',
					minHeight: 100,
					display: 'flex',
					alignItems: 'center',
				}}
			>
				<span>{scene.formula.slice(0, charsRevealed)}</span>
				{showCursor && (
					<span
						style={{
							borderRight: `3px solid ${theme.accent}`,
							marginLeft: 2,
							height: 60,
							opacity: cursorOpacity,
						}}
					/>
				)}
			</div>

			<div
				style={{
					width: 120 * lineProgress,
					height: 2,
					backgroundColor: theme.accent,
					borderRadius: 1,
				}}
			/>

			{scene.description && (
				<div
					style={{
						fontSize: 28,
						color: `${theme.textColor}bb`,
						textAlign: 'center',
						lineHeight: 1.6,
						opacity: descProgress,
						transform: `translateY(${15 * (1 - descProgress)}px)`,
						maxWidth: 800,
					}}
				>
					{scene.description}
				</div>
			)}
		</AbsoluteFill>
	);
};
