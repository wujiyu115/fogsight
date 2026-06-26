import React from 'react';
import {Composition} from 'remotion';
import {SceneRenderer} from './SceneRenderer';
import type {SceneData} from './types';

const DEFAULT_DATA: SceneData = {
	meta: {title: 'Fogsight', fps: 30, width: 1920, height: 1080},
	theme: {
		background: '#0f172a',
		primary: '#3b82f6',
		accent: '#f59e0b',
		textColor: '#f8fafc',
		fontFamily: 'Inter, sans-serif',
	},
	scenes: [
		{type: 'title', duration: 3, title: 'Fogsight', subtitle: '雾象', description: 'AI 教学动画生成器'},
	],
};

export const RemotionRoot: React.FC = () => {
	return (
		<Composition
			id="FogsightVideo"
			component={SceneRenderer}
			defaultProps={{data: DEFAULT_DATA}}
			calculateMetadata={({props}) => {
				const {data} = props;
				const totalSceneDuration = data.scenes.reduce(
					(sum, scene) => sum + scene.duration,
					0,
				);

				let transitionOverlap = 0;
				if (data.transition && data.transition.type !== 'none' && data.scenes.length > 1) {
					const transitionDuration = data.transition.duration ?? 0.5;
					transitionOverlap = (data.scenes.length - 1) * transitionDuration;
				}

				const totalDuration = totalSceneDuration - transitionOverlap;

				return {
					fps: data.meta.fps,
					width: data.meta.width,
					height: data.meta.height,
					durationInFrames: Math.round(totalDuration * data.meta.fps),
				};
			}}
		/>
	);
};
