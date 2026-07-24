export class CreateVideoDto {
    url: string;
    language?: string; // 'en' | 'id'
}

export class RenderClipDto {
    videoId: string;
    url: string;
    start: number;
    end: number;
    aspectRatio?: string; // '9:16' | '16:9' | '1:1' | '4:3'
    subtitleStyle?: string; // 'DEFAULT' | 'CYBERPUNK' | 'MINIMALIST' | 'CUTE'
    customTranscript?: Array<{
        start: number;
        end: number;
        text: string;
        words?: Array<{
            start: number;
            end: number;
            text: string;
            textColor?: string;
            outlineColor?: string;
        }>;
        cropX?: number;
    }>;
    cropX?: number;
    extractOnly?: boolean;
    rawVideoPath?: string;
}
