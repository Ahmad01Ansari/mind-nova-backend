export interface VoiceTranscriptionResult {
  transcript: string;
  originalLanguage?: string;
  translatedEnglish?: string;
  confidence?: number;
  durationSeconds?: number;
  provider: string;
}

export interface VoiceProvider {
  transcribe(
    audioBuffer: Buffer,
    mimeType: string,
    filename: string,
  ): Promise<VoiceTranscriptionResult>;
}
