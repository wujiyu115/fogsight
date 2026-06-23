import React from 'react';
import {interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';

type Animation = 'fadeIn' | 'slideUp' | 'slideLeft' | 'typewriter' | 'scaleIn';

interface AnimatedTextProps {
	text: string;
	animation?: Animation;
	delay?: number;
	style?: React.CSSProperties;
	charByChar?: boolean;
}

export const AnimatedText: React.FC<AnimatedTextProps> = ({
	text,
	animation = 'fadeIn',
	delay = 0,
	style = {},
	charByChar = false,
}) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const adjustedFrame = frame - delay;

	if (charByChar && animation === 'typewriter') {
		const charsVisible = Math.floor(
			interpolate(adjustedFrame, [0, text.length * 2], [0, text.length], {
				extrapolateLeft: 'clamp',
				extrapolateRight: 'clamp',
			}),
		);
		return (
			<span style={style}>
				{text.slice(0, charsVisible)}
				{charsVisible < text.length && (
					<span
						style={{
							opacity: Math.sin(frame * 0.3) > 0 ? 1 : 0,
							borderRight: '2px solid currentColor',
							marginLeft: 2,
						}}
					/>
				)}
			</span>
		);
	}

	const animStyle = getAnimationStyle(animation, adjustedFrame, fps);

	return <span style={{...style, ...animStyle, display: 'inline-block'}}>{text}</span>;
};

function getAnimationStyle(
	animation: Animation,
	frame: number,
	fps: number,
): React.CSSProperties {
	const progress = spring({frame, fps, config: {damping: 20, stiffness: 100}});

	switch (animation) {
		case 'fadeIn':
			return {opacity: progress};
		case 'slideUp':
			return {
				opacity: progress,
				transform: `translateY(${interpolate(progress, [0, 1], [40, 0])}px)`,
			};
		case 'slideLeft':
			return {
				opacity: progress,
				transform: `translateX(${interpolate(progress, [0, 1], [60, 0])}px)`,
			};
		case 'scaleIn':
			return {
				opacity: progress,
				transform: `scale(${interpolate(progress, [0, 1], [0.8, 1])})`,
			};
		case 'typewriter':
			return {opacity: progress};
		default:
			return {opacity: progress};
	}
}
