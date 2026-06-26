import React from 'react';
import {Sequence, useVideoConfig} from 'remotion';
import {TransitionSeries, linearTiming} from '@remotion/transitions';
import {fade} from '@remotion/transitions/fade';
import {slide} from '@remotion/transitions/slide';
import {wipe} from '@remotion/transitions/wipe';
import type {SceneData, Scene, TransitionConfig} from './types';
import {Background} from './components/Background';
import {TitleScene} from './scenes/TitleScene';
import {ContentScene} from './scenes/ContentScene';
import {StepsScene} from './scenes/StepsScene';
import {CodeScene} from './scenes/CodeScene';
import {CompareScene} from './scenes/CompareScene';
import {SummaryScene} from './scenes/SummaryScene';
import {TimelineScene} from './scenes/TimelineScene';
import {FormulaScene} from './scenes/FormulaScene';
import {QuoteScene} from './scenes/QuoteScene';
import {DiagramScene} from './scenes/DiagramScene';

export const SceneRenderer: React.FC<{data: SceneData}> = ({data}) => {
	const {fps} = useVideoConfig();
	const {theme, scenes, transition} = data;

	const hasTransitions = transition && transition.type !== 'none';

	if (!hasTransitions) {
		return <SequenceRenderer scenes={scenes} theme={theme} fps={fps} />;
	}

	const transitionDurationFrames = Math.round((transition.duration ?? 0.5) * fps);
	const presentation = getPresentation(transition);

	const elements: React.ReactNode[] = [];
	scenes.forEach((scene, index) => {
		const durationInFrames = Math.round(scene.duration * fps);
		elements.push(
			<TransitionSeries.Sequence
				key={`scene-${index}`}
				durationInFrames={durationInFrames}
			>
				<SceneSwitch scene={scene} theme={theme} />
			</TransitionSeries.Sequence>,
		);
		if (index < scenes.length - 1) {
			elements.push(
				<TransitionSeries.Transition
					key={`transition-${index}`}
					presentation={presentation}
					timing={linearTiming({durationInFrames: transitionDurationFrames})}
				/>,
			);
		}
	});

	return (
		<>
			<Background theme={theme} />
			<TransitionSeries>{elements}</TransitionSeries>
		</>
	);
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getPresentation(config: TransitionConfig): any {
	switch (config.type) {
		case 'fade':
			return fade();
		case 'slide':
			return slide({direction: config.direction ?? 'from-right'});
		case 'wipe':
			return wipe({direction: config.direction ?? 'from-left'});
		default:
			return fade();
	}
}

const SequenceRenderer: React.FC<{
	scenes: Scene[];
	theme: SceneData['theme'];
	fps: number;
}> = ({scenes, theme, fps}) => {
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
		case 'timeline':
			return <TimelineScene scene={scene} theme={theme} />;
		case 'formula':
			return <FormulaScene scene={scene} theme={theme} />;
		case 'quote':
			return <QuoteScene scene={scene} theme={theme} />;
		case 'diagram':
			return <DiagramScene scene={scene} theme={theme} />;
		default:
			return null;
	}
};
