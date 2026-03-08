export class CreateVideoDto {
    url: string;
    language?: string; // 'en' | 'id'
}

export class RenderClipDto {
    videoId: string;
    url: string;
    start: number;
    end: number;
}
