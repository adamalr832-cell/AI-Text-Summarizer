
import { GoogleGenAI, Type, Modality } from "@google/genai";
import type { SummaryType, FlashcardData, PronunciationData } from '../types';
import { LANGUAGES } from "../constants";

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable is not set.");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getGenAiInstance = () => ai;

const getSummarizationPrompt = (type: SummaryType): string => {
    switch (type) {
        case 'short':
            return 'لخص النص التالي بشكل "عادي" وموجز. اعطني الزبدة في فقرة قصيرة وواضحة.';
        case 'points':
            return 'قم بتلخيص النص واستخراج جميع النقاط الرئيسية والمهمة في شكل قائمة نقطية شاملة. تأكد من تغطية كافة الجوانب الأساسية بوضوح وبشكل مباشر.';
        case 'detailed':
            return 'لخص النص التالي بشكل "مفصل" وشامل. اشرح الأفكار الرئيسية وتوسع في التفاصيل المهمة لتقديم فهم كامل للمحتوى.';
        case 'medium':
        default:
            return 'لخص النص التالي بشكل "متوسط". لا تكن موجزاً جداً ولا مفصلاً جداً. غطِ النقاط الأساسية بوضوح في فقرتين كحد أقصى.';
    }
};

export const summarizeText = async (text: string, type: SummaryType): Promise<string> => {
    try {
        const model = 'gemini-2.5-flash';
        const systemInstruction = getSummarizationPrompt(type);

        const response = await ai.models.generateContent({
            model,
            contents: `النص المراد تلخيصه:\n\n${text}`,
            config: { systemInstruction },
        });

        return response.text ? response.text.trim() : "عذراً، لم يتم إنشاء ملخص.";
    } catch (error) {
        console.error("Error in summarizeText:", error);
        throw new Error("Failed to get summary from Gemini API.");
    }
};

export const translateText = async (text: string, languageCode: string): Promise<string> => {
    try {
        const language = LANGUAGES.find(lang => lang.code === languageCode);
        const languageName = language ? language.name : languageCode;
        
        const model = 'gemini-2.5-flash';
        const systemInstruction = `You are an expert translator. Your task is to translate the provided text into ${languageName}. Your response must contain ONLY the translated text and nothing else. Do not include any introductory phrases, explanations, or any other text.`;

        const response = await ai.models.generateContent({
            model,
            contents: text,
            config: { systemInstruction }
        });

        return response.text ? response.text.trim() : "";
    } catch (error) {
        console.error("Error in translateText:", error);
        throw new Error("Failed to translate text using Gemini API.");
    }
};

export const generateFlashcards = async (text: string): Promise<FlashcardData[]> => {
    let responseText = '';
    try {
        const model = 'gemini-2.5-flash';
        const prompt = `Based on the following text, generate a set of 5-8 question-and-answer pairs suitable for flashcards. The questions should test the key concepts in the text.
        Text:
        ---
        ${text}
        ---
        `;
        
        const response = await ai.models.generateContent({
            model,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            question: {
                                type: Type.STRING,
                                description: "The question for the flashcard."
                            },
                            answer: {
                                type: Type.STRING,
                                description: "The answer to the question."
                            }
                        },
                        required: ["question", "answer"],
                    }
                }
            }
        });
        
        responseText = response.text ? response.text.trim() : "";
    } catch (error) {
        console.error("Gemini API call failed in generateFlashcards:", error);
        throw new Error("API_ERROR");
    }

    if (!responseText) {
        console.error("Gemini returned an empty response for flashcards.");
        throw new Error("EMPTY_RESPONSE");
    }

    try {
        const parsedFlashcards: FlashcardData[] = JSON.parse(responseText);
        return parsedFlashcards;
    } catch (error) {
        console.error("Failed to parse JSON for flashcards:", responseText);
        throw new Error("INVALID_FORMAT");
    }
};

