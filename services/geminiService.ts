
import { GoogleGenAI, Type } from "@google/genai";

/**
 * Service to handle the virtual try-on logic using Gemini 2.5 Flash Image.
 * Implements a "Nuclear Identity Lock" to ensure the person in Image 1 is strictly preserved.
 */

export async function generateTryOnImages(
  personBase64: string, 
  clothingBase64: string,
  accessories?: string[]
): Promise<string[]> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const personData = personBase64.split(',')[1];
  const clothingData = clothingBase64.split(',')[1];

  const accessoryContext = accessories && accessories.length > 0 
    ? ` Adicionalmente, equipe a pessoa com estes acessórios específicos: ${accessories.join(', ')}.`
    : "";

  // Geramos duas variações mantendo a identidade intacta.
  const variations = [
    {
      style: "fotografia de estúdio de alta fidelidade",
      setting: "fundo neutro de catálogo"
    },
    {
      style: "fotografia urbana realista",
      setting: "ambiente externo com iluminação natural"
    }
  ];

  // Executamos as gerações em paralelo para reduzir drasticamente o tempo de espera (usabilidade mobile)
  const generatePromises = variations.map(async (config) => {
    const promptText = `
      MANDATO SUPREMO DE IDENTIDADE - NÃO DESVIE DESTAS REGRAS:

      1. IDENTIDADE MESTRE (IMAGEM 1): 
         - Esta é a PESSOA ALVO. O resultado final DEVE ser esta pessoa exata.
         - Mantenha 100% da FACE (olhos, nariz, boca, expressões), CABELO (cor, corte, textura), TOM DE PELE e BIOTIPO CORPORAL.
         - É proibido misturar traços físicos da Imagem 2 nesta pessoa.

      2. FONTE DE TEXTURA (IMAGEM 2):
         - Esta imagem contém a ROUPA desejada.
         - REGRA DE OURO: Ignore COMPLETAMENTE o ser humano na Imagem 2. Descarte o rosto, a pele, o cabelo e o gênero da pessoa da Imagem 2.
         - Trate a Imagem 2 como se fosse apenas um manequim invisível segurando um tecido. Extraia apenas o design, a cor e a textura da roupa.

      3. COMPOSIÇÃO:
         - Transfira a roupa da Imagem 2 para o corpo da pessoa da Imagem 1.
         - Ajuste o caimento da roupa perfeitamente às curvas e pose da pessoa da Imagem 1.
         - Estilo Visual: ${config.style}. Cenário: ${config.setting}.${accessoryContext}

      CONCLUSÃO: O objetivo é uma foto realística onde a PESSOA DA IMAGEM 1 está usando a ROUPA DA IMAGEM 2. A identidade da Imagem 1 é a prioridade absoluta.
    `;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [
            { inlineData: { data: personData, mimeType: 'image/jpeg' } },
            { inlineData: { data: clothingData, mimeType: 'image/jpeg' } },
            { text: promptText },
          ],
        },
      });
      return response;
    } catch (error) {
      console.error("Erro na geração individual:", error);
      return null;
    }
  });

  const responses = await Promise.all(generatePromises);
  const results: string[] = [];

  for (const response of responses) {
    if (response?.candidates && response.candidates[0].content.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          results.push(`data:image/png;base64,${part.inlineData.data}`);
        }
      }
    }
  }

  if (results.length === 0) {
    throw new Error("A IA não conseguiu isolar a identidade. Use fotos mais nítidas da sua face.");
  }

  return results.slice(0, 2);
}

/**
 * Analyzes a result image and suggests matching accessories using Gemini 3 Flash.
 */
export async function suggestAccessories(imageBase64: string): Promise<string[]> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const imageData = imageBase64.split(',')[1];

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          { inlineData: { data: imageData, mimeType: 'image/png' } },
          { text: "Analise o look final e sugira 10 acessórios de moda em Português que combinem perfeitamente com o estilo atual." }
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      }
    });

    const text = response.text;
    if (text) return JSON.parse(text);
    return [];
  } catch (error) {
    console.error("Erro ao sugerir acessórios:", error);
    return [];
  }
}
