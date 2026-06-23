import React from 'react';
import {
	AbsoluteFill,
	interpolate,
	useCurrentFrame,
	useVideoConfig,
} from 'remotion';
import type {ThemeConfig, StepsScene as StepsSceneType} from '../types';
import {AnimatedText} from '../components/AnimatedText';
import {ArrayVisual} from '../components/ArrayVisual';

interface Props {
	scene: StepsSceneType;
	theme: ThemeConfig;
}

export const StepsScene: React.FC<Props> = ({scene, theme}) => {
	const frame = useCurrentFrame();
	const {fps, durationInFrames} = useVideoConfig();

	const stepsCount = scene.steps.length;
	const framesPerStep = Math.floor((durationInFrames - 30) / stepsCount);
	const currentStepIndex = Math.min(
		Math.floor(Math.max(0, frame - 20) / framesPerStep),
		stepsCount - 1,
	);
	const currentStep = scene.steps[currentStepIndex];
	const prevStep = currentStepIndex > 0 ? scene.steps[currentStepIndex - 1] : undefined;

	return (
		<AbsoluteFill
			style={{
				fontFamily: theme.fontFamily,
				padding: '60px 100px',
				flexDirection: 'column',
				justifyContent: 'space-between',
				alignItems: 'center',
			}}
		>
			<div
				style={{
					display: 'flex',
					justifyContent: 'space-between',
					alignItems: 'center',
					width: '100%',
				}}
			>
				<AnimatedText
					text={scene.title}
					animation="slideLeft"
					style={{
						fontSize: 44,
						fontWeight: 700,
						color: theme.textColor,
					}}
				/>
				<span
					style={{
						fontSize: 24,
						color: theme.primary,
						fontWeight: 500,
					}}
				>
					Step {currentStepIndex + 1} / {stepsCount}
				</span>
			</div>

			<div style={{flex: 1, display: 'flex', alignItems: 'center', width: '100%'}}>
				<ArrayVisual
					data={currentStep.data}
					highlight={currentStep.highlight}
					animation={currentStep.action === 'swap' ? 'swap' : 'highlight'}
					theme={theme}
					prevData={prevStep?.data}
				/>
			</div>

			{currentStep.label && (
				<AnimatedText
					text={currentStep.label}
					animation="fadeIn"
					style={{
						fontSize: 26,
						color: `${theme.textColor}bb`,
						textAlign: 'center',
					}}
				/>
			)}

			<div style={{display: 'flex', gap: 8, padding: '20px 0'}}>
				{scene.steps.map((_, i) => (
					<div
						key={i}
						style={{
							width: 40,
							height: 4,
							borderRadius: 2,
							backgroundColor:
								i <= currentStepIndex ? theme.primary : `${theme.textColor}33`,
						}}
					/>
				))}
			</div>
		</AbsoluteFill>
	);
};
