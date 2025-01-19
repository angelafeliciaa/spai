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

let isTextToSpeechPlaying = false;

async function generateAndPlaySpeech(inputText) {
  try {
    // Stop recognition while TTS is about to play
    if (recognition) {
      recognition.stop();
      console.log('Speech recognition paused for TTS');
    }
    isTextToSpeechPlaying = true;
    
    console.log("Generating speech for:", inputText);
    
    const mp3 = await openai.audio.speech.create({
      model: "tts-1",
      voice: "alloy",
      input: inputText,
    });
    
    console.log("Speech generated successfully");

    const audioBlob = new Blob([new Uint8Array(await mp3.arrayBuffer())], {
      type: "audio/mpeg",
    });

    const audioURL = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioURL);
    
    audio.addEventListener('play', () => console.log('Audio started playing'));
    audio.addEventListener('ended', () => {
      console.log('Audio finished playing');
      // Resume recognition after TTS finishes
      if (localStream) { // Only restart if we're still in a capture session
        recognition = initializeSpeechRecognition(
          (transcript) => {
            console.log('Recognized transcript:', transcript);
            transcript = {"user_id": "123", "text": transcript, "history": "aaa"}
            sendTranscript(transcript);
          },
          (error) => console.error('Speech recognition error:', error)
        );
        recognition.start();
        console.log('Speech recognition resumed after TTS');
      }
      isTextToSpeechPlaying = false;
      URL.revokeObjectURL(audioURL);
    });
    
    audio.addEventListener('error', (e) => {
      console.error('Audio playback error:', e);
      isTextToSpeechPlaying = false;
    });
    
    try {
      await audio.play();
      console.log("Audio playback started!");
    } catch (playError) {
      console.error("Playback error:", playError);
      isTextToSpeechPlaying = false;
    }

  } catch (error) {
    console.error("Error in generateAndPlaySpeech:", error);
    if (error.response) {
      console.error("OpenAI API Error:", await error.response.text());
    }
    isTextToSpeechPlaying = false;
  }
}

function sendTranscript(transcript) {
  const url = process.env.VITE_BACKEND_URL
  fetch(`${url}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(transcript)
  })
    .then((response) => response.json())
    .then((data) => {
      console.log('Backend response:', data);
      if (data?.response) {
        generateAndPlaySpeech(data.response); // Use the backend's response for TTS
      }
    })
    .catch((error) => console.error('Error sending transcript to backend:', error));
}
