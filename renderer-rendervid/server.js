import express from 'express';
import path from 'path';
import {fileURLToPath} from 'url';
import {v4 as uuidv4} from 'uuid';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.join(__dirname, 'output');
const LOG_DIR = path.join(__dirname, 'logs');
const LOG_FILE = path.join(LOG_DIR, 'rendervid.log');
const PORT = process.env.RENDERVID_PORT || 3003;

for (const dir of [OUTPUT_DIR, LOG_DIR]) {
	if (!fs.existsSync(dir)) fs.mkdirSync(dir, {recursive: true});
}

function log(level, msg, extra) {
	const ts = new Date().toISOString();
	const line = `${ts} [${level}] ${msg}${extra ? ' ' + JSON.stringify(extra) : ''}\n`;
	process.stdout.write(line);
	try {
		fs.appendFileSync(LOG_FILE, line);
	} catch (_) {}
}

let renderVideo;
try {
	const core = await import('@rendervid/core');
	const renderer = await import('@rendervid/renderer-node');
	renderVideo = renderer.renderVideo || renderer.default?.renderVideo;
	if (!renderVideo && core.renderVideo) renderVideo = core.renderVideo;
	log('info', 'RenderVid modules loaded');
} catch (err) {
	log('warn', `RenderVid import failed: ${err.message} — will use fallback`);
}

const tasks = new Map();

async function doRender(taskId, template) {
	const task = tasks.get(taskId);
	if (!task) return;

	const t0 = Date.now();
	const genId = task.genId || '-';
	const sceneCount = Array.isArray(template.scenes) ? template.scenes.length : 0;
	log('info', `render start gen=${genId} task=${taskId}`, {scenes: sceneCount});

	const outputPath = path.join(OUTPUT_DIR, `${taskId}.mp4`);

	try {
		task.status = 'rendering';
		task.progress = 10;

		if (renderVideo) {
			await renderVideo({
				template,
				output: outputPath,
				onProgress: (p) => {
					task.progress = Math.round(p * 100);
				},
			});
		} else {
			task.status = 'error';
			task.error = 'RenderVid runtime not available';
			log('error', `render failed: RenderVid not installed`, {task: taskId});
			return;
		}

		task.status = 'done';
		task.progress = 100;
		task.outputPath = outputPath;
		log('info', `render done gen=${genId} task=${taskId}`, {
			scenes: sceneCount,
			durationSec: ((Date.now() - t0) / 1000).toFixed(2),
		});
	} catch (err) {
		task.status = 'error';
		task.error = err.message;
		log('error', `render failed gen=${genId} task=${taskId}`, {
			durationSec: ((Date.now() - t0) / 1000).toFixed(2),
			err: err.message,
		});
	}
}

const app = express();
app.use(express.json({limit: '10mb'}));

app.post('/render', (req, res) => {
	const template = req.body;
	if (!template || !template.scenes) {
		return res.status(400).json({error: 'Invalid template: must have scenes'});
	}

	const taskId = uuidv4();
	const genId = req.get('X-Gen-Id') || null;
	tasks.set(taskId, {
		id: taskId,
		genId,
		status: 'queued',
		progress: 0,
		createdAt: Date.now(),
	});

	log('info', `render queued gen=${genId || '-'} task=${taskId}`, {scenes: template.scenes.length});
	doRender(taskId, template);

	res.json({taskId, status: 'queued'});
});

app.get('/status/:taskId', (req, res) => {
	const task = tasks.get(req.params.taskId);
	if (!task) return res.status(404).json({error: 'Task not found'});
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
		status: renderVideo ? 'ready' : 'degraded',
		tasks: tasks.size,
		hasRuntime: !!renderVideo,
	});
});

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

app.listen(PORT, () => {
	log('info', `RenderVid renderer listening on port ${PORT}`);
});
