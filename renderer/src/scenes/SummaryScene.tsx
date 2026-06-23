import React from 'react';
import {AbsoluteFill, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import type {ThemeConfig, SummaryScene as SummarySceneType} from '../types';
import {AnimatedText} from '../components/AnimatedText';

interface Props {
	scene: SummarySceneType;
	theme: ThemeConfig;
}

export const SummaryScene: React.FC<Props> = ({scene, theme}) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();

	return (
		<AbsoluteFill
			style={{
				fontFamily: theme.fontFamily,
				padding: '80px 120px',
				flexDirection: 'column',
				justifyContent: 'center',
				gap: 40,
			}}
		>
			{scene.title && (
				<AnimatedText
					text={scene.title}
					animation="slideUp"
					style={{
						fontSize: 48,
						fontWeight: 700,
						color: theme.textColor,
					}}
				/>
			)}

			<div style={{display: 'flex', flexDirection: 'column', gap: 20}}>
				{scene.points.map((point, i) => {
					const pointProgress = spring({
						frame: frame - 15 - i * 8,
						fps,
						config: {damping: 18, stiffness: 100},
					});
					return (
						<div
							key={i}
							style={{
								display: 'flex',
								alignItems: 'center',
								gap: 20,
								opacity: pointProgress,
								transform: `translateX(${(1 - pointProgress) * 40}px)`,
							}}
						>
							<div
								style={{
									width: 8,
									height: 8,
									borderRadius: '50%',
									backgroundColor: theme.accent,
									flexShrink: 0,
								}}
							/>
							<span
								style={{
									fontSize: 30,
									color: theme.textColor,
									lineHeight: 1.5,
								}}
							>
								{point}
							</span>
						</div>
					);
				})}
			</div>
		</AbsoluteFill>
	);
};
