require('dotenv').config();
const { GoogleGenAI } = require("@google/genai");
const fs = require("fs");
const path = require("path");

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error("> [video-generator] 🚨 ERROR: No se encontró la GEMINI_API_KEY en el archivo .env");
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey: apiKey });

// CONFIGURACIÓN DE SEGURIDAD Y COSTOS
const AUDIT_CONFIG = {
  TEST_MODE: false,        // Si es true, solo procesa 1 clip y se detiene.
  POLLING_INTERVAL: 15000, // 15 segundos entre chequeos de estado (Evita 429)
  COOLDOWN_TIME: 30000,    // 30 segundos entre escenas
  MAX_RETRIES: 2           // Máximo de reintentos por escena
};

async function robot() {
  console.log("> [video-generator] 🛡️ Iniciando Director de Video (AUDIT MODE ACTIVE)...");
  
  const sharedPath = path.resolve('./content/shared');
  const outputPath = path.resolve('./content/v3_narrativo');
  const scriptPath = path.join(sharedPath, 'script.json');

  if (!fs.existsSync(scriptPath)) {
    console.error("> [video-generator] ❌ Error: Faltan script.json. Ejecuta el guionista primero.");
    process.exit(1);
  }

  const lyrics = JSON.parse(fs.readFileSync(scriptPath, 'utf8'));
  console.log(`> [video-generator] Guion Técnico cargado con ${lyrics.length} escenas.`);

  if (AUDIT_CONFIG.TEST_MODE) {
    console.log("> [video-generator] ⚠️ MODO PRUEBA ACTIVO: Solo se procesará la primera escena faltante.");
  }

  for (let i = 0; i < lyrics.length; i++) {
    const scene = lyrics[i];
    const clipPath = path.join(outputPath, `clip_${i}.mp4`);
    
    if (fs.existsSync(clipPath)) {
      console.log(`> [video-generator] Clip ${i} ya existe. Saltando...`);
      continue;
    }

    console.log(`\n> [video-generator] 🎬 Filmando Escena ${i}/${lyrics.length}: "${scene.text}"`);
    
    let prompt = scene.prompt;
    if (scene.singing) {
      prompt += ", close-up shot, looking at camera, singing, lips moving clearly, cinematic lighting, high detail face";
    }
    
    let success = false;
    let attempts = 0;

    while (!success && attempts < AUDIT_CONFIG.MAX_RETRIES) {
      try {
        console.log(`> [video-generator] Enviando orden a Google Veo 3.1 (Intento ${attempts + 1})...`);
        let operation = await ai.models.generateVideos({
          model: "veo-3.1-generate-preview",
          prompt: prompt,
          config: {
            aspectRatio: "16:9",
          },
        });

        while (!operation.done) {
          console.log(`> [video-generator] Renderizando clip ${i}... (esperando ${AUDIT_CONFIG.POLLING_INTERVAL/1000}s)`);
          await new Promise((resolve) => setTimeout(resolve, AUDIT_CONFIG.POLLING_INTERVAL));
          operation = await ai.operations.getVideosOperation({
            operation: operation,
          });
        }

        console.log(`> [video-generator] ✅ Clip ${i} generado. Descargando...`);
        if (!operation.response || !operation.response.generatedVideos || !operation.response.generatedVideos[0]) {
          throw new Error("Respuesta inválida de Veo (posible bloqueo de seguridad).");
        }

        await ai.files.download({
          file: operation.response.generatedVideos[0].video,
          downloadPath: clipPath,
        });
        
        console.log(`> [video-generator] 💾 Guardado como clip_${i}.mp4`);
        success = true;
        
      } catch (error) {
        const errorMsg = error.message.toLowerCase();
        console.error(`> [video-generator] ❌ Error en escena ${i}:`, error.message);

        // FRENO DE MANO DE EMERGENCIA (429 = Quota, 403 = Billing/Forbidden)
        if (errorMsg.includes("429") || errorMsg.includes("quota") || errorMsg.includes("403")) {
          console.error("> [video-generator] 🚨 LÍMITE DE CUOTA O ERROR DE FACTURACIÓN DETECTADO. ABORTANDO TODO PARA EVITAR GASTOS.");
          process.exit(1);
        }

        attempts++;
        console.log(`> [video-generator] ⏳ Esperando ${AUDIT_CONFIG.COOLDOWN_TIME/1000}s antes de reintentar...`);
        await new Promise((resolve) => setTimeout(resolve, AUDIT_CONFIG.COOLDOWN_TIME));
      }
    }
    
    if (success && AUDIT_CONFIG.TEST_MODE) {
      console.log("> [video-generator] ✅ Modo Prueba completado con éxito. Deteniendo ejecución.");
      break; 
    }

    if (!success) {
      console.error(`> [video-generator] 🚨 No se pudo generar la escena ${i}. Abortando para revisión.`);
      process.exit(1);
    }

    console.log(`> [video-generator] Descansando ${AUDIT_CONFIG.COOLDOWN_TIME/1000}s para respetar límites...`);
    await new Promise((resolve) => setTimeout(resolve, AUDIT_CONFIG.COOLDOWN_TIME));
  }
}

module.exports = robot;
