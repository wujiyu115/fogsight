import express from 'express';
import path from 'path';
import {fileURLToPath} from 'url';
import {bundle} from '@remotion/bundler';
import {renderMedia, selectComposition} from '@remotion/renderer';
import {v4 as uuidv4} from 'uuid';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.join(__dirname, 'output');
const PORT = process.env.RENDERER_PORT || 3001;

if (!fs.existsSync(OUTPUT_DIR)) {
	fs.mkdirSync(OUTPUT_DIR, {recursive: true});
}

const tasks = new Map();

let bundleLocation = null;

async function initBundle() {
	console.log('[renderer] Bundling Remotion project...');
	bundleLocation = await bundle({
		entryPoint: path.resolve(__dirname, 'src/index.ts'),
		webpackOverride: (config) => config,
		onProgress: (progress) => {
			if (progress % 25 === 0) {
				console.log(`[renderer] Bundle progress: ${progress}%`);
			}
		},
	});
	console.log('[renderer] Bundle ready at:', bundleLocation);
}

async function renderVideo(taskId, sceneData) {
	const task = tasks.get(taskId);
	if (!task) return;

	try {
		task.status = 'rendering';
		task.progress = 0;

		const composition = await selectComposition({
			serveUrl: bundleLocation,
			id: 'FogsightVideo',
			inputProps: {data: sceneData},
		});

		const outputPath = path.join(OUTPUT_DIR, `${taskId}.mp4`);

		await renderMedia({
			composition,
			serveUrl: bundleLocation,
			codec: 'h264',
			outputLocation: outputPath,
			inputProps: {data: sceneData},
			onProgress: ({progress}) => {
				task.progress = Math.round(progress * 100);
			},
			chromiumOptions: {
				enableMultiProcessOnLinux: true,
			},
		});

		task.status = 'done';
		task.progress = 100;
		task.outputPath = outputPath;
		console.log(`[renderer] Task ${taskId} complete: ${outputPath}`);
	} catch (err) {
		task.status = 'error';
		task.error = err.message;
		console.error(`[renderer] Task ${taskId} failed:`, err.message);
	}
}

const app = express();
app.use(express.json({limit: '10mb'}));

app.post('/render', (req, res) => {
	if (!bundleLocation) {
		return res.status(503).json({error: 'Renderer not ready, bundle still loading'});
	}

	const sceneData = req.body;
	if (!sceneData || !sceneData.meta || !sceneData.scenes) {
		return res.status(400).json({error: 'Invalid scene data: must have meta and scenes'});
	}

	const taskId = uuidv4();
	tasks.set(taskId, {
		id: taskId,
		status: 'queued',
		progress: 0,
		createdAt: Date.now(),
	});

	renderVideo(taskId, sceneData);

	res.json({taskId, status: 'queued'});
});

app.get('/status/:taskId', (req, res) => {
	const task = tasks.get(req.params.taskId);
	if (!task) {
		return res.status(404).json({error: 'Task not found'});
	}
	res.json({
		id: task.id,
		status: task.status,
		progress: task.progress,
		error: task.error || null,
	});
});

app.get('/videos/:taskId.mp4', (req, res) => {
	const task = tasks.get(req.params.taskId);
	if (!task || task.status !== 'done') {
		return res.status(404).json({error: 'Video not ready'});
	}
	res.sendFile(task.outputPath);
});

app.get('/health', (_req, res) => {
	res.json({
		status: bundleLocation ? 'ready' : 'initializing',
		tasks: tasks.size,
	});
});

// Clean up old tasks and files (older than 1 hour)
setInterval(() => {
	const cutoff = Date.now() - 60 * 60 * 1000;
	for (const [id, task] of tasks) {
		if (task.createdAt < cutoff) {
			if (task.outputPath && fs.existsSync(task.outputPath)) {
				fs.unlinkSync(task.outputPath);
			}
			tasks.delete(id);
		}
	}
}, 10 * 60 * 1000);

async function main() {
	await initBundle();
	app.listen(PORT, () => {
		console.log(`[renderer] Listening on port ${PORT}`);
	});
}

main().catch((err) => {
	console.error('[renderer] Fatal error:', err);
	process.exit(1);
});
