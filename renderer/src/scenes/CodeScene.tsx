import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import type {ThemeConfig, CodeScene as CodeSceneType} from '../types';
import {AnimatedText} from '../components/AnimatedText';

interface Props {
	scene: CodeSceneType;
	theme: ThemeConfig;
}

export const CodeScene: React.FC<Props> = ({scene, theme}) => {
	const frame = useCurrentFrame();

	const lines = scene.code.split('\n');
	const visibleLines = Math.floor(
		interpolate(frame, [20, 20 + lines.length * 4], [0, lines.length], {
			extrapolateLeft: 'clamp',
			extrapolateRight: 'clamp',
		}),
	);

	return (
		<AbsoluteFill
			style={{
				fontFamily: theme.fontFamily,
				padding: '60px 100px',
				flexDirection: 'column',
				gap: 30,
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

			<div
				style={{
					flex: 1,
					backgroundColor: '#1e1e2e',
					borderRadius: 16,
					padding: '30px 40px',
					overflow: 'hidden',
					boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
				}}
			>
				<div
					style={{
						display: 'flex',
						gap: 8,
						marginBottom: 20,
					}}
				>
					{['#ff5f57', '#febc2e', '#28c840'].map((color) => (
						<div
							key={color}
							style={{
								width: 12,
								height: 12,
								borderRadius: '50%',
								backgroundColor: color,
							}}
						/>
					))}
					<span
						style={{
							marginLeft: 12,
							fontSize: 14,
							color: '#888',
							fontFamily: "'SF Mono', 'Menlo', monospace",
						}}
					>
						{scene.language}
					</span>
				</div>

				<pre
					style={{
						margin: 0,
						fontFamily: "'SF Mono', 'Menlo', 'Consolas', monospace",
						fontSize: 22,
						lineHeight: 1.7,
						color: '#cdd6f4',
					}}
				>
					{lines.slice(0, visibleLines).map((line, i) => {
						const isHighlighted = scene.highlights?.includes(i);
						return (
							<div
								key={i}
								style={{
									padding: '2px 8px',
									borderRadius: 4,
									backgroundColor: isHighlighted
										? `${theme.primary}22`
										: 'transparent',
									borderLeft: isHighlighted
										? `3px solid ${theme.primary}`
										: '3px solid transparent',
								}}
							>
								<span style={{color: '#6c7086', marginRight: 16, userSelect: 'none'}}>
									{String(i + 1).padStart(3, ' ')}
								</span>
								{line}
							</div>
						);
					})}
				</pre>
			</div>
		</AbsoluteFill>
	);
};
