import { Platform } from 'react-native';
import * as ExpoSpeech from 'expo-speech';
import { ExpoSpeechRecognitionModule } from 'expo-speech-recognition';

type SpeechRecognitionConstructor = new () => {
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  lang: string;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

function getSpeechRecognition() {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return null;
  }

  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null;
}

export function supportsSpeechToText() {
  if (Platform.OS === 'web') {
    return Boolean(getSpeechRecognition());
  }

  return true;
}

export async function requestMicrophonePermission() {
  if (Platform.OS !== 'web') {
    try {
      const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      return Boolean(result.granted);
    } catch {
      return false;
    }
  }

  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    return false;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    for (const track of stream.getTracks()) {
      track.stop();
    }
    return true;
  } catch {
    return false;
  }
}

export function startSpeechToText({
  lang = 'en-US',
  onResult,
  onError,
  onEnd,
}: {
  lang?: string;
  onResult: (transcript: string) => void;
  onError: (message: string) => void;
  onEnd?: () => void;
}) {
  if (Platform.OS !== 'web') {
    const resultSubscription = ExpoSpeechRecognitionModule.addListener('result', (event) => {
      const transcript = event.results?.[0]?.transcript?.trim() ?? '';
      if (!transcript) {
        onError('No speech detected. Please try again.');
        return;
      }
      onResult(transcript);
    });

    const errorSubscription = ExpoSpeechRecognitionModule.addListener('error', (event) => {
      onError(event.message || 'Speech recognition failed.');
    });

    const endSubscription = ExpoSpeechRecognitionModule.addListener('end', () => {
      onEnd?.();
    });

    try {
      ExpoSpeechRecognitionModule.start({
        lang,
        interimResults: false,
        continuous: false,
        addsPunctuation: false,
      });
    } catch {
      onError('Speech recognition failed to start.');
    }

    return {
      stop: () => {
        void ExpoSpeechRecognitionModule.stop();
        resultSubscription.remove();
        errorSubscription.remove();
        endSubscription.remove();
      },
    };
  }

  const Recognition = getSpeechRecognition();
  if (!Recognition) {
    onError('Speech recognition is not supported on this device.');
    return null;
  }

  const recognition = new Recognition();
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  recognition.lang = lang;

  recognition.onresult = (event) => {
    const result = event.results[0]?.[0]?.transcript?.trim() ?? '';
    if (!result) {
      onError('No speech detected. Please try again.');
      return;
    }
    onResult(result);
  };

  recognition.onerror = (event) => {
    onError(event.error === 'not-allowed' ? 'Microphone permission was denied.' : 'Speech recognition failed.');
  };

  recognition.onend = () => {
    onEnd?.();
  };

  recognition.start();
  return recognition;
}

export function speakText(text: string) {
  if (Platform.OS !== 'web') {
    ExpoSpeech.stop();
    ExpoSpeech.speak(text, { language: 'en-US', rate: 0.9, pitch: 1.0 });
    return { ok: true as const };
  }

  if (typeof window === 'undefined' || !window.speechSynthesis) {
    return { ok: false as const, error: 'Audio pronunciation is unavailable in this build.' };
  }

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'en-US';
  utterance.rate = 0.9;
  window.speechSynthesis.speak(utterance);
  return { ok: true as const };
}

export function normalizeSpokenAnswer(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, ' ');
}
