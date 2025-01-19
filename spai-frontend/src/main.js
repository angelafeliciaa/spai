import { supabase, initializeSpeechRecognition, uploadToSupabase } from './app';
import OpenAI from "openai";

// DOM Elements
const videoElement = document.getElementById('preview');
const startButton = document.getElementById('startCapture');
const stopButton = document.getElementById('stopCapture');
const snapshotButton = document.getElementById('takeSnapshot');
const statusDiv = document.getElementById('status'); // Optional: To display status messages

let localStream = null;
let recognition = null;

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY, dangerouslyAllowBrowser: true,
});

// Event Listeners
startButton?.addEventListener('click', startCapture);
stopButton?.addEventListener('click', stopCapture);
snapshotButton?.addEventListener('click', takeSnapshot);

// Function to start media capture
async function startCapture() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    videoElement.srcObject = stream;
    localStream = stream;

    recognition = initializeSpeechRecognition(
      (transcript) => {
        console.log('Recognized transcript:', transcript);
        transcript = {"user_id": "123", "text": transcript, "history": "aaa"}
        sendTranscript(transcript); // Send the recognized text to the backend
      },
      (error) => console.error('Speech recognition error:', error)
    );

    if (recognition) {
      recognition.start();
      console.log('Speech recognition started.');
    }

    startButton.disabled = true;
    stopButton.disabled = false;
    snapshotButton.disabled = false;

    console.log('Media capture started.');
  } catch (error) {
    console.error('Error starting camera:', error);
  }
}

// Function to stop media capture
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

// Function to take a snapshot
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

// OpenAI TTS: Generate and Play Speech
async function generateAndPlaySpeech(inputText) {
  try {
    const mp3 = await openai.audio.speech.create({
      model: "tts-1",
      voice: "alloy",
      input: inputText,
    });

    // Convert the ArrayBuffer to a Blob
    const audioBlob = new Blob([new Uint8Array(await mp3.arrayBuffer())], {
      type: "audio/mpeg",
    });

    // Create an Object URL for the audio
    const audioURL = URL.createObjectURL(audioBlob);

    // Create an audio element and play the speech
    const audio = new Audio(audioURL);
    audio.play();

    console.log("Speech generated and played successfully!");
  } catch (error) {
    console.error("Error generating speech:", error);
  }
}

function sendTranscript(transcript) {
  fetch("http://10.43.152.147:3001/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(transcript)
  })
    .then((response) => response.json())
    .then((data) => {
      console.log('Backend response:', data);
      if (data?.responseText) {
        generateAndPlaySpeech(data.responseText); // Use the backend's response for TTS
      }
    })
    .catch((error) => console.error('Error sending transcript to backend:', error));
}