export const generatePronunciationGuide = async (text: string): Promise<PronunciationData[]> => {
    let responseText = '';
    try {
        const model = 'gemini-2.5-flash';
        const prompt = `Analyze the following text. Identify complex, technical, or difficult words. For each word, provide:
        1. The Word itself.
        2. A pronunciation guide. If the word is Arabic, use full Tashkeel/Diacritics. If it is English or another language, use a simplified phonetic spelling (e.g., "Schedule" -> "SKEH-jool").
        3. A very brief note or meaning in Arabic.

        Text to analyze:
        ---
        ${text}
        ---
        `;

        const response = await ai.models.generateContent({
            model,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            word: { type: Type.STRING, description: "The complex word" },
                            pronunciation: { type: Type.STRING, description: "Phonetic pronunciation or Tashkeel" },
                            note: { type: Type.STRING, description: "Brief meaning or note in Arabic" }
                        },
                        required: ["word", "pronunciation", "note"]
                    }
                }
            }
        });
        
        responseText = response.text ? response.text.trim() : "";
    } catch (error) {
        console.error("Gemini API call failed in generatePronunciationGuide:", error);
        throw new Error("API_ERROR");
    }

    if (!responseText) {
        throw new Error("EMPTY_RESPONSE");
    }

    try {
        const parsedData: PronunciationData[] = JSON.parse(responseText);
        return parsedData;
    } catch (error) {
        console.error("Failed to parse JSON for pronunciation:", responseText);
        throw new Error("INVALID_FORMAT");
    }
};

export const generateSpeech = async (text: string): Promise<string> => {
    try {
        const model = "gemini-2.5-flash-preview-tts";
        const response = await ai.models.generateContent({
            model,
            contents: [{ parts: [{ text }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: {
                        // Changed from Puck to Kore for a generally "better" (more neutral/clear) default
                        prebuiltVoiceConfig: { voiceName: 'Kore' },
                    },
                },
            },
        });

        const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (!audioData) {
            throw new Error("No audio data received");
        }
        return audioData;
    } catch (error) {
        console.error("Error in generateSpeech:", error);
        throw new Error("Failed to generate speech.");
    }
};

export const generateKeyInsights = async (text: string): Promise<string[]> => {
    let responseText = '';
    try {
        const model = 'gemini-2.5-flash';
        const prompt = `Extract the 5 to 7 most important key insights, facts, or takeaways from the text below. 
        Return them as a simple JSON list of strings. The insights should be concise and actionable.
        Language: Arabic.
        
        Text:
        ---
        ${text}
        ---`;

        const response = await ai.models.generateContent({
            model,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                }
            }
        });
        responseText = response.text ? response.text.trim() : "";
    } catch (error) {
        console.error("Error generating key insights:", error);
        throw new Error("Failed to generate key insights.");
    }

    if (!responseText) {
        throw new Error("Empty response for insights");
    }

    try {
        return JSON.parse(responseText);
    } catch (e) {
        console.error("Error parsing insights JSON:", e);
        throw new Error("Failed to parse insights.");
    }
};

export const askQuestionAboutText = async (text: string, question: string): Promise<string> => {
    try {
        const model = 'gemini-2.5-flash';
        const prompt = `You are a helpful assistant designed to help users understand the provided text.
        Answer the user's question based ONLY on the information found in the text below. 
        If the answer is not in the text, politely say that the information is not mentioned.
        Keep your answer concise and helpful. Language: Arabic.

        Source Text:
        ---
        ${text}
        ---

        User Question: ${question}`;

        const response = await ai.models.generateContent({
            model,
            contents: prompt,
        });

        return response.text ? response.text.trim() : "عذراً، لم أستطع توليد إجابة.";
    } catch (error) {
        console.error("Error asking question:", error);
        throw new Error("Failed to answer question.");
    }
};

const fileToGenerativePart = async (file: File) => {
    const base64EncodedDataPromise = new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
        reader.readAsDataURL(file);
    });
    return {
        inlineData: {
            data: await base64EncodedDataPromise,
            mimeType: file.type,
        },
    };
};

export const extractTextFromImage = async (file: File): Promise<string> => {
    try {
        const model = 'gemini-2.5-flash';
        const imagePart = await fileToGenerativePart(file);
        const textPart = { text: 'استخرج كل النص الموجود في هذه الصورة. أجب بالنص المستخرج فقط، بدون أي مقدمات أو ملاحظات إضافية.' };

        const response = await ai.models.generateContent({
            model,
            contents: { parts: [imagePart, textPart] },
        });
        
        if (!response.text) {
             throw new Error("The model did not return any text from the image.");
        }

        return response.text.trim();
    } catch (error) {
        console.error("Error in extractTextFromImage:", error);
        throw new Error("Failed to extract text from image. The image might be unclear or contain no text.");
    }
};
