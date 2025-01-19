import { createClient } from '@supabase/supabase-js';

// Supabase client configuration
export const supabase = (() => {
  const SUPABASE_URL = process.env.SUPABASE_URL || 'https://your-supabase-url.supabase.co';
  const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'your-anon-key';

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('Supabase credentials are missing. Please check your environment variables.');
    return null;
  }

  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
})();

// Speech recognition setup
export function initializeSpeechRecognition(onResult, onError) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    console.warn('Speech recognition not supported in this browser.');
    return null;
  }

  const recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = false;
  recognition.lang = 'en-US';

  recognition.onresult = (event) => {
    const lastResultIndex = event.results.length - 1;
    const transcript = event.results[lastResultIndex][0].transcript.trim();
    if (onResult) onResult(transcript);
  };

  recognition.onerror = (event) => {
    if (onError) onError(event.error);
  };

  return recognition;
}

// Utility function to upload to Supabase
export async function uploadToSupabase(blob, fileName) {
  console.log('Uploading to Supabase:', fileName);

  const { data, error } = await supabase.storage
    .from('media-files') // Replace with your bucket name
    .upload(fileName, blob, {
      contentType: 'image/png',
      cacheControl: '3600', // optional
    });

  if (error) {
    console.error('Error uploading to Supabase:', error);
  } else {
    console.log('Successfully uploaded to Supabase:', data);
  }
}
