const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const rootPath = path.resolve(__dirname, '..');
const fromRoot = relPath => path.resolve(rootPath, relPath);

async function robot() {
  console.log('> [lipsync] 👄 Iniciando Sincronizador de Labios Wav2Lip...');

  const sharedDir = fromRoot('./content/shared');
  const outputDir = fromRoot('./content/v3_narrativo');
  const scriptPath = path.join(sharedDir, 'script.json');
  const files = fs.readdirSync(sharedDir);
  const audioFile = files.find(f => f.toLowerCase().endsWith('.wav') || f.toLowerCase().endsWith('.mp3'));
  const audioPath = audioFile ? path.join(sharedDir, audioFile) : null;

  if (!fs.existsSync(scriptPath) || !fs.existsSync(audioPath)) {
    console.error('> [lipsync] ❌ Error: Faltan script.json o cancion_test.mp3.');
    return;
  }

  const script = JSON.parse(fs.readFileSync(scriptPath, 'utf8'));
  const ffmpegPath = require('ffmpeg-static');

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  for (let i = 0; i < script.length; i++) {
    const scene = script[i];
    if (!scene.singing) {
      console.log(`> [lipsync] ⏩ Escena ${i} no es de canto. Saltando.`);
      continue;
    }

    const videoInput = path.join(outputDir, `clip_${i}.mp4`);
    const audioSegment = path.join(outputDir, `audio_seg_${i}.wav`);
    const videoOutput = path.join(outputDir, `lipsync_${i}.mp4`);

    if (!fs.existsSync(videoInput)) {
      console.warn(`> [lipsync] ⚠️ No se encontró clip_${i}.mp4. Saltando escena.`);
      continue;
    }

    // 1. Extraer audio de la escena
    console.log(`> [lipsync] 🎵 Extrayendo audio para escena ${i} (${scene.start}s - ${scene.end}s)...`);
    try {
        await extractAudioSegment(ffmpegPath, audioPath, audioSegment, scene.start, scene.end);
    } catch (err) {
        console.error(`> [lipsync] ❌ Error extrayendo audio:`, err.message);
        continue;
    }

    // 2. Ejecutar Wav2Lip
    console.log(`> [lipsync] 🤖 Aplicando Wav2Lip a escena ${i}...`);
    try {
      await runWav2Lip(videoInput, audioSegment, videoOutput);
      console.log(`> [lipsync] ✅ Escena ${i} sincronizada con éxito.`);
      
      // Reemplazar el clip original con el sincronizado para el ensamblaje final
      if (fs.existsSync(videoOutput)) {
          fs.copyFileSync(videoOutput, videoInput);
          console.log(`> [lipsync] 🔄 Clip original reemplazado por la versión sincronizada.`);
      }
    } catch (error) {
      console.error(`> [lipsync] ❌ Falló Lip Sync en escena ${i}:`, error.message);
    }
  }
}

function extractAudioSegment(ffmpegPath, input, output, start, end) {
  return new Promise((resolve, reject) => {
    const duration = (parseFloat(end) - parseFloat(start)).toFixed(2);
    const args = [
      '-y',
      '-ss', start.toString(),
      '-t', duration.toString(),
      '-i', input,
      '-acodec', 'pcm_s16le',
      '-ar', '16000',
      '-ac', '1',
      output
    ];
    const ffmpegProcess = spawn(ffmpegPath, args);
    ffmpegProcess.on('close', code => code === 0 ? resolve() : reject(new Error('FFmpeg audio extract failed')));
  });
}

function runWav2Lip(video, audio, output) {
  return new Promise((resolve, reject) => {
    const wav2lipDir = 'C:\\Users\\rodri\\Desktop\\TEST 004\\la-navaja-suiza-musical\\Easy-Wav2Lip';
    const args = [
      'run.py',
      '-video_file', video,
      '-vocal_file', audio,
      '-output_file', output
    ];
    // Usamos el proceso de python global que configuramos antes
    const pythonPath = 'C:\\Users\\rodri\\AppData\\Local\\Programs\\Python\\Python312\\python.exe';
    const pyProcess = spawn(pythonPath, args, { cwd: wav2lipDir });
    
    pyProcess.stdout.on('data', data => {
        // Opcional: filtrar logs ruidosos
        process.stdout.write(`  [Wav2Lip] ${data}`);
    });
    
    pyProcess.stderr.on('data', data => {
        process.stderr.write(`  [Wav2Lip Log] ${data}`);
    });

    pyProcess.on('close', code => {
        if (code === 0) resolve();
        else reject(new Error(`Wav2Lip falló con código ${code}`));
    });
  });
}

module.exports = robot;
