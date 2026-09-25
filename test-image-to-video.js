import { GoogleGenAI } from "@google/genai";
import fs from "fs";

const apiKey = process.env.GCP_TELEGRAM_API_KEY || "AIzaSyAENjC80ga51V8ohwhRaK48fSjJ2Y88Gg4";
const ai = new GoogleGenAI({ apiKey: apiKey });

async function run() {
  console.log("Probando Image-to-Video con Veo 3.1...");
  
  const filename = './content/jota.jpg';
  
  if (!fs.existsSync(filename)) {
    console.error("No se encontró la imagen jota.jpg en la carpeta content.");
    return;
  }

  try {
    console.log("Subiendo imagen local a Gemini para que la use de referencia...");
    const uploadResult = await ai.files.upload({
      file: filename,
      mimeType: "image/jpeg",
    });
    console.log("Subida exitosa:", uploadResult.name);

    const prompt = "A raw 1990s underground hip-hop music video scene of this exact person rapping into the camera. Gritty 16mm film, heavy film grain, VHS textures. No glossy CGI.";

    console.log("Pidiendo a Veo 3.1 que anime la foto...");
    let operation = await ai.models.generateVideos({
      model: "veo-3.1-generate-preview",
      // En la SDK nueva, para Image-to-Video se suele pasar la imagen junto con el prompt
      contents: [
        { fileData: { fileUri: uploadResult.uri, mimeType: "image/jpeg" } },
        { text: prompt }
      ],
      config: {
        aspectRatio: "16:9",
      },
    });

    while (!operation.done) {
      console.log("Esperando renderizado de Veo 3.1... (10s)");
      await new Promise(resolve => setTimeout(resolve, 10000));
      operation = await ai.operations.getVideosOperation({
        operation: operation,
      });
    }

    if (!operation.response || !operation.response.generatedVideos || !operation.response.generatedVideos[0]) {
      console.error("DETALLES DE RESPUESTA:", JSON.stringify(operation, null, 2));
      throw new Error("La IA bloqueó la generación o falló.");
    }

    console.log("¡Video generado!");
    await ai.files.download({
      file: operation.response.generatedVideos[0].video,
      downloadPath: "./content/clip_test_image.mp4",
    });
    console.log("Guardado en ./content/clip_test_image.mp4");

  } catch (e) {
    console.error("Error en Image-to-Video:", e.message || e);
  }
}

run();
