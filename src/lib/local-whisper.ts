"use client";

export type WhisperModelId =
  | "onnx-community/whisper-base"
  | "onnx-community/whisper-small";

type TranscriberFn = (
  audio: Float32Array,
  options?: {
    language?: string;
    task?: string;
    chunk_length_s?: number;
    stride_length_s?: number;
    return_timestamps?: boolean;
  }
) => Promise<{ text?: string } | Array<{ text?: string }>>;

let cachedModelId: WhisperModelId | null = null;
let cachedPipelinePromise: Promise<TranscriberFn> | null = null;

export async function preloadWhisperModel(
  modelId: WhisperModelId = "onnx-community/whisper-base",
  onProgress?: (statusText: string) => void
): Promise<TranscriberFn> {
  if (!cachedPipelinePromise || cachedModelId !== modelId) {
    cachedModelId = modelId;
    cachedPipelinePromise = (async () => {
      onProgress?.("Preparando motor de voz rápido...");
      const { pipeline, env } = await import("@huggingface/transformers");
      env.allowLocalModels = false;

      // En CPU/WASM multi-hilo, whisper-base q8 es ~4x más rápido que whisper-small fp32
      // y mantiene excelente precisión en español cuando el audio está normalizado.
      const transcriber = await pipeline(
        "automatic-speech-recognition",
        modelId,
        {
          dtype: "q8",
          progress_callback: (info: {
            status?: string;
            progress?: number;
          }) => {
            if (
              info?.status === "progress" &&
              typeof info.progress === "number"
            ) {
              onProgress?.(
                `Cargando motor de voz (${Math.round(info.progress)}%)...`
              );
            }
          },
        }
      );

      return transcriber as unknown as TranscriberFn;
    })().catch((err) => {
      cachedPipelinePromise = null;
      cachedModelId = null;
      throw err;
    });
  }
  return cachedPipelinePromise;
}

/**
 * Normaliza la señal de audio (Peak Normalization + filtro pasa-altos 85Hz + recorte de silencios)
 * y la convierte a un Float32Array mono a 16.000 Hz limpios para Whisper.
 */
async function decodeAndNormalizeBlobTo16kHzPCM(
  blob: Blob
): Promise<Float32Array> {
  const arrayBuffer = await blob.arrayBuffer();
  const AudioCtx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext })
      .webkitAudioContext;

  const audioCtx = new AudioCtx();
  try {
    const decoded = await audioCtx.decodeAudioData(arrayBuffer);
    const targetSampleRate = 16000;
    const targetLength = Math.max(
      1,
      Math.ceil(decoded.duration * targetSampleRate)
    );

    const offlineCtx = new OfflineAudioContext(
      1,
      targetLength,
      targetSampleRate
    );
    const source = offlineCtx.createBufferSource();
    source.buffer = decoded;

    // Filtro pasa-altos suave a 85Hz para eliminar ruido grave de escritorio/ventilador
    const highpass = offlineCtx.createBiquadFilter();
    highpass.type = "highpass";
    highpass.frequency.value = 85;

    source.connect(highpass);
    highpass.connect(offlineCtx.destination);
    source.start(0);

    const rendered = await offlineCtx.startRendering();
    const rawData = rendered.getChannelData(0);

    // 1. Calcular el pico máximo y quitar DC offset
    let sum = 0;
    for (let i = 0; i < rawData.length; i++) {
      sum += rawData[i];
    }
    const mean = rawData.length > 0 ? sum / rawData.length : 0;

    let maxPeak = 0;
    const centered = new Float32Array(rawData.length);
    for (let i = 0; i < rawData.length; i++) {
      const val = rawData[i] - mean;
      centered[i] = val;
      const abs = Math.abs(val);
      if (abs > maxPeak) maxPeak = abs;
    }

    if (maxPeak < 0.004) {
      return new Float32Array(0);
    }

    // 2. Normalizar volumen a 0.92 para que Whisper escuche la voz alta y clara
    const targetPeak = 0.92;
    const gain = Math.min(18, targetPeak / maxPeak);
    for (let i = 0; i < centered.length; i++) {
      centered[i] = Math.max(-1, Math.min(1, centered[i] * gain));
    }

    // 3. Recortar silencios al inicio y al final (dejando 0.15s de margen para máxima velocidad)
    const silenceThreshold = 0.035;
    const marginSamples = Math.floor(targetSampleRate * 0.15);
    let startIdx = 0;
    let endIdx = centered.length - 1;

    while (
      startIdx < centered.length &&
      Math.abs(centered[startIdx]) < silenceThreshold
    ) {
      startIdx++;
    }
    while (endIdx > startIdx && Math.abs(centered[endIdx]) < silenceThreshold) {
      endIdx--;
    }

    startIdx = Math.max(0, startIdx - marginSamples);
    endIdx = Math.min(centered.length - 1, endIdx + marginSamples);

    if (endIdx <= startIdx) {
      return centered;
    }

    return centered.slice(startIdx, endIdx + 1);
  } finally {
    await audioCtx.close().catch(() => {});
  }
}

function postProcessSpanishTranscript(raw: string): string {
  let text = raw
    .replace(/\s+/g, " ")
    .replace(
      /(\[.*?\]|\(.*?\)|subtítulos realizados por.*|amara\.org.*|gracias por ver.*)/gi,
      ""
    )
    .trim();

  text = text
    .replace(/\b(a vito|abito|avito|hábitos|habito)\b/gi, (m) =>
      m.toLowerCase().endsWith("s") ? "hábitos" : "hábito"
    )
    .replace(/\b(recorda torio)\b/gi, "recordatorio")
    .replace(/\b(recuerda me)\b/gi, "recuérdame");

  return text.trim();
}

export async function transcribeAudioBlobLocally(
  blob: Blob,
  onProgress?: (statusText: string) => void,
  modelId: WhisperModelId = "onnx-community/whisper-base"
): Promise<string> {
  if (!blob || blob.size === 0) return "";

  // Ejecutar la carga del modelo y la decodificación de audio en paralelo
  const [pcm16k, transcriber] = await Promise.all([
    decodeAndNormalizeBlobTo16kHzPCM(blob),
    preloadWhisperModel(modelId, onProgress),
  ]);

  if (pcm16k.length === 0) {
    return "";
  }

  onProgress?.("Transcribiendo...");

  const output = await transcriber(pcm16k, {
    language: "spanish",
    task: "transcribe",
    return_timestamps: false,
  });

  const rawText = Array.isArray(output)
    ? output.map((o) => o.text || "").join(" ")
    : output?.text || "";

  return postProcessSpanishTranscript(rawText);
}
