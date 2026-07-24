import sys
import os
import json
import whisper
import warnings
import torch
import gc

# Suppress FP16 warning on CPU
warnings.filterwarnings("ignore")

def transcribe(audio_path, language="id", model_size="base"):
    if not os.path.exists(audio_path):
        print(json.dumps({"error": f"Audio file not found at {audio_path}"}))
        sys.exit(1)

    model = None
    try:
        # Load Whisper model dynamically
        model = whisper.load_model(model_size)
        
        # Transcribe with forced language and word timestamps
        result = model.transcribe(audio_path, language=language, word_timestamps=True)
        
        # Format output to match desired structure: [{start, end, text, words: [...]}]
        formatted_segments = []
        for segment in result["segments"]:
            words_data = []
            if "words" in segment:
                for word_info in segment["words"]:
                    words_data.append({
                        "start": word_info.get("start", 0),
                        "end": word_info.get("end", 0),
                        "text": word_info.get("word", "").strip()
                    })
                    
            formatted_segments.append({
                "start": segment["start"],
                "end": segment["end"],
                "text": segment["text"].strip(),
                "words": words_data
            })
            
        print(json.dumps(formatted_segments))

    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)
        
    finally:
        # Proper Memory Cleanup targeting memory leaks
        if model is not None:
            del model
        
        gc.collect()
        
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
            
if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Usage: python3 transcribe.py <audio_path> [language] [model_size]"}), file=sys.stderr)
        sys.exit(1)
    
    audio_path = sys.argv[1]
    language = sys.argv[2] if len(sys.argv) > 2 else "id"
    model_size = sys.argv[3] if len(sys.argv) > 3 else "base"
    
    transcribe(audio_path, language, model_size)
