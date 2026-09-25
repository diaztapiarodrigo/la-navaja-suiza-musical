import os
import json
import librosa
import sys

def detect_beats(audio_path, output_path):
    print(f"> [beat-detector] Cargando audio {audio_path}...")
    try:
        # Load audio
        y, sr = librosa.load(audio_path, sr=None)
        
        print("> [beat-detector] Analizando transitorios y detectando BPM...")
        # Run beat tracker
        tempo, beat_frames = librosa.beat.beat_track(y=y, sr=sr)
        
        # Convert frames to timestamps (seconds)
        beat_times = librosa.frames_to_time(beat_frames, sr=sr)
        
        print(f"> [beat-detector] Detectado tempo: {tempo[0]:.2f} BPM")
        print(f"> [beat-detector] Extraídos {len(beat_times)} golpes principales.")
        
        # Convert to standard Python list
        beats_list = [round(float(t), 3) for t in beat_times]
        
        # Save to JSON
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump({
                "bpm": float(tempo[0]),
                "beats": beats_list
            }, f, indent=4)
            
        print(f"> [beat-detector] ✅ Beats guardados en {output_path}")
        
    except Exception as e:
        print(f"> [beat-detector] ❌ Error analizando beats: {e}")
        sys.exit(1)

if __name__ == "__main__":
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    shared_dir = os.path.join(base_dir, 'content', 'shared')
    
    # Busca audio.mp3 o .wav
    audio_file = None
    if os.path.exists(shared_dir):
        for f in os.listdir(shared_dir):
            if f.endswith('.mp3') or f.endswith('.wav'):
                audio_file = os.path.join(shared_dir, f)
                break
                
    if not audio_file:
        print("> [beat-detector] ❌ No se encontró ningún archivo de audio en content/shared/")
        sys.exit(1)
        
    output_json = os.path.join(shared_dir, 'beats.json')
    detect_beats(audio_file, output_json)
