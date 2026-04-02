import * as mm from "music-metadata";
import ffmpeg from "fluent-ffmpeg";
import { Readable, PassThrough } from "stream";
import { BadRequestError } from "./errors.utils.js";

const WAVEFORM_SAMPLES = 200; // Number of peaks to return (as per API doc)

const extractAudioMetadata = async (audioBuffer) => {
  try {
    const metadata = await mm.parseBuffer(audioBuffer);
    return {
      format: metadata.format.container || "unknown",
      duration: metadata.format.duration || 0,
      bitrate: metadata.format.bitrate || 0,
    };
  } catch (error) {
    throw new BadRequestError("Failed to extract audio metadata.");
  }
};

/**
 * Extract waveform peaks from audio buffer
 * @param {Buffer} audioBuffer - The audio file buffer
 * @returns {Promise<number[]>} Array of peak values (0.0 to 1.0)
 */
const extractWaveform = async (audioBuffer) => {
  return new Promise((resolve, reject) => {
    const chunks = [];

    // Create readable stream from buffer
    const inputStream = Readable.from(audioBuffer);
    const outputStream = new PassThrough();

    // Collect PCM data chunks
    outputStream.on("data", (chunk) => chunks.push(chunk));
    outputStream.on("end", () => {
      try {
        const pcmBuffer = Buffer.concat(chunks);
        const peaks = calculatePeaks(pcmBuffer, WAVEFORM_SAMPLES);
        resolve(peaks);
      } catch (error) {
        reject(new BadRequestError("Failed to calculate waveform peaks."));
      }
    });
    outputStream.on("error", (err) => {
      reject(new BadRequestError("Failed to process audio stream."));
    });

    // Convert audio to raw PCM (16-bit signed, mono, 8kHz for efficiency)
    ffmpeg(inputStream)
      .inputFormat("mp3") // ffmpeg will auto-detect, but hint helps
      .audioChannels(1) // Mono
      .audioFrequency(8000) // 8kHz sample rate (enough for waveform)
      .format("s16le") // 16-bit signed little-endian PCM
      .on("error", (err) => {
        reject(new BadRequestError(`FFmpeg error: ${err.message}`));
      })
      .pipe(outputStream, { end: true });
  });
};

/**
 * Calculate peaks from raw PCM buffer
 * @param {Buffer} pcmBuffer - Raw PCM data (16-bit signed LE)
 * @param {number} numSamples - Number of peaks to calculate
 * @returns {number[]} Array of normalized peak values (0.0 to 1.0)
 */
const calculatePeaks = (pcmBuffer, numSamples) => {
  // 16-bit = 2 bytes per sample
  const bytesPerSample = 2;
  const totalSamples = Math.floor(pcmBuffer.length / bytesPerSample);

  if (totalSamples === 0) {
    return new Array(numSamples).fill(0);
  }

  const samplesPerPeak = Math.floor(totalSamples / numSamples);
  const peaks = [];

  for (let i = 0; i < numSamples; i++) {
    const start = i * samplesPerPeak;
    const end = Math.min(start + samplesPerPeak, totalSamples);

    let maxAmplitude = 0;

    // Find the maximum absolute amplitude in this chunk
    for (let j = start; j < end; j++) {
      const offset = j * bytesPerSample;
      if (offset + bytesPerSample <= pcmBuffer.length) {
        // Read 16-bit signed integer (little-endian)
        const sample = pcmBuffer.readInt16LE(offset);
        const amplitude = Math.abs(sample);
        if (amplitude > maxAmplitude) {
          maxAmplitude = amplitude;
        }
      }
    }

    // Normalize to 0.0 - 1.0 (16-bit max is 32767)
    const normalizedPeak = maxAmplitude / 32767;
    peaks.push(Math.round(normalizedPeak * 100) / 100); // Round to 2 decimal places
  }

  return peaks;
};

export default {
  extractAudioMetadata,
  extractWaveform,
};
