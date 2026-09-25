const robots = {
  scriptwriter: require('./robots/scriptwriter.js'),
  video_generator_v3: require('./robots/video_generator_v3.js'),
  video_v3_narrativo: require('./robots/video_v3_narrativo.js'),
  video_v2_documental: require('./robots/video_v2_documental.js'),
  video_high_end: require('./robots/video_high_end.js'),
  video_v4_phonk_assembler: require('./robots/video_v4_phonk_assembler.js'),
  lipsync: require('./robots/lipsync.js')
}

async function start() {
  const args = process.argv.slice(2);
  const mode = args[0];

  if (!mode) {
    console.log(`
🚀 BIENVENIDO A LA NAVAJA SUIZA MUSICAL 🚀

Uso: node index.js [modo]

Modos disponibles:
  documental   -> Anima fotos reales con FFmpeg (Ken Burns) + Karaoke.
  high_end     -> [NUEVO] Renderizado cinematográfico avanzado (Color Grading + Texturas).
  narrativo    -> [NUEVO] Usa Inteligencia Artificial para crear trama y video (Google Veo 3.1).
  matrix_phonk -> [NUEVO] Motor de montaje hiperkinético BESS basado en Beats (Librosa + FFmpeg).
  
Ejemplo: node index.js matrix_phonk
    `);
    process.exit(1);
  }

  if (mode === 'documental') {
    console.log("🎬 EJECUTANDO MODO DOCUMENTAL (KEN BURNS) 🎬\n");
    await robots.video_v2_documental();
  } 
  else if (mode === 'high_end') {
    console.log("🎬 EJECUTANDO MODO ALTA GAMA (CINEMATIC) 🎬\n");
    await robots.video_high_end();
  }
  else if (mode === 'narrativo') {
    console.log("🎬 EJECUTANDO MODO DIRECTOR DE CINE IA (GUION + VEO 3.1) 🎬\n");
    await robots.scriptwriter();
    await robots.video_generator_v3();
    await robots.lipsync();
    await robots.video_v3_narrativo();
  } 
  else if (mode === 'matrix_phonk') {
    console.log("🎬 EJECUTANDO MODO MONTAJE MATEMÁTICO (BESS MATRIX PHONK) 🎬\n");
    await robots.scriptwriter();
    await robots.video_generator_v3();
    await robots.video_v4_phonk_assembler();
  }
  else {
    console.error(`❌ Modo desconocido: ${mode}. Usa 'documental' o 'narrativo'.`);
  }
}

start();
