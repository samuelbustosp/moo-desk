"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  preloadWhisperModel,
  transcribeAudioBlobLocally,
} from "@/lib/local-whisper";

export type MicPermissionState =
  | "prompt"
  | "granted"
  | "denied"
  | "unsupported";

export interface VoiceCaptureResult {
  transcript: string;
  audioBase64?: string;
  audioMimeType?: string;
}

interface UseVoiceRecorderOptions {
  microphoneAllowed: boolean;
  onInterimTranscript?: (text: string) => void;
  onTranscribingStateChange?: (
    isTranscribing: boolean,
    statusLabel?: string
  ) => void;
  onCaptureComplete?: (result: VoiceCaptureResult) => void;
  onError?: (message: string) => void;
}

// Tipado seguro para Web Speech API (Chrome / Edge / WebView2 en Windows)
interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: {
      isFinal: boolean;
      0: { transcript: string };
    };
  };
}

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: ((e: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const res = String(reader.result || "");
      const base64 = res.includes(",") ? res.split(",")[1] : res;
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export function useVoiceRecorder({
  microphoneAllowed,
  onInterimTranscript,
  onTranscribingStateChange,
  onCaptureComplete,
  onError,
}: UseVoiceRecorderOptions) {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribingAudio, setIsTranscribingAudio] = useState(false);
  const [transcribingStatus, setTranscribingStatus] = useState("");
  const [permissionState, setPermissionState] =
    useState<MicPermissionState>("prompt");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const accumulatedTranscriptRef = useRef<string>("");

  useEffect(() => {
    if (typeof window === "undefined" || !navigator.mediaDevices) {
      setPermissionState("unsupported");
      return;
    }

    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions
        .query({ name: "microphone" as PermissionName })
        .then((status) => {
          setPermissionState(status.state as MicPermissionState);
          status.onchange = () => {
            setPermissionState(status.state as MicPermissionState);
          };
        })
        .catch(() => {
          // ignore
        });
    }

    // Precargar el modelo Whisper Base en segundo plano para que al soltar el micrófono sea casi instantáneo
    if (microphoneAllowed) {
      const timer = setTimeout(() => {
        preloadWhisperModel("onnx-community/whisper-base").catch(() => {});
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [microphoneAllowed]);

  const cleanupStream = useCallback(() => {
    if (mediaStreamRef.current) {
      for (const track of mediaStreamRef.current.getTracks()) {
        track.stop();
      }
      mediaStreamRef.current = null;
    }
  }, []);

  const requestMicrophonePermission = useCallback(async (): Promise<boolean> => {
    if (!microphoneAllowed) {
      const msg =
        "El micrófono está desactivado en los Ajustes de Moo. Actívalo para usar comandos de voz.";
      setErrorMessage(msg);
      onError?.(msg);
      return false;
    }

    if (
      typeof window === "undefined" ||
      !navigator.mediaDevices ||
      !navigator.mediaDevices.getUserMedia
    ) {
      setPermissionState("unsupported");
      const msg = "Tu entorno no soporta acceso al micrófono (getUserMedia).";
      setErrorMessage(msg);
      onError?.(msg);
      return false;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      for (const track of stream.getTracks()) {
        track.stop();
      }
      setPermissionState("granted");
      setErrorMessage(null);
      return true;
    } catch {
      setPermissionState("denied");
      const msg =
        "Permiso de micrófono denegado. Concede acceso al micrófono en tu sistema o navegador.";
      setErrorMessage(msg);
      onError?.(msg);
      return false;
    }
  }, [microphoneAllowed, onError]);

  const startRecording = useCallback(async () => {
    if (!microphoneAllowed) {
      const msg =
        "El permiso de micrófono de Moo está desactivado en Ajustes.";
      setErrorMessage(msg);
      onError?.(msg);
      return false;
    }

    if (
      typeof window === "undefined" ||
      !navigator.mediaDevices ||
      !navigator.mediaDevices.getUserMedia
    ) {
      setPermissionState("unsupported");
      const msg = "Acceso a micrófono no disponible en este navegador.";
      setErrorMessage(msg);
      onError?.(msg);
      return false;
    }

    setErrorMessage(null);
    accumulatedTranscriptRef.current = "";
    setInterimTranscript("");

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: true,
        },
      });
      setPermissionState("granted");
      mediaStreamRef.current = stream;
    } catch {
      setPermissionState("denied");
      const msg =
        "No se pudo acceder al micrófono. Revisa que hayas otorgado permiso.";
      setErrorMessage(msg);
      onError?.(msg);
      return false;
    }

    // 1. Iniciar grabación real del audio con MediaRecorder (alta calidad de voz)
    audioChunksRef.current = [];
    const mimeType =
      typeof MediaRecorder !== "undefined" &&
      MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : typeof MediaRecorder !== "undefined" &&
          MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "";

    try {
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType, audioBitsPerSecond: 128000 })
        : new MediaRecorder(stream);

      recorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) {
          audioChunksRef.current.push(ev.data);
        }
      };

      recorder.onstop = async () => {
        const actualMime = recorder.mimeType || "audio/webm";
        const audioBlob = new Blob(audioChunksRef.current, {
          type: actualMime,
        });
        cleanupStream();

        let audioBase64: string | undefined;
        if (audioBlob.size > 0) {
          try {
            audioBase64 = await blobToBase64(audioBlob);
          } catch {
            // ignore
          }
        }

        let finalTranscript = accumulatedTranscriptRef.current.trim();

        // Solo si la transcripción en vivo no capturó texto (offline o no soportado), procesar con Whisper local
        if (!finalTranscript && audioBlob.size > 0) {
          setIsTranscribingAudio(true);
          setTranscribingStatus("Transcribiendo audio con Whisper...");
          onTranscribingStateChange?.(
            true,
            "Transcribiendo audio con Whisper..."
          );
          try {
            finalTranscript = await transcribeAudioBlobLocally(
              audioBlob,
              (progressText) => {
                setTranscribingStatus(progressText);
                onTranscribingStateChange?.(true, progressText);
              }
            );
          } catch (err) {
            console.warn("[Moo Whisper Local]", err);
          } finally {
            setIsTranscribingAudio(false);
            setTranscribingStatus("");
            onTranscribingStateChange?.(false, "");
          }
        }

        if (!finalTranscript) {
          const msg =
            "No pude escuchar con claridad lo que dijiste en el audio. Intenta hablar un poco más fuerte cerca del micrófono.";
          setErrorMessage(msg);
          onError?.(msg);
        }

        onCaptureComplete?.({
          transcript: finalTranscript,
          audioBase64,
          audioMimeType: actualMime,
        });
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
    } catch {
      cleanupStream();
      const msg = "Error al iniciar MediaRecorder con el micrófono.";
      setErrorMessage(msg);
      onError?.(msg);
      return false;
    }

    // 2. Iniciar transcripción en vivo (SpeechRecognition) en paralelo cuando esté soportado
    const SpeechRecognitionCtor =
      (
        window as unknown as {
          SpeechRecognition?: new () => SpeechRecognitionLike;
          webkitSpeechRecognition?: new () => SpeechRecognitionLike;
        }
      ).SpeechRecognition ||
      (
        window as unknown as {
          webkitSpeechRecognition?: new () => SpeechRecognitionLike;
        }
      ).webkitSpeechRecognition;

    if (SpeechRecognitionCtor) {
      try {
        const recognition = new SpeechRecognitionCtor();
        recognition.lang = "es-ES";
        recognition.continuous = true;
        recognition.interimResults = true;

        recognition.onresult = (event: SpeechRecognitionEventLike) => {
          let finalParts = "";
          let interimParts = "";

          for (let i = 0; i < event.results.length; i++) {
            const res = event.results[i];
            if (res.isFinal) {
              finalParts += res[0].transcript + " ";
            } else {
              interimParts += res[0].transcript;
            }
          }

          const combined = `${finalParts}${interimParts}`.trim();
          if (combined) {
            accumulatedTranscriptRef.current = combined;
            setInterimTranscript(combined);
            onInterimTranscript?.(combined);
          }
        };

        recognition.onerror = () => {
          // Si falla SpeechRecognition, Whisper local transcribirá el audio de MediaRecorder al detener
        };

        recognitionRef.current = recognition;
        recognition.start();
      } catch {
        // Fallback automático a Whisper local
      }
    }

    setIsRecording(true);
    return true;
  }, [
    microphoneAllowed,
    cleanupStream,
    onInterimTranscript,
    onTranscribingStateChange,
    onCaptureComplete,
    onError,
  ]);

  const stopRecording = useCallback(() => {
    setIsRecording(false);

    if (recognitionRef.current) {
      try {
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    }

    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        cleanupStream();
      }
    } else {
      cleanupStream();
    }
  }, [cleanupStream]);

  const toggleRecording = useCallback(async () => {
    if (isRecording) {
      stopRecording();
      return false;
    } else {
      return await startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  return {
    isRecording,
    isTranscribingAudio,
    transcribingStatus,
    permissionState,
    interimTranscript,
    errorMessage,
    requestMicrophonePermission,
    startRecording,
    stopRecording,
    toggleRecording,
  };
}
