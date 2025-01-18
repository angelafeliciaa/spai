// app.js

const videoElement = document.getElementById('preview');
const toggleButton = document.getElementById('toggleCapture');
const cameraCheckbox = document.getElementById('enableCamera');
const micCheckbox = document.getElementById('enableMic');

// Endpoints for HTTP interactions
const HTTP_URL = 'http://YOUR_LLM_BACKEND_DOMAIN/upload';        // For video data
const LLM_TEXT_URL = 'http://YOUR_LLM_BACKEND_DOMAIN/transcript'; // For text data

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

toggleButton.addEventListener('click', toggleCapture);

function toggleCapture() {
  if (!capturing) {
    // Determine constraints based on checkbox selections
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
        
        // If camera is enabled, attach video stream for preview and recording
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
        
        // If microphone is enabled and SpeechRecognition is available, start recognition
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
        toggleButton.textContent = 'Stop Capture';
        console.log('Media capture started.');
      })
      .catch(error => {
        console.error('Error accessing media devices.', error);
      });
  } else {
    // Stop capturing
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
    }
    
    // Stop video stream tracks if video was used
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    
    // Stop speech recognition if it was started
    if (usingSpeechRecognition && recognition) {
      recognition.stop();
      usingSpeechRecognition = false;
      console.log('Speech recognition stopped.');
    }

    videoElement.srcObject = null;
    capturing = false;
    toggleButton.textContent = 'Start Capture';
    console.log('Media capture stopped.');

    // Send video data if captured
    if (chunks.length > 0) {
      const combinedBlob = new Blob(chunks, { type: 'video/webm' });
      sendData(combinedBlob);
      chunks = [];
    }
  }
}

function sendData(blob) {
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
