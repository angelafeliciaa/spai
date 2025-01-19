import { supabase, initializeSpeechRecognition, uploadToSupabase } from './app';

const videoElement = document.getElementById('preview');
const startButton = document.getElementById('startCapture');
const stopButton = document.getElementById('stopCapture');
const snapshotButton = document.getElementById('takeSnapshot');

let localStream = null;
let recognition = null;

// Event listeners
startButton.addEventListener('click', startCapture);
stopButton.addEventListener('click', stopCapture);
snapshotButton.addEventListener('click', takeSnapshot);

async function startCapture() {
  try {
    // Initialize media capture
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    videoElement.srcObject = stream;
    localStream = stream;

    // Initialize speech recognition
    recognition = initializeSpeechRecognition(
      (transcript) => console.log('Recognized:', transcript),
      (error) => console.error('Speech recognition error:', error)
    );

    if (recognition) {
      try {
        recognition.start();
        console.log('Speech recognition started.');
      } catch (error) {
        console.error('Speech recognition failed to start:', error);
      }
    }

    startButton.disabled = true;
    stopButton.disabled = false;
    snapshotButton.disabled = false;

    console.log('Media capture started.');
  } catch (error) {
    console.error('Error starting camera:', error);
  }
}

function stopCapture() {
  if (localStream) {
    localStream.getTracks().forEach((track) => track.stop());
    localStream = null;
  }

  if (recognition) {
    recognition.stop();
    recognition = null;
    console.log('Speech recognition stopped.');
  }

  videoElement.srcObject = null;

  startButton.disabled = false;
  stopButton.disabled = true;
  snapshotButton.disabled = true;

  console.log('Media capture stopped.');
}

async function takeSnapshot() {
  if (!localStream) return;

  const canvas = document.createElement('canvas');
  canvas.width = videoElement.videoWidth;
  canvas.height = videoElement.videoHeight;

  const ctx = canvas.getContext('2d');
  ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));

  if (blob) {
    const fileName = `snapshot-${Date.now()}.png`;
    console.log('Taking snapshot...');
    await uploadToSupabase(blob, fileName);
  }
}
