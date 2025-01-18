// app.js

const videoElement = document.getElementById('preview');
const startButton = document.getElementById('startCapture');
const stopButton = document.getElementById('stopCapture');
const cameraCheckbox = document.getElementById('enableCamera');
const micCheckbox = document.getElementById('enableMic');

// Endpoints for HTTP interactions
const HTTP_URL = 'http://YOUR_LLM_BACKEND_DOMAIN/upload';
const LLM_TEXT_URL = 'http://YOUR_LLM_BACKEND_DOMAIN/transcript';

let mediaRecorder;
let localStream;
let capturing = false;
let chunks = [];  // Array to store video chunks during capture

// Speech Recognition variables
let recognition;
let usingSpeechRecognition = false;

// Check for SpeechRecognition support
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
if (SpeechRecognition) {
  recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = false;
  recognition.lang = 'en-US';
  
  recognition.onresult = event => {
    const lastResultIndex = event.results.length - 1;
    const transcript = event.results[lastResultIndex][0].transcript.trim();
    console.log('Recognized:', transcript);
    sendTranscript(transcript);
  };
  
  recognition.onerror = event => {
    console.error("Speech recognition error:", event.error);
  };
}

// Attach event listeners to separate buttons
startButton.addEventListener('click', startCapture);
stopButton.addEventListener('click', stopCapture);

function startCapture() {
  if (capturing) return; // Prevent multiple starts

  const constraints = {
    video: cameraCheckbox.checked,
    audio: micCheckbox.checked
  };
  
  if (!constraints.video && !constraints.audio) {
    alert('Please enable at least one media device (camera or microphone) to start capturing.');
    return;
  }
  
  navigator.mediaDevices.getUserMedia(constraints)
    .then(stream => {
      localStream = stream;
      
      if (constraints.video) {
        videoElement.srcObject = stream;
        
        const mimeType = MediaRecorder.isTypeSupported('video/webm; codecs=vp9') ?
          'video/webm; codecs=vp9' : 'video/webm';

        mediaRecorder = new MediaRecorder(stream, { mimeType });
        chunks = [];
        mediaRecorder.ondataavailable = event => {
          if (event.data.size > 0) {
            chunks.push(event.data);
          }
        };
        mediaRecorder.start(1000); // capture video in chunks every second
      }
      
      if (constraints.audio && SpeechRecognition) {
        usingSpeechRecognition = true;
        try {
          recognition.start();
          console.log('Speech recognition started.');
        } catch (e) {
          console.error('Speech recognition failed to start:', e);
        }
      } else if (constraints.audio) {
        console.warn('Speech recognition not supported in this browser.');
      }

      capturing = true;
      startButton.disabled = true;
      stopButton.disabled = false;
      console.log('Media capture started.');
    })
    .catch(error => {
      console.error('Error accessing media devices.', error);
    });
}

function stopCapture() {
  if (!capturing) return; // If not capturing, do nothing
  
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
  }
  
  if (localStream) {
    localStream.getTracks().forEach(track => track.stop());
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
    sendData(combinedBlob);
    chunks = [];
  }
}

function sendData(blob) {
    console.log('Sending video blob of size:', blob.size, 'bytes');  // Log blob size
    const formData = new FormData();
    formData.append('file', blob, 'capture.webm');
    
    fetch(HTTP_URL, {
      method: 'POST',
      body: formData
    })
    .then(response => response.json())
    .then(data => {
      console.log('Server response:', data);
    })
    .catch(error => {
      console.error('Error sending video data:', error);
    });
  }

  function sendTranscript(text) {
    console.log('Sending transcript:', text);  // Log transcript text
    fetch(LLM_TEXT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcript: text })
    })
    .then(response => response.json())
    .then(data => {
      console.log('Transcript sent. Server response:', data);
    })
    .catch(error => {
      console.error('Error sending transcript:', error);
    });
  }