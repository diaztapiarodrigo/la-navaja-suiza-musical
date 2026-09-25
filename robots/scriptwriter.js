const { GoogleGenAI } = require("@google/genai");
const fs = require("fs");
const path = require("path");

const apiKey = process.env.GCP_TELEGRAM_API_KEY || "AIzaSyAENjC80ga51V8ohwhRaK48fSjJ2Y88Gg4";
const ai = new GoogleGenAI({ apiKey: apiKey });

async function robot() {
  console.log('> [scriptwriter] Iniciando el Escritor de Guion Cinematográfico IA...');
  
  const contentPath = path.resolve(__dirname, '../content/shared');
  const lyricsPath = path.join(contentPath, 'lyrics.json');
  const scriptPath = path.join(contentPath, 'script.json');

  if (!fs.existsSync(lyricsPath)) {
    throw new Error("> [scriptwriter] No se encontró lyrics.json");
  }

  const data = JSON.parse(fs.readFileSync(lyricsPath, 'utf8'));
  const lyrics = data.lyrics;
  const voiceDescription = data.voice_description;
  console.log(`> [scriptwriter] Analizando ${lyrics.length} escenas de la letra...`);
  console.log(`> [scriptwriter] Voz detectada: ${voiceDescription}`);

  const systemInstruction = `
Escribe prompts ULTRA-DETALLADOS para Veo 3.1 (Google's Video Model).
Debes especificar: lente de la cámara (ej: 35mm lens, f/1.8), tipo de iluminación (ej: cinematic lighting, neon glow, chiaroscuro), textura, color grading (ej: teal and orange, moody, cyberpunk), y movimientos de cámara (ej: slow pan, drone tracking shot).

VOZ DEL ARTISTA: ${voiceDescription}

PASO 1: Define el ESCENARIO MAESTRO:
- Las escenas alternarán entre dos conceptos: La "Oficina Hacker BESS" y "Las Mascotas Baterías Animadas".
- Oficina Hacker: Un joven analista de energía de 25 años como LÍDER, enfocado, cantando, rodeado de su equipo en un War Room oscuro lleno de pantallas.
- Mascotas Baterías: Pilas industriales BESS gigantes, antropomórficas, en 3D o estilo realista/animado, bailando enérgicamente.

PASO 2: Define el ESTILO VISUAL:
- Elige una estética cinematográfica: Cyberpunk Phonk, Iluminación de Neon Noir (Cyan y Verde), cámaras agresivas.

PASO 3: Genera un guion técnico.
REGLA DE ORO 1: INSTRUCCIONES ESPECÍFICAS. Si el json original incluye un campo "concept", DEBES basar la descripción visual de esa escena exactamente en ese "concept".
REGLA DE ORO 2: LIP SYNC (CLAVE). Solo las escenas donde el joven hacker canta deben tener "singing: true", e incluir en el prompt "facing camera, singing, high detail on mouth, close up shot". Las escenas de pilas DEBEN tener "singing: false".
REGLA DE ORO 3: IDIOMA. Los prompts DEBEN estar en INGLÉS técnico de cinematografía.
REGLA DE ORO 4: NO TEXTO. Bajo ninguna circunstancia pidas texto, letras o subtítulos renderizados dentro del video.

FORMATO DE SALIDA: Devuelve estrictamente un array JSON válido, donde cada elemento sea el objeto original pero añadiendo:
- "prompt": Instrucciones hiper-detalladas en inglés para Veo 3.1.
- "singing": boolean indicando si canta a cámara en ese clip (ponlo en false si muestras solo infraestructura).
`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{
        role: "user",
        parts: [
          { text: "Genera el guion técnico maestro basado en esta letra:\n\n" + JSON.stringify(lyrics) }
        ]
      }],
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
      }
    });

    const scriptJson = JSON.parse(response.text);
    
    fs.writeFileSync(scriptPath, JSON.stringify(scriptJson, null, 2));
    console.log(`> [scriptwriter] ¡Guion técnico maestro escrito! Guardado en script.json.`);

  } catch (error) {
    console.error("> [scriptwriter] Error generando guion:", error);
  }
}

module.exports = robot;
