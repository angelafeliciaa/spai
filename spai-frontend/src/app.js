import { createClient } from '@supabase/supabase-js';

// Supabase client configuration
export const supabase = (() => {
  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
  const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('Supabase credentials are missing. Please check your .env file.');
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
  if (!supabase) {
    console.error('Supabase client not initialized.');
    return null;
  }
  
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
