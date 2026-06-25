import express from 'express';
import path from 'path';
import {fileURLToPath} from 'url';
import {bundle} from '@remotion/bundler';
import {renderMedia, selectComposition} from '@remotion/renderer';
import {v4 as uuidv4} from 'uuid';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.join(__dirname, 'output');
const LOG_DIR = path.join(__dirname, 'logs');
const LOG_FILE = path.join(LOG_DIR, 'renderer.log');
const LOG_MAX_BYTES = 5 * 1024 * 1024; // 5MB
const LOG_BACKUPS = 5;
const PORT = process.env.RENDERER_PORT || 3001;

if (!fs.existsSync(OUTPUT_DIR)) {
	fs.mkdirSync(OUTPUT_DIR, {recursive: true});
}
if (!fs.existsSync(LOG_DIR)) {
	fs.mkdirSync(LOG_DIR, {recursive: true});
}

// 轮转文件日志：超过 LOG_MAX_BYTES 时滚动，保留 LOG_BACKUPS 个备份
function rotateLogIfNeeded() {
	try {
		if (!fs.existsSync(LOG_FILE)) return;
		if (fs.statSync(LOG_FILE).size < LOG_MAX_BYTES) return;
		const oldest = `${LOG_FILE}.${LOG_BACKUPS}`;
		if (fs.existsSync(oldest)) fs.unlinkSync(oldest);
		for (let i = LOG_BACKUPS - 1; i >= 1; i--) {
			const from = `${LOG_FILE}.${i}`;
			const to = `${LOG_FILE}.${i + 1}`;
			if (fs.existsSync(from)) fs.renameSync(from, to);
		}
		fs.renameSync(LOG_FILE, `${LOG_FILE}.1`);
	} catch (e) {
		// 忽略轮转错误，不影响主流程
	}
}

function log(level, msg, extra) {
	const ts = new Date().toISOString();
	const line = `${ts} [${level}] ${msg}${extra ? ' ' + JSON.stringify(extra) : ''}\n`;
	process.stdout.write(line);
	try {
		rotateLogIfNeeded();
		fs.appendFileSync(LOG_FILE, line);
	} catch (e) {
		// 写日志失败不应影响业务
	}
}

const tasks = new Map();

let bundleLocation = null;

async function initBundle() {
	log('info', 'Bundling Remotion project...');
	const t0 = Date.now();
	bundleLocation = await bundle({
		entryPoint: path.resolve(__dirname, 'src/index.ts'),
		webpackOverride: (config) => config,
		onProgress: (progress) => {
			if (progress % 25 === 0) {
				log('info', `Bundle progress: ${progress}%`);
			}
		},
	});
	log('info', `Bundle ready at: ${bundleLocation}`, {durationSec: ((Date.now() - t0) / 1000).toFixed(2)});
}

async function renderVideo(taskId, sceneData) {
	const task = tasks.get(taskId);
	if (!task) return;

	const t0 = Date.now();
	const sceneCount = sceneData && Array.isArray(sceneData.scenes) ? sceneData.scenes.length : 0;
	const genId = task.genId || '-';
	log('info', `render start gen=${genId} task=${taskId}`, {scenes: sceneCount});

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
		log('info', `render done gen=${genId} task=${taskId}`, {
			scenes: sceneCount,
			durationSec: ((Date.now() - t0) / 1000).toFixed(2),
			output: outputPath,
		});
	} catch (err) {
		task.status = 'error';
		task.error = err.message;
		log('error', `render failed gen=${genId} task=${taskId}`, {
			scenes: sceneCount,
			durationSec: ((Date.now() - t0) / 1000).toFixed(2),
			err: err.message,
		});
	}
}

const app = express();
app.use(express.json({limit: '10mb'}));

app.post('/render', (req, res) => {
	if (!bundleLocation) {
		log('warn', 'render rejected: bundle not ready');
		return res.status(503).json({error: 'Renderer not ready, bundle still loading'});
	}

	const sceneData = req.body;
	if (!sceneData || !sceneData.meta || !sceneData.scenes) {
		log('warn', 'render rejected: invalid scene data');
		return res.status(400).json({error: 'Invalid scene data: must have meta and scenes'});
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

	log('info', `render queued gen=${genId || '-'} task=${taskId}`, {scenes: sceneData.scenes.length});
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
		log('info', `Renderer listening on port ${PORT}`);
	});
}

main().catch((err) => {
	log('error', `Fatal error: ${err && err.message ? err.message : err}`);
	process.exit(1);
});
