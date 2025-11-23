
import React, { useCallback, useState, useRef, useEffect } from 'react';
import type { SummaryType } from '../types';
import type { LoadingState } from '../App';
import { UploadIcon, SummarizeIcon, TrashIcon, ListIcon, ParagraphIcon, GraduationCapIcon, MicrophoneIcon, StopIcon, ListCheckIcon } from './icons';

interface InputSectionProps {
    inputText: string;
    setInputText: (text: string) => void;
    onSummarize: (type: SummaryType) => void;
    loadingState: LoadingState;
    summaryType: SummaryType;
    setSummaryType: (type: SummaryType) => void;
    onFileChange: (file: File) => void;
    fileName: string | null;
    onClear: () => void;
    onStartLive?: () => void;
}

export const InputSection: React.FC<InputSectionProps> = ({ 
    inputText,
    setInputText,
    onSummarize, 
    loadingState, 
    summaryType, 
    setSummaryType,
    onFileChange,
    fileName,
    onClear,
    onStartLive
}) => {
    const [isListening, setIsListening] = useState(false);
    const recognitionRef = useRef<any>(null);

    const handleFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
           onFileChange(file);
        }
        event.target.value = '';
    }, [onFileChange]);
    
    const handleTextChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
        setInputText(event.target.value);
    };

    const handleClear = () => {
        onClear();
        const fileInput = document.getElementById('file-upload') as HTMLInputElement;
        if (fileInput) {
            fileInput.value = '';
        }
        if (isListening) {
            stopListening();
        }
    };

    const toggleListening = () => {
        if (isListening) {
            stopListening();
        } else {
            startListening();
        }
    };

    const startListening = () => {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            alert('عذراً، متصفحك لا يدعم خاصية تحويل الصوت إلى نص.');
            return;
        }

        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        recognitionRef.current = new SpeechRecognition();
        
        recognitionRef.current.lang = 'ar-SA';
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;

        recognitionRef.current.onstart = () => {
            setIsListening(true);
        };

        recognitionRef.current.onresult = (event: any) => {
            let finalTranscript = '';
            
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript + ' ';
                }
            }
            
            if (finalTranscript) {
                setInputText(prev => prev + (prev && !prev.endsWith(' ') ? ' ' : '') + finalTranscript);
            }
        };

        recognitionRef.current.onerror = (event: any) => {
            console.error('Speech recognition error', event.error);
            setIsListening(false);
        };

        recognitionRef.current.onend = () => {
            if (isListening) {
               setIsListening(false);
            }
        };

        recognitionRef.current.start();
    };

    const stopListening = () => {
        if (recognitionRef.current) {
            recognitionRef.current.stop();
            setIsListening(false);
        }
    };

    useEffect(() => {
        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.stop();
            }
        };
    }, []);

    const summaryOptions = [
        { id: 'short', label: 'ملخص عادي', value: 'short' as SummaryType, icon: ListIcon },
        { id: 'medium', label: 'ملخص متوسط', value: 'medium' as SummaryType, icon: ParagraphIcon },
        { id: 'detailed', label: 'ملخص مفصل', value: 'detailed' as SummaryType, icon: GraduationCapIcon },
        { id: 'points', label: 'نقاط رئيسية', value: 'points' as SummaryType, icon: ListCheckIcon },
    ];
    
    const isLoading = loadingState !== 'idle';

    const getButtonText = () => {
        switch(loadingState) {
            case 'summarizing': return 'جاري التلخيص...';
            case 'extracting': return 'جاري استخراج النص...';
            case 'translating': return 'جاري الترجمة...';
            case 'flashcards': return 'جاري الإنشاء...';
            case 'pronunciation': return 'جاري إنشاء الدليل...';
            default: return 'لخص النص';
        }
    }

    return (
        <div className="bg-white dark:bg-slate-800/50 backdrop-blur-md p-6 rounded-xl border border-slate-200 dark:border-white/10 space-y-6 shadow-xl dark:shadow-2xl transition-all duration-300">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-slate-800 dark:text-white">أدخل النص أو ارفع ملف</h2>
                <div className="flex gap-2 items-center">
                     {onStartLive && (
                         <button
                            onClick={onStartLive}
                            className="flex items-center gap-2 px-4 py-2 rounded-full text-white bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-purple-500/30"
                            aria-label="محادثة مباشرة مع الذكاء الاصطناعي"
                            disabled={isLoading}
                            title="محادثة مباشرة"
                         >
                             <MicrophoneIcon className="w-5 h-5" />
                             <span className="font-bold">AI</span>
                         </button>
                     )}
                    <button
                        onClick={toggleListening}
                        className={`p-2 rounded-full transition-colors ${isListening ? 'bg-red-500/10 text-red-500 animate-pulse ring-2 ring-red-500/50' : 'text-slate-500 hover:text-blue-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700/50'}`}
                        aria-label={isListening ? "إيقاف التسجيل" : "بدء التسجيل الصوتي"}
                        disabled={isLoading}
                    >
                        {isListening ? <StopIcon className="w-5 h-5" /> : <MicrophoneIcon className="w-5 h-5" />}
                    </button>
                    {inputText && (
                        <button
                            onClick={handleClear}
                            className="p-2 rounded-full text-slate-500 hover:text-red-500 hover:bg-red-50 dark:text-slate-400 dark:hover:bg-slate-700/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            aria-label="مسح الكل"
                            disabled={isLoading}
                        >
                            <TrashIcon className="w-5 h-5" aria-hidden="true" />
                        </button>
                    )}
                </div>
            </div>
            
            <textarea
                className="w-full h-60 p-4 border border-slate-200 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-900/70 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                placeholder={isListening ? "جاري الاستماع..." : "الصق النص هنا أو استخدم المثال..."}
                value={inputText}
                onChange={handleTextChange}
                disabled={isLoading}
                aria-label="النص المراد تلخيصه"
                dir="auto"
            />
            
            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                     {summaryOptions.map((option) => (
                        <button
                            key={option.id}
                            onClick={() => setSummaryType(option.value)}
                            className={`flex items-center justify-center gap-2 p-3 rounded-lg text-sm font-medium transition-all border ${
                                summaryType === option.value
                                    ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 shadow-sm'
                                    : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                            }`}
                            disabled={isLoading}
                        >
                            <option.icon className="w-4 h-4" />
                            <span>{option.label}</span>
                        </button>
                    ))}
                </div>

                <div className="flex flex-col sm:flex-row gap-4 items-center">
                     <div className="flex-1 w-full sm:w-auto relative">
                        <label htmlFor="file-upload" className="flex items-center justify-center w-full p-3 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg cursor-pointer hover:border-blue-500 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all group">
                            <UploadIcon className="w-5 h-5 text-slate-400 group-hover:text-blue-500 mr-2 rtl:ml-2 rtl:mr-0 transition-colors" />
                            <span className="text-slate-500 dark:text-slate-400 group-hover:text-blue-500 text-sm font-medium transition-colors">
                                {fileName || "ارفع ملف PDF أو صورة"}
                            </span>
                            <input id="file-upload" type="file" accept="application/pdf,image/*" className="hidden" onChange={handleFileChange} disabled={isLoading} />
                        </label>
                    </div>

                    <button
                        onClick={() => onSummarize(summaryType)}
                        disabled={isLoading || (!inputText && !fileName)}
                        className="w-full sm:w-auto px-8 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:text-slate-500 dark:disabled:text-slate-500 disabled:cursor-not-allowed text-white font-bold rounded-lg shadow-lg hover:shadow-blue-500/30 transition-all flex items-center justify-center"
                    >
                        {isLoading ? (
                            <>
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin ml-2 rtl:mr-2 rtl:ml-0"></div>
                            <span>{getButtonText()}</span>
                            </>
                        ) : (
                            <>
                                <span>لخص النص</span>
                                <SummarizeIcon className="w-5 h-5 mr-2 rtl:ml-2 rtl:mr-0" />
                            </>
                        )}
                    </button>
                </div>
            </div>
            
            <div className="text-xs text-slate-400 text-center px-2">
                يدعم اللغة العربية والإنجليزية • ملفات PDF والصور
            </div>
        </div>
    );
};
