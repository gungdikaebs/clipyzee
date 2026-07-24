export interface ClipCandidate {
  start: number;
  end: number;
  title?: string;
  reason: string;
  score: number;
  hookScore?: number;
  flowScore?: number;
  emojiMap?: Record<string, string>;
  isDownloading?: boolean;
  isEdited?: boolean;
  customTranscript?: any[];
  aspectRatio?: string;
  subtitleStyle?: string;
  cropX?: number;
  rawVideoPath?: string;
}
