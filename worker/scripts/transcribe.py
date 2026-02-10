import sys
import os
import json
import whisper
import warnings

# Suppress FP16 warning on CPU
warnings.filterwarnings("ignore")

def transcribe(audio_path, language="id"):
    if not os.path.exists(audio_path):
        print(json.dumps({"error": f"Audio file not found at {audio_path}"}))
        sys.exit(1)

    try:
        # Load Whisper model (first run will download default 'small' model ~500MB)
        # using 'small' as requested for balance
        model = whisper.load_model("small")
        
        # Transcribe with forced language
        result = model.transcribe(audio_path, language=language)
        
        # Format output to match desired structure: [{start, end, text}]
        formatted_segments = []
        for segment in result["segments"]:
            formatted_segments.append({
                "start": segment["start"],
                "end": segment["end"],
                "text": segment["text"].strip()
            })
            
        print(json.dumps(formatted_segments))

    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Usage: python3 transcribe.py <audio_path> [language]"}), file=sys.stderr)
        sys.exit(1)
    
    audio_path = sys.argv[1]
    language = sys.argv[2] if len(sys.argv) > 2 else "id"
    
    transcribe(audio_path, language)
