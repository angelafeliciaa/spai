import { createClient } from '@supabase/supabase-js';
require('dotenv').config();

// Supabase client configuration
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Endpoints for HTTP interactions
// const HTTP_URL = 'http://YOUR_LLM_BACKEND_DOMAIN/upload';
const LLM_TEXT_URL = 'http://127.0.0.1:8000/chat'

// DOM elements
const videoElement = document.getElementById('preview');
const startButton = document.getElementById('startCapture');
const stopButton = document.getElementById('stopCapture');
const cameraCheckbox = document.getElementById('enableCamera');
const micCheckbox = document.getElementById('enableMic');

let mediaRecorder;
let localStream;
let capturing = false;
let chunks = []; // Array to store video/audio chunks
let recognition;
let usingSpeechRecognition = false;

// Speech recognition setup
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
if (SpeechRecognition) {
  recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = false;
  recognition.lang = 'en-US';

  recognition.onresult = (event) => {
    const lastResultIndex = event.results.length - 1;
    const transcript = event.results[lastResultIndex][0].transcript.trim();
    console.log('Recognized transcript:', transcript);
    sendTranscript(transcript);
  };

  recognition.onerror = (event) => {
    console.error('Speech recognition error:', event.error);
  };
}

// Event listeners
startButton.addEventListener('click', startCapture);
stopButton.addEventListener('click', stopCapture);

// Start capturing media
function startCapture() {
  if (capturing) return;

  const constraints = {
    video: cameraCheckbox.checked,
    audio: micCheckbox.checked,
  };

  if (!constraints.video && !constraints.audio) {
    alert('Please enable at least one media device to start capturing.');
    return;
  }

  navigator.mediaDevices.getUserMedia(constraints)
    .then((stream) => {
      localStream = stream;

      if (constraints.video) {
        videoElement.srcObject = stream;

        const mimeType = MediaRecorder.isTypeSupported('video/webm; codecs=vp9') ? 'video/webm; codecs=vp9' : 'video/webm';
        mediaRecorder = new MediaRecorder(stream, { mimeType });
        chunks = [];
        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            chunks.push(event.data);
          }
        };
        mediaRecorder.start(1000);
      }

      if (constraints.audio && SpeechRecognition) {
        usingSpeechRecognition = true;
        try {
          recognition.start();
          console.log('Speech recognition started.');
        } catch (e) {
          console.error('Speech recognition failed to start:', e);
        }
      }

      capturing = true;
      startButton.disabled = true;
      stopButton.disabled = false;
      console.log('Media capture started.');
    })
    .catch((error) => {
      console.error('Error accessing media devices:', error);
    });
}

// Stop capturing media
function stopCapture() {
  if (!capturing) return;

  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
  }

  if (localStream) {
    localStream.getTracks().forEach((track) => track.stop());
  }

  if (usingSpeechRecognition && recognition) {
    recognition.stop();
    usingSpeechRecognition = false;
    console.log('Speech recognition stopped.');
  }

  videoElement.srcObject = null;
  capturing = false;
  startButton.disabled = false;
  stopButton.disabled = true;
  console.log('Media capture stopped.');

  if (chunks.length > 0) {
    const combinedBlob = new Blob(chunks, { type: 'video/webm' });
    const fileName = `media-${Date.now()}.webm`;
    uploadToSupabase(combinedBlob, fileName);
    chunks = [];
  }
}

// Upload media to Supabase
async function uploadToSupabase(blob, fileName) {
  console.log('Uploading media to Supabase:', fileName);

  const { data, error } = await supabase.storage
    .from('media-files') // Replace with your Supabase bucket name
    .upload(fileName, blob, {
      contentType: blob.type,
      cacheControl: '3600', // Cache duration (optional)
    });

  if (error) {
    console.error('Error uploading to Supabase:', error);
  } else {
    console.log('Successfully uploaded to Supabase:', data);
  }
}

// Send transcript to backend
function sendTranscript(text) {
  console.log('Sending transcript:', text);
  fetch(LLM_TEXT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ transcript: text }),
  })
    .then((response) => response.json())
    .then((data) => {
      console.log('Transcript sent. Server response:', data);
    })
    .catch((error) => {
      console.error('Error sending transcript:', error);
    });
}
