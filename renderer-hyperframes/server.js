import express from 'express';
import path from 'path';
import {fileURLToPath} from 'url';
import {v4 as uuidv4} from 'uuid';
import fs from 'fs';
import {execFile} from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.join(__dirname, 'output');
const TEMP_DIR = path.join(__dirname, 'temp');
const LOG_DIR = path.join(__dirname, 'logs');
const LOG_FILE = path.join(LOG_DIR, 'hyperframes.log');
const PORT = process.env.HYPERFRAMES_PORT || 3002;

for (const dir of [OUTPUT_DIR, TEMP_DIR, LOG_DIR]) {
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

const tasks = new Map();

async function renderVideo(taskId, htmlContent) {
	const task = tasks.get(taskId);
	if (!task) return;

	const t0 = Date.now();
	const genId = task.genId || '-';
	log('info', `render start gen=${genId} task=${taskId}`);

	const taskDir = path.join(TEMP_DIR, taskId);
	const htmlPath = path.join(taskDir, 'index.html');
	const outputPath = path.join(OUTPUT_DIR, `${taskId}.mp4`);

	try {
		task.status = 'rendering';
		task.progress = 10;

		fs.mkdirSync(taskDir, {recursive: true});
		fs.writeFileSync(htmlPath, htmlContent, 'utf-8');

		await new Promise((resolve, reject) => {
			const args = ['render', taskDir, '--output', outputPath];
			log('info', `exec: npx hyperframes ${args.join(' ')}`);

			const proc = execFile('npx', ['hyperframes', ...args], {
				cwd: __dirname,
				timeout: 300000,
				shell: true,
				env: {...process.env},
			}, (error, stdout, stderr) => {
				if (error) {
					log('error', `hyperframes stderr: ${stderr}`);
					reject(error);
				} else {
					resolve(stdout);
				}
			});

			proc.stdout?.on('data', (data) => {
				const text = data.toString();
				const match = text.match(/(\d+)%/);
				if (match) task.progress = parseInt(match[1]);
			});
		});

		task.status = 'done';
		task.progress = 100;
		task.outputPath = outputPath;
		log('info', `render done gen=${genId} task=${taskId}`, {
			durationSec: ((Date.now() - t0) / 1000).toFixed(2),
		});
	} catch (err) {
		task.status = 'error';
		task.error = err.message;
		log('error', `render failed gen=${genId} task=${taskId}`, {
			durationSec: ((Date.now() - t0) / 1000).toFixed(2),
			err: err.message,
		});
	} finally {
		try { fs.rmSync(taskDir, {recursive: true, force: true}); } catch (_) {}
	}
}

const app = express();
app.use(express.json({limit: '10mb'}));

app.post('/render', (req, res) => {
	const html = typeof req.body === 'string' ? req.body : req.body.html;
	if (!html) {
		return res.status(400).json({error: 'Missing html content'});
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

	log('info', `render queued gen=${genId || '-'} task=${taskId}`, {htmlLen: html.length});
	renderVideo(taskId, html);

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
	res.json({status: 'ready', tasks: tasks.size});
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
	log('info', `HyperFrames renderer listening on port ${PORT}`);
});
