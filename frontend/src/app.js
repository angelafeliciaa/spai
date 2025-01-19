import { createClient } from '@supabase/supabase-js';
import {startCapture} from './main'

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

  recognition.onerror = async (event) => {
    console.error('Speech recognition error:', event.error);

    if (event.error === 'no-speech') {
      recognition.stop();
      await new Promise((resolve) => setTimeout(resolve, 2000));
      startCapture();
    }

    if (onError) onError(event.error);
  };

  return recognition;
}

export async function uploadToSupabase(blob, fileName, userName = null) {
  if (!supabase) {
    console.error('Supabase client not initialized.');
    return null;
  }
  
  console.log('Uploading to Supabase:', fileName);

  // First upload the image to storage
  const { data: imageData, error: imageError } = await supabase.storage
    .from('media-files')
    .upload(fileName, blob, {
      contentType: 'image/png',
      cacheControl: '3600',
    });

  if (imageError) {
    console.error('Error uploading to Supabase:', imageError);
    return null;
  }

  // Get the public URL for the uploaded image
  const { data: urlData } = supabase.storage
    .from('media-files')
    .getPublicUrl(fileName);

  // Only create user interaction if userName is provided
  if (userName) {
    try {
      const { data: userData, error: userError } = await supabase
        .from('user_interactions')
        .insert([
          {
            user_id: userName.toLowerCase(),
            name: userName,
            image_url: urlData.publicUrl,
            conversation_summary: '' // This will be updated later with the summary
          }
        ])
        .select()
        .single();

      if (userError) {
        console.error('Error creating user interaction:', userError);
        return null;
      }

      console.log('Successfully uploaded to Supabase:', userData);
      return userData;
    } catch (error) {
      console.error('Error in user interaction creation:', error);
      return null;
    }
  }

  return urlData;  // Return URL data even if user interaction creation fails
}