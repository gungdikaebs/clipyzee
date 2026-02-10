import sys
import os
import json
import wave
from vosk import Model, KaldiRecognizer

def transcribe(audio_path, model_path):
    if not os.path.exists(model_path):
        print(json.dumps({"error": f"Model not found at {model_path}"}))
        sys.exit(1)

    if not os.path.exists(audio_path):
        print(json.dumps({"error": f"Audio file not found at {audio_path}"}))
        sys.exit(1)

    try:
        model = Model(model_path)
        wf = wave.open(audio_path, "rb")
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)

    if wf.getnchannels() != 1 or wf.getsampwidth() != 2 or wf.getcomptype() != "NONE":
        print(json.dumps({"error": "Audio file must be WAV format mono PCM."}))
        sys.exit(1)

    rec = KaldiRecognizer(model, wf.getframerate())
    rec.SetWords(True)

    results = []
    
    while True:
        data = wf.readframes(4000)
        if len(data) == 0:
            break
        if rec.AcceptWaveform(data):
            part_result = json.loads(rec.Result())
            if 'result' in part_result:
                results.extend(part_result['result'])
    
    final_result = json.loads(rec.FinalResult())
    if 'result' in final_result:
        results.extend(final_result['result'])

    # Simplify output for MVP: list of {start, end, word}
    # Vosk 'result' items are already {conf, end, start, word}
    print(json.dumps(results))

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print(json.dumps({"error": "Usage: python3 transcribe.py <audio_path> <model_path>"}))
        sys.exit(1)
    
    audio_path = sys.argv[1]
    model_path = sys.argv[2]
    
    transcribe(audio_path, model_path)
