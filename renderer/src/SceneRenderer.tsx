import React from 'react';
import {Sequence, useVideoConfig} from 'remotion';
import type {SceneData, Scene} from './types';
import {Background} from './components/Background';
import {TitleScene} from './scenes/TitleScene';
import {ContentScene} from './scenes/ContentScene';
import {StepsScene} from './scenes/StepsScene';
import {CodeScene} from './scenes/CodeScene';
import {CompareScene} from './scenes/CompareScene';
import {SummaryScene} from './scenes/SummaryScene';

export const SceneRenderer: React.FC<{data: SceneData}> = ({data}) => {
	const {fps} = useVideoConfig();
	const {theme, scenes} = data;

	let currentFrame = 0;

	return (
		<>
			<Background theme={theme} />
			{scenes.map((scene, index) => {
				const durationInFrames = Math.round(scene.duration * fps);
				const fromFrame = currentFrame;
				currentFrame += durationInFrames;

				return (
					<Sequence
						key={index}
						from={fromFrame}
						durationInFrames={durationInFrames}
						name={`${scene.type}-${index}`}
					>
						<SceneSwitch scene={scene} theme={theme} />
					</Sequence>
				);
			})}
		</>
	);
};

const SceneSwitch: React.FC<{scene: Scene; theme: SceneData['theme']}> = ({
	scene,
	theme,
}) => {
	switch (scene.type) {
		case 'title':
			return <TitleScene scene={scene} theme={theme} />;
		case 'content':
			return <ContentScene scene={scene} theme={theme} />;
		case 'steps':
			return <StepsScene scene={scene} theme={theme} />;
		case 'code':
			return <CodeScene scene={scene} theme={theme} />;
		case 'compare':
			return <CompareScene scene={scene} theme={theme} />;
		case 'summary':
			return <SummaryScene scene={scene} theme={theme} />;
		default:
			return null;
	}
};
