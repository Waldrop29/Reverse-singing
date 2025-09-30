// ...existing code...
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const playBtn = document.getElementById('playRecording');
const playReversedBtn = document.getElementById('playReversed');
const statusP = document.getElementById('status');
const audioEl = document.getElementById('recordedAudio');

let mediaRecorder = null;
let recordedChunks = [];
let recordedBlob = null;
let reversedBuffer = null; // AudioBuffer holding reversed audio

function setStatus(text) {
	statusP.textContent = 'Status: ' + text;
}

async function startRecording() {
	try {
		setStatus('requesting microphone');
		const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
		setStatus('recording');

		recordedChunks = [];
		mediaRecorder = new MediaRecorder(stream);

		mediaRecorder.addEventListener('dataavailable', (e) => {
			if (e.data && e.data.size > 0) recordedChunks.push(e.data);
		});

		mediaRecorder.addEventListener('stop', () => {
			recordedBlob = new Blob(recordedChunks, { type: 'audio/webm' });
			const url = URL.createObjectURL(recordedBlob);
			audioEl.src = url;
			audioEl.controls = true;
			playBtn.disabled = false;
			// prepare reversed audio automatically
			prepareReversed();
			setStatus('stopped');
			// Stop all tracks to release the microphone
			stream.getTracks().forEach(t => t.stop());
		});

		mediaRecorder.start();
		startBtn.disabled = true;
		stopBtn.disabled = false;
	} catch (err) {
		console.error('Microphone permission or error:', err);
		setStatus('error: ' + (err.message || err.name));
	}
}

function stopRecording() {
	if (!mediaRecorder) return;
	setStatus('finalizing');
	mediaRecorder.stop();
	startBtn.disabled = false;
	stopBtn.disabled = true;
}

playBtn.addEventListener('click', () => {
	if (!audioEl.src) return;
	audioEl.play();
});

// Play reversed: decode the recorded blob into an AudioBuffer, reverse channel data and play
async function prepareReversed() {
	if (!recordedBlob) return;
	const arrayBuffer = await recordedBlob.arrayBuffer();
	const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
	try {
		const decoded = await audioCtx.decodeAudioData(arrayBuffer);
		const numChannels = decoded.numberOfChannels;
		const length = decoded.length;
		const sampleRate = decoded.sampleRate;

		// Create a new buffer and copy reversed channel data
		const revBuffer = audioCtx.createBuffer(numChannels, length, sampleRate);
		for (let ch = 0; ch < numChannels; ch++) {
			const src = decoded.getChannelData(ch);
			const dst = revBuffer.getChannelData(ch);
			// reverse sample order
			for (let i = 0, j = length - 1; i < length; i++, j--) {
				dst[i] = src[j];
			}
		}
		reversedBuffer = revBuffer;
		playReversedBtn.disabled = false;
		setStatus('reversed ready');
	} catch (err) {
		console.error('Error decoding audio for reversal', err);
		setStatus('error preparing reversed: ' + (err.message || err.name));
	}
}

function playReversed() {
	if (!reversedBuffer) return;
	const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
	const src = audioCtx.createBufferSource();
	src.buffer = reversedBuffer;
	src.connect(audioCtx.destination);
	src.start();
	setStatus('playing reversed');
	src.onended = () => setStatus('idle');
}

startBtn.addEventListener('click', startRecording);
stopBtn.addEventListener('click', stopRecording);
playReversedBtn.addEventListener('click', playReversed);

// When recording is stopped, prepare reversed audio automatically


// Initialize UI state
setStatus('idle');