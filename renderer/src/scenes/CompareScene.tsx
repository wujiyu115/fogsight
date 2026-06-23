import React from 'react';
import {AbsoluteFill, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import type {ThemeConfig, CompareScene as CompareSceneType} from '../types';
import {AnimatedText} from '../components/AnimatedText';

interface Props {
	scene: CompareSceneType;
	theme: ThemeConfig;
}

export const CompareScene: React.FC<Props> = ({scene, theme}) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();

	return (
		<AbsoluteFill
			style={{
				fontFamily: theme.fontFamily,
				padding: '60px 100px',
				flexDirection: 'column',
				gap: 40,
			}}
		>
			<AnimatedText
				text={scene.title}
				animation="slideUp"
				style={{
					fontSize: 44,
					fontWeight: 700,
					color: theme.textColor,
					textAlign: 'center',
				}}
			/>

			<div
				style={{
					flex: 1,
					display: 'flex',
					gap: 40,
					alignItems: 'stretch',
				}}
			>
				{[scene.left, scene.right].map((side, sideIndex) => {
					const sideProgress = spring({
						frame: frame - 15 - sideIndex * 10,
						fps,
						config: {damping: 18, stiffness: 100},
					});
					return (
						<div
							key={sideIndex}
							style={{
								flex: 1,
								backgroundColor: `${theme.textColor}08`,
								borderRadius: 20,
								padding: '40px 36px',
								border: `1px solid ${theme.textColor}15`,
								opacity: sideProgress,
								transform: `translateY(${(1 - sideProgress) * 30}px)`,
							}}
						>
							<h3
								style={{
									fontSize: 32,
									fontWeight: 600,
									color: sideIndex === 0 ? theme.primary : theme.accent,
									marginBottom: 30,
									textAlign: 'center',
								}}
							>
								{side.label}
							</h3>
							{side.items.map((item, i) => {
								const itemProgress = spring({
									frame: frame - 25 - sideIndex * 10 - i * 5,
									fps,
									config: {damping: 20, stiffness: 120},
								});
								return (
									<div
										key={i}
										style={{
											fontSize: 24,
											color: theme.textColor,
											padding: '12px 0',
											borderBottom: `1px solid ${theme.textColor}10`,
											opacity: itemProgress,
											transform: `translateX(${(1 - itemProgress) * 20}px)`,
										}}
									>
										{item}
									</div>
								);
							})}
						</div>
					);
				})}
			</div>
		</AbsoluteFill>
	);
};
