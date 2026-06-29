export interface VoiceTranscriptionResult {
  transcript: string;
  originalLanguage?: string;
  languageConfidence?: number;
  translatedEnglish?: string;
  confidence?: number;
  durationSeconds?: number;
  processingTimeMs?: number;
  segments?: any[];
  provider: string;
}

export interface VoiceProvider {
  readonly name: string;
  readonly priority: number;
  readonly isLocal: boolean;
  
  isAvailable(): boolean;
  
  transcribe(
    audioBuffer: Buffer,
    mimeType: string,
    filename: string,
  ): Promise<VoiceTranscriptionResult>;
}
