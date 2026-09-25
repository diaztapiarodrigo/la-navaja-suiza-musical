const path = require('path')
const fs = require('fs')
const spawn = require('child_process').spawn
const rootPath = path.resolve(__dirname, '..')
const fromRoot = relPath => path.resolve(rootPath, relPath)

async function robot() {
  console.log('> [phonk-assembler] 🎸 Iniciando Motor de Montaje Hiperkinético (Beat-Sync)...')
  
  const ffmpegPath = require('ffmpeg-static')
  const sharedDir = fromRoot('./content/shared')
  const outputDir = fromRoot('./content/v4_phonk')
  const beatsPath = path.join(sharedDir, 'beats.json')
  
  if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
  }

  const files = fs.readdirSync(sharedDir)
  const audioFile = files.find(f => f.toLowerCase().endsWith('.wav') || f.toLowerCase().endsWith('.mp3'))
  const audioPath = audioFile ? path.join(sharedDir, audioFile) : null

  if (!fs.existsSync(beatsPath) || !audioPath) {
    console.error('> [phonk-assembler] ❌ Error: Faltan beats.json o la pista de audio.')
    return
  }

  const beatsData = JSON.parse(fs.readFileSync(beatsPath, 'utf8'))
  const beats = beatsData.beats // Array of timestamps [0.5, 1.2, 1.8...]
  const listFilePath = path.join(outputDir, 'phonk_concat.txt')
  
  // Buscar clips generados por Veo 3.1
  const veoDir = fromRoot('./content/v3_narrativo')
  const availableClips = fs.readdirSync(veoDir).filter(f => f.startsWith('clip_') && f.endsWith('.mp4')).map(f => path.join(veoDir, f))
  
  if (availableClips.length === 0) {
    console.error('> [phonk-assembler] ❌ No hay clips de Veo 3.1. Ejecuta video_generator primero.')
    return
  }
  
  console.log(`> [phonk-assembler] Encontrados ${availableClips.length} clips base.`)
  console.log(`> [phonk-assembler] Detectados ${beats.length} beats de corte.`)

  let concatList = ''
  let currentTime = 0;
  
  // Usaremos 1 de cada 4 beats para no hacer los cortes DEMASIADO rápidos, 
  // o podemos usar un umbral de mínimo 0.5s por clip
  const minClipDuration = 0.5; 
  let lastBeatTime = 0;
  let fragmentIndex = 0;

  for (let i = 0; i < beats.length; i++) {
      const beatTime = beats[i];
      const duration = beatTime - lastBeatTime;
      
      // Si el fragmento es muy corto, esperamos al siguiente beat
      if (duration < minClipDuration && i !== beats.length - 1) {
          continue; 
      }
      
      // Seleccionar un clip de Veo al azar
      const randomClip = availableClips[Math.floor(Math.random() * availableClips.length)];
      
      // La duración máxima de un clip Veo es típicamente 5s. 
      // Seleccionar un start_time aleatorio dentro del clip para extraer el pedazo.
      const maxStart = Math.max(0, 4.0 - duration);
      const startTime = (Math.random() * maxStart).toFixed(2);
      
      const fragmentPath = path.join(outputDir, `frag_${fragmentIndex}.mp4`);
      
      console.log(`> [phonk-assembler] Cortando frag_${fragmentIndex} (Duración: ${duration.toFixed(2)}s) desde ${path.basename(randomClip)} a los ${startTime}s...`);
      await extractFragment(ffmpegPath, randomClip, fragmentPath, startTime, duration.toFixed(2));
      
      concatList += `file '${fragmentPath.replace(/\\/g, '/')}'\n`;
      
      lastBeatTime = beatTime;
      fragmentIndex++;
  }

  fs.writeFileSync(listFilePath, concatList)

  console.log(`> [phonk-assembler] 🎬 Fusionando ${fragmentIndex} micro-clips con el audio Phonk...`)
  const finalOutputPath = path.join(outputDir, 'FINAL_PHONK_MATRIX.mp4')
  
  await new Promise((resolve, reject) => {
    const ffmpegArgs = [
      '-y',
      '-f', 'concat',
      '-safe', '0',
      '-i', listFilePath,    
      '-i', audioPath,        
      '-map', '0:v:0',        
      '-map', '1:a:0',        
      '-c:v', 'libx264',
      '-preset', 'fast',
      '-crf', '18',
      '-c:a', 'aac',
      '-b:a', '192k',
      '-shortest',
      finalOutputPath
    ]

    const ffmpegProcess = spawn(ffmpegPath, ffmpegArgs)

    ffmpegProcess.on('close', (code) => {
      if (code === 0) {
        console.log(`\n> [phonk-assembler] 🎉 ¡OBRA MAESTRA CYBERPUNK CREADA! El video musical está en: ${finalOutputPath}`)
        resolve()
      } else {
        console.error(`> [phonk-assembler] ❌ Error en el render final de FFmpeg. Código: ${code}`)
        reject(new Error(`FFmpeg exited with code ${code}`))
      }
    })
  })
}

function extractFragment(ffmpegPath, input, output, start, duration) {
  return new Promise((resolve, reject) => {
    // Aplicamos también un filtro para asegurar 1080p y evitar errores de concat por diferentes resoluciones
    const ffmpegArgs = [
      '-y',
      '-ss', start.toString(),
      '-i', input,
      '-t', duration.toString(),
      '-vf', 'scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,eq=contrast=1.2:saturation=1.1', // Pequeño empuje Cyberpunk
      '-c:v', 'libx264',
      '-preset', 'ultrafast',
      '-c:a', 'aac',
      output
    ]

    const ffmpegProcess = spawn(ffmpegPath, ffmpegArgs)
    ffmpegProcess.on('close', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`Extract failed for ${input}`))
    })
  })
}

module.exports = robot
