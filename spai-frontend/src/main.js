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
      (transcript) => {
        console.log('Recognized transcript:', transcript);
        sendTranscript(transcript); // Send the recognized text to the backend
      },
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

function onTranscript(transcript) {
  console.log("Transcript:", transcript);

  // Step 0: We want the user's name
  if (currentStep === 0) {
    userName = transcript;
    currentStep = 1;
    statusDiv.textContent = `Hello ${userName}, please pose for a picture (press 'Take Snapshot').`;
  }
  // Step 2: user says the question
  else if (currentStep === 2) {
    userQuestion = transcript;
    statusDiv.textContent = `Question received: "${userQuestion}". Sending to backend...`;

    // Now we send everything to the backend
    sendToBackend(userName, pictureURL, userQuestion);
    // (If you want more conversation after this, you could set currentStep=3, etc.)
  }
  // If they're not in the correct step, we just ignore or override
  else {
    console.log("Ignoring transcript, not in the correct step:", currentStep);
  }
}


// Function to send transcript to the backend
function sendTranscript(transcript) {
  console.log('Sending transcript to backend:', transcript);
  fetch('http://127.0.0.1:8000/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ transcript }), // Send the transcript as JSON
  })
    .then((response) => response.json())
    .then((data) => {
      console.log('Backend response:', data);
    })
    .catch((error) => {
      console.error('Error sending transcript to backend:', error);
    });
}
