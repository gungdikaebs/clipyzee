export interface ClipCandidate {
  start: number;
  end: number;
  reason: string;
  score: number;
  isDownloading?: boolean;
  isEdited?: boolean;
  customTranscript?: any[];
  aspectRatio?: string;
  subtitleStyle?: string;
  cropX?: number;
  rawVideoPath?: string;
}
