import React from 'react';
import {
	AbsoluteFill,
	interpolate,
	spring,
	useCurrentFrame,
	useVideoConfig,
} from 'remotion';
import type {ThemeConfig, TitleScene as TitleSceneType} from '../types';
import {AnimatedText} from '../components/AnimatedText';

interface Props {
	scene: TitleSceneType;
	theme: ThemeConfig;
}

export const TitleScene: React.FC<Props> = ({scene, theme}) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();

	const lineProgress = spring({
		frame: frame - 15,
		fps,
		config: {damping: 20, stiffness: 60},
	});
	const lineWidth = interpolate(lineProgress, [0, 1], [0, 120]);

	return (
		<AbsoluteFill
			style={{
				justifyContent: 'center',
				alignItems: 'center',
				fontFamily: theme.fontFamily,
			}}
		>
			<div style={{textAlign: 'center', maxWidth: '80%'}}>
				<AnimatedText
					text={scene.title}
					animation="scaleIn"
					style={{
						fontSize: 80,
						fontWeight: 700,
						color: theme.textColor,
						lineHeight: 1.2,
					}}
				/>

				<div
					style={{
						width: lineWidth,
						height: 4,
						backgroundColor: theme.accent,
						margin: '30px auto',
						borderRadius: 2,
					}}
				/>

				{scene.subtitle && (
					<AnimatedText
						text={scene.subtitle}
						animation="fadeIn"
						delay={20}
						style={{
							fontSize: 36,
							fontWeight: 300,
							color: theme.primary,
							letterSpacing: 4,
						}}
					/>
				)}

				{scene.description && (
					<div style={{marginTop: 24}}>
						<AnimatedText
							text={scene.description}
							animation="slideUp"
							delay={35}
							style={{
								fontSize: 28,
								color: `${theme.textColor}99`,
								fontWeight: 400,
							}}
						/>
					</div>
				)}
			</div>
		</AbsoluteFill>
	);
};
