
import React, { useEffect, useRef, useState } from 'react';
import { XCircleIcon, WaveformIcon, MicrophoneIcon } from './icons';
import { getGenAiInstance } from '../services/geminiService';
import { decodeAudioData, base64ToPcm, pcmToBase64 } from '../utils/audioUtils';
import { LiveServerMessage, Modality, Blob } from '@google/genai';

interface LiveSessionOverlayProps {
    onClose: () => void;
    initialContext?: string;
}

export const LiveSessionOverlay: React.FC<LiveSessionOverlayProps> = ({ onClose, initialContext }) => {
    const [status, setStatus] = useState<'connecting' | 'active' | 'error' | 'disconnected'>('connecting');
    const [isTalking, setIsTalking] = useState(false); // Used for visualization
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // Audio Refs
    const inputAudioContextRef = useRef<AudioContext | null>(null);
    const outputAudioContextRef = useRef<AudioContext | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const processorRef = useRef<ScriptProcessorNode | null>(null);
    const outputNodeRef = useRef<GainNode | null>(null);
    const nextStartTimeRef = useRef<number>(0);
    const sessionRef = useRef<Promise<any> | null>(null);
    
    useEffect(() => {
        let mounted = true;

        const startSession = async () => {
            try {
                // Initialize Audio Contexts
                inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
                outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
                outputNodeRef.current = outputAudioContextRef.current.createGain();
                outputNodeRef.current.connect(outputAudioContextRef.current.destination);

                // Get Microphone Stream
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                mediaStreamRef.current = stream;

                const ai = getGenAiInstance();
                
                // Connect to Live API
                sessionRef.current = ai.live.connect({
                    model: 'gemini-2.5-flash-native-audio-preview-09-2025',
                    callbacks: {
                        onopen: () => {
                            if (!mounted) return;
                            setStatus('active');
                            
                            // Setup Mic Processing
                            if (inputAudioContextRef.current) {
                                const source = inputAudioContextRef.current.createMediaStreamSource(stream);
                                const scriptProcessor = inputAudioContextRef.current.createScriptProcessor(4096, 1, 1);
                                processorRef.current = scriptProcessor;

                                scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
                                    const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                                    
                                    // Simple visualizer trigger
                                    let sum = 0;
                                    for(let i=0; i<inputData.length; i++) sum += Math.abs(inputData[i]);
                                    const avg = sum / inputData.length;
                                    if(avg > 0.05) setIsTalking(true);
                                    else setIsTalking(false);

                                    // PCM 16-bit conversion
                                    const l = inputData.length;
                                    const int16 = new Int16Array(l);
                                    for (let i = 0; i < l; i++) {
                                        let s = Math.max(-1, Math.min(1, inputData[i]));
                                        int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
                                    }
                                    
                                    const pcmData = pcmToBase64(new Uint8Array(int16.buffer));
                                    
                                    sessionRef.current?.then(session => {
                                        session.sendRealtimeInput({
                                            media: {
                                                mimeType: 'audio/pcm;rate=16000',
                                                data: pcmData
                                            }
                                        });
                                    });
                                };

                                source.connect(scriptProcessor);
                                scriptProcessor.connect(inputAudioContextRef.current.destination);
                            }
                        },
                        onmessage: async (message: LiveServerMessage) => {
                            if (!mounted) return;
                            
                            // Handle Audio Output from Model
                            const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
                            if (base64Audio && outputAudioContextRef.current && outputNodeRef.current) {
                                const ctx = outputAudioContextRef.current;
                                nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
                                
                                const audioBuffer = await decodeAudioData(
                                    base64ToPcm(base64Audio),
                                    ctx,
                                    24000,
                                    1
                                );

                                const source = ctx.createBufferSource();
                                source.buffer = audioBuffer;
                                source.connect(outputNodeRef.current);
                                source.start(nextStartTimeRef.current);
                                nextStartTimeRef.current += audioBuffer.duration;
                            }
                            
                            // Handle Interruption
                            if (message.serverContent?.interrupted) {
                                nextStartTimeRef.current = 0; // Reset timeline
                                // Note: In a robust implementation, we would stop all currently playing nodes.
                                // For this simple version, we reset the cursor so new audio plays immediately.
                            }
                        },
                        onerror: (err) => {
                           console.error("Live API Error:", err);
                           setErrorMessage("حدث خطأ في الاتصال.");
                           setStatus('error');
                        },
                        onclose: () => {
                            console.log("Session Closed");
                            if (mounted) setStatus('disconnected');
                        }
                    },
                    config: {
                        responseModalities: [Modality.AUDIO],
                        speechConfig: {
                            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
                        },
                        systemInstruction: `You are a helpful and friendly AI assistant. You speak Arabic fluently. 
                        Context provided by user: ${initialContext || 'No context provided, just a general chat.'}
                        Keep answers concise and conversational.`
                    }
                });

            } catch (err) {
                console.error("Setup Error:", err);
                setErrorMessage("فشل في الوصول إلى الميكروفون أو بدء الجلسة.");
                setStatus('error');
            }
        };

        startSession();

        return () => {
            mounted = false;
            // Cleanup logic
            if (mediaStreamRef.current) {
                mediaStreamRef.current.getTracks().forEach(track => track.stop());
            }
            if (processorRef.current) {
                processorRef.current.disconnect();
                processorRef.current.onaudioprocess = null;
            }
            if (inputAudioContextRef.current) inputAudioContextRef.current.close();
            if (outputAudioContextRef.current) outputAudioContextRef.current.close();
            
            // Note: @google/genai doesn't expose a direct 'disconnect' on the promise, 
            // but closing the socket happens when browser unloads or we can trigger it 
            // via session.close() if we stored the session object.
            sessionRef.current?.then(session => {
                // Defensive check if close method exists (it might vary by SDK version)
                if(session && typeof session.close === 'function') session.close();
            });
        };
    }, [initialContext]);

    return (
        <div className="fixed inset-0 z-[60] bg-slate-900/95 backdrop-blur-xl flex flex-col items-center justify-center animate-fade-in">
            <button 
                onClick={onClose} 
                className="absolute top-6 right-6 p-2 rounded-full bg-white/10 text-white hover:bg-red-500/20 hover:text-red-400 transition-colors"
                title="إنهاء المحادثة"
            >
                <XCircleIcon className="w-8 h-8" />
            </button>

            <div className="flex flex-col items-center gap-8 max-w-md text-center px-6">
                <div className={`relative flex items-center justify-center w-32 h-32 rounded-full transition-all duration-300 ${status === 'active' ? 'bg-blue-600/20' : 'bg-slate-800'}`}>
                    {/* Pulsing Rings */}
                    {status === 'active' && (
                        <>
                            <div className={`absolute inset-0 rounded-full bg-blue-500/30 animate-ping`} style={{ animationDuration: '2s' }}></div>
                            <div className={`absolute inset-0 rounded-full bg-blue-400/20 animate-ping`} style={{ animationDuration: '3s', animationDelay: '0.5s' }}></div>
                        </>
                    )}
                    
                    {/* Icon */}
                    <div className="z-10 text-white">
                        {status === 'active' ? (
                           <WaveformIcon className={`w-12 h-12 ${isTalking ? 'text-green-400 scale-110' : 'text-blue-400'} transition-all`} />
                        ) : status === 'error' ? (
                            <XCircleIcon className="w-12 h-12 text-red-500" />
                        ) : (
                            <MicrophoneIcon className="w-12 h-12 text-slate-400 animate-pulse" />
                        )}
                    </div>
                </div>

                <div className="space-y-2">
                    <h2 className="text-2xl font-bold text-white">
                        {status === 'connecting' && 'جاري الاتصال...'}
                        {status === 'active' && 'أنا أستمع إليك...'}
                        {status === 'error' && 'حدث خطأ'}
                        {status === 'disconnected' && 'انتهت المحادثة'}
                    </h2>
                    <p className="text-slate-400">
                        {status === 'active' 
                            ? 'تحدث بحرية، أنا هنا للمساعدة.' 
                            : errorMessage || 'يتم إنشاء اتصال آمن ومباشر مع الذكاء الاصطناعي'}
                    </p>
                </div>
            </div>
            
            <div className="absolute bottom-10 text-slate-500 text-sm">
                 محادثة صوتية مباشرة باستخدام Gemini 2.5 Live
            </div>
        </div>
    );
};
