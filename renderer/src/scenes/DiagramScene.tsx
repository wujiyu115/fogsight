import React from 'react';
import {AbsoluteFill} from 'remotion';
import type {ThemeConfig, DiagramScene as DiagramSceneType} from '../types';
import {AnimatedText} from '../components/AnimatedText';
import {FlowChart} from '../components/FlowChart';

interface Props {
	scene: DiagramSceneType;
	theme: ThemeConfig;
}

export const DiagramScene: React.FC<Props> = ({scene, theme}) => {
	return (
		<AbsoluteFill
			style={{
				fontFamily: theme.fontFamily,
				padding: '60px 100px',
				flexDirection: 'column',
				alignItems: 'center',
				gap: 20,
			}}
		>
			<AnimatedText
				text={scene.title}
				animation="slideLeft"
				style={{
					fontSize: 48,
					fontWeight: 700,
					color: theme.textColor,
					alignSelf: 'flex-start',
				}}
			/>

			{scene.description && (
				<AnimatedText
					text={scene.description}
					animation="fadeIn"
					delay={10}
					style={{
						fontSize: 24,
						color: `${theme.textColor}bb`,
						alignSelf: 'flex-start',
					}}
				/>
			)}

			<div
				style={{
					flex: 1,
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					width: '100%',
				}}
			>
				<FlowChart
					nodes={scene.flowchart.nodes}
					edges={scene.flowchart.edges}
					direction={scene.flowchart.direction}
					theme={theme}
				/>
			</div>
		</AbsoluteFill>
	);
};
