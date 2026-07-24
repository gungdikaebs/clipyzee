import { GoogleGenerativeAI } from '@google/generative-ai';
import 'dotenv/config';

// Interface for the output we want from Gemini
export interface ClipCandidate {
    start: string; // "00:00:10"
    end: string;   // "00:00:20"
    reason: string;
    score: number; // 1-10
}

export const analyzeTranscript = async (transcript: string): Promise<ClipCandidate[]> => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error("GEMINI_API_KEY is not set in environment variables");
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
        model: "gemini-3.5-flash-lite",
        generationConfig: {
            responseMimeType: "application/json"
        }
    });

    const prompt = `
    Kamu adalah Content Strategist ahli pembuat video pendek viral (YouTube Shorts, TikTok, Instagram Reels) yang sangat berpengalaman dalam memotong video podcast, wawancara, atau edukasi menjadi klip-klip viral.
    
    Tugas Anda:
    Analisis transkrip video ber-timestamp berikut ini dan temukan 1 hingga 5 momen terbaik (paling menarik, lucu, berenergi tinggi, menginspirasi, kontroversial, atau memiliki nilai edukasi tinggi) untuk dijadikan video pendek/short-form clip.

    Kriteria Klip yang Bagus:
    1. Durasi Klip: Setiap klip harus berdurasi antara 15 hingga 60 detik (durasi ideal: 20 hingga 45 detik).
    2. Memiliki Hook yang Kuat: 3-5 detik pertama klip harus memiliki daya tarik yang sangat kuat (misalnya berupa pertanyaan retoris, opini kontroversial/panas, pernyataan mengejutkan, klimaks lelucon, atau emosi yang meledak-ledak) agar penonton tidak langsung melakukan scroll.
    3. Mandiri & Cohesive (Self-Contained): Klip harus berupa satu topik atau cerita utuh yang dapat dimengerti secara mandiri tanpa memerlukan penjelasan/konteks tambahan dari sisa video.
    4. Batas Waktu Rapi (Clean Boundaries): Waktu mulai (start) dan selesai (end) klip harus benar-benar rapi di awal dan akhir kalimat penuh. Jangan memotong di tengah-tengah kata, kalimat menggantung, atau di tengah-tengah keheningan panjang.

    Hal yang HARUS Dihindari:
    - Jangan mengambil bagian pembuka video (Intro seperti "Halo guys, selamat datang kembali...", "Di video kali ini kita akan...") atau penutup (Outro seperti "Jangan lupa subscribe, like, comment...", "Sampai jumpa di video selanjutnya...").
    - Jangan mengambil bagian sponsor, iklan, atau perkenalan diri yang membosankan.
    - Jangan biarkan klip yang Anda rekomendasikan saling tumpang tindih (overlapping) satu sama lain secara langsung dalam output Anda.

    Format Output:
    Kembalikan sebuah JSON array of objects dengan struktur berikut:
    - start: waktu mulai klip, format string (HH:MM:SS atau MM:SS)
    - end: waktu selesai klip, format string (HH:MM:SS atau MM:SS)
    - reason: penjelasan singkat dalam bahasa Indonesia mengapa bagian ini sangat menarik, apa hook-nya, dan mengapa memiliki potensi viral.
    - score: angka 1-10 yang menunjukkan potensi viralitas (berikan nilai >= 7 hanya untuk klip yang benar-benar luar biasa).

    Jika transkrip ini sama sekali tidak memiliki bagian yang menarik atau tidak memenuhi kriteria di atas, kembalikan array kosong: [].

    Transkrip Video:
    ${transcript}
    `;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        let text = response.text();

        // Cleanup markdown code blocks if present (safeguard)
        text = text.replace(/```json/g, '').replace(/```/g, '').trim();

        const candidates: ClipCandidate[] = JSON.parse(text);
        return candidates;

    } catch (error) {
        console.error("Error analyzing transcript with Gemini:", error);
        return [];
    }
};
