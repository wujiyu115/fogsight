import React from 'react';
import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import type {ThemeConfig, TimelineScene as TimelineSceneType} from '../types';
import {AnimatedText} from '../components/AnimatedText';

interface Props {
	scene: TimelineSceneType;
	theme: ThemeConfig;
}

export const TimelineScene: React.FC<Props> = ({scene, theme}) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();

	const lineProgress = spring({
		frame: frame - 10,
		fps,
		config: {damping: 20, stiffness: 60},
	});

	const events = scene.events;
	const timelineTop = 140;
	const timelineBottom = 960;
	const timelineHeight = timelineBottom - timelineTop;
	const centerX = 960;

	return (
		<AbsoluteFill
			style={{
				fontFamily: theme.fontFamily,
				padding: '60px 100px',
			}}
		>
			<AnimatedText
				text={scene.title}
				animation="slideLeft"
				style={{
					fontSize: 48,
					fontWeight: 700,
					color: theme.textColor,
				}}
			/>

			<div style={{position: 'absolute', top: 0, left: 0, width: '100%', height: '100%'}}>
				<svg
					viewBox="0 0 1920 1080"
					width="100%"
					height="100%"
					style={{position: 'absolute', top: 0, left: 0}}
				>
					<line
						x1={centerX}
						y1={timelineTop}
						x2={centerX}
						y2={timelineTop + timelineHeight * lineProgress}
						stroke={`${theme.primary}60`}
						strokeWidth={3}
						strokeLinecap="round"
					/>

					{events.map((event, i) => {
						const y = timelineTop + ((i + 0.5) / events.length) * timelineHeight;
						const dotProgress = spring({
							frame: frame - 15 - i * 10,
							fps,
							config: {damping: 12, stiffness: 120},
						});

						return (
							<circle
								key={`dot-${i}`}
								cx={centerX}
								cy={y}
								r={8 * dotProgress}
								fill={theme.accent}
								stroke={theme.background}
								strokeWidth={3}
							/>
						);
					})}
				</svg>

				{events.map((event, i) => {
					const y = timelineTop + ((i + 0.5) / events.length) * timelineHeight;
					const isLeft = i % 2 === 0;
					const cardProgress = spring({
						frame: frame - 18 - i * 10,
						fps,
						config: {damping: 15, stiffness: 100},
					});

					const offsetX = isLeft ? -40 : 40;
					const cardX = isLeft ? centerX - 420 : centerX + 60;
					const slideOffset = offsetX * (1 - cardProgress);

					return (
						<div
							key={`card-${i}`}
							style={{
								position: 'absolute',
								left: cardX,
								top: y - 40,
								width: 360,
								opacity: cardProgress,
								transform: `translateX(${slideOffset}px)`,
							}}
						>
							<div
								style={{
									backgroundColor: `${theme.textColor}08`,
									borderRadius: 12,
									padding: '16px 24px',
									borderLeft: isLeft ? 'none' : `3px solid ${theme.accent}`,
									borderRight: isLeft ? `3px solid ${theme.accent}` : 'none',
								}}
							>
								<div
									style={{
										fontSize: 16,
										fontWeight: 700,
										color: theme.accent,
										marginBottom: 6,
										fontFamily: theme.fontFamily,
									}}
								>
									{event.time}
								</div>
								<div
									style={{
										fontSize: 22,
										fontWeight: 600,
										color: theme.textColor,
										marginBottom: event.description ? 6 : 0,
										fontFamily: theme.fontFamily,
									}}
								>
									{event.title}
								</div>
								{event.description && (
									<div
										style={{
											fontSize: 16,
											color: `${theme.textColor}aa`,
											fontFamily: theme.fontFamily,
											lineHeight: 1.4,
										}}
									>
										{event.description}
									</div>
								)}
							</div>
						</div>
					);
				})}
			</div>
		</AbsoluteFill>
	);
};
