import React from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';
import type {ThemeConfig, ContentScene as ContentSceneType} from '../types';
import {AnimatedText} from '../components/AnimatedText';
import {ArrayVisual} from '../components/ArrayVisual';

interface Props {
	scene: ContentSceneType;
	theme: ThemeConfig;
}

export const ContentScene: React.FC<Props> = ({scene, theme}) => {
	const hasVisual = !!scene.visual;

	return (
		<AbsoluteFill
			style={{
				fontFamily: theme.fontFamily,
				padding: '80px 100px',
				flexDirection: hasVisual ? 'row' : 'column',
				justifyContent: hasVisual ? 'space-between' : 'center',
				alignItems: 'center',
				gap: 60,
			}}
		>
			<div
				style={{
					flex: hasVisual ? '0 0 45%' : '0 0 auto',
					display: 'flex',
					flexDirection: 'column',
					justifyContent: 'center',
					gap: 30,
				}}
			>
				<AnimatedText
					text={scene.title}
					animation="slideLeft"
					style={{
						fontSize: 52,
						fontWeight: 700,
						color: theme.textColor,
					}}
				/>
				<AnimatedText
					text={scene.body}
					animation="fadeIn"
					delay={15}
					style={{
						fontSize: 28,
						lineHeight: 1.6,
						color: `${theme.textColor}cc`,
						fontWeight: 400,
					}}
				/>
			</div>

			{hasVisual && scene.visual && (
				<div style={{flex: '0 0 50%'}}>
					{scene.visual.type === 'array' && scene.visual.data && (
						<ArrayVisual
							data={scene.visual.data}
							highlight={scene.visual.highlight}
							animation={scene.visual.animation}
							theme={theme}
						/>
					)}
				</div>
			)}
		</AbsoluteFill>
	);
};
