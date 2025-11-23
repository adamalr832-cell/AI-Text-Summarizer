
import React, { useState, useRef, useEffect } from 'react';
import { Flashcard } from './Flashcard';
import { LoadingSpinner } from './LoadingSpinner';
import { ChatInterface } from './ChatInterface';
import type { FlashcardData, PronunciationData, ChatMessage } from '../types';
import { View } from '../types';
import { LANGUAGES } from '../constants';
import { downloadFile, convertFlashcardsToCSV, exportToPdf } from '../utils/exportUtils';
import { TranslateIcon, SparklesIcon, CopyIcon, CheckIcon, DownloadIcon, AppLogoIcon, SummarizeIcon, SpeakerIcon, PlayIcon, StopIcon, VolumeIcon, VolumeXIcon, LightbulbIcon, ChatBubbleIcon, PdfIcon, ZoomInIcon, ZoomOutIcon, GraduationCapIcon } from './icons';
import type { LoadingState } from '../App';
import { generateSpeech } from '../services/geminiService';
import { PCMAudioPlayer } from '../utils/audioUtils';

interface OutputSectionProps {
    summary: string;
    flashcards: FlashcardData[];
    pronunciationList: PronunciationData[];
    insights: string[];
    chatMessages: ChatMessage[];
    loadingState: LoadingState;
    error: string | null;
    activeView: View;
    onTranslate: (language: string) => void;
    onGenerateFlashcards: () => void;
    onGeneratePronunciation: () => void;
    onGenerateInsights: () => void;
    onChatSubmit: (message: string) => void;
    setActiveView: (view: View) => void;
}

const WelcomePlaceholder: React.FC = () => (
    <div className="text-center text-slate-500 animate-fade-in py-10">
        <div className="bg-slate-100 dark:bg-slate-800/50 p-6 rounded-full inline-block mb-6 border-2 border-slate-200 dark:border-slate-700">
            <AppLogoIcon className="w-16 h-16 text-slate-700 dark:text-blue-500" />
        </div>
        <h3 className="text-3xl font-black text-slate-900 dark:text-slate-100 mb-3">مرحباً بك في الملخص</h3>
        <p className="mb-10 text-slate-600 dark:text-slate-400 max-w-md mx-auto font-medium leading-relaxed">
            منصتك الذكية لتلخيص النصوص، استخراج الأفكار، والمحادثة مع المحتوى باستخدام أقوى تقنيات الذكاء الاصطناعي.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-sm max-w-3xl mx-auto">
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-md border border-slate-200 dark:border-slate-700 hover:-translate-y-1 transition-transform duration-300">
                <SummarizeIcon className="w-10 h-10 mx-auto mb-4 text-blue-600 bg-blue-50 dark:bg-blue-900/20 p-2 rounded-xl"/>
                <h4 className="font-bold text-lg mb-2 text-slate-900 dark:text-white">تلخيص دقيق</h4>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">احصل على زبدة الموضوع في ثوانٍ مع خيارات متعددة.</p>
            </div>
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-md border border-slate-200 dark:border-slate-700 hover:-translate-y-1 transition-transform duration-300">
                <ChatBubbleIcon className="w-10 h-10 mx-auto mb-4 text-purple-600 bg-purple-50 dark:bg-purple-900/20 p-2 rounded-xl"/>
                <h4 className="font-bold text-lg mb-2 text-slate-900 dark:text-white">تفاعل ذكي</h4>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">اسأل النص واستفسر عن أي تفاصيل غامضة.</p>
            </div>
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-md border border-slate-200 dark:border-slate-700 hover:-translate-y-1 transition-transform duration-300">
                <SparklesIcon className="w-10 h-10 mx-auto mb-4 text-teal-600 bg-teal-50 dark:bg-teal-900/20 p-2 rounded-xl"/>
                <h4 className="font-bold text-lg mb-2 text-slate-900 dark:text-white">أدوات مساعدة</h4>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">بطاقات مراجعة، نطق صوتي، ورؤى معمقة.</p>
            </div>
        </div>
    </div>
);


export const OutputSection: React.FC<OutputSectionProps> = ({
    summary,
    flashcards,
    pronunciationList,
    insights,
    chatMessages,
    loadingState,
    error,
    activeView,
    onTranslate,
    onGenerateFlashcards,
    onGeneratePronunciation,
    onGenerateInsights,
    onChatSubmit,
    setActiveView
}) => {
    const [selectedLanguage, setSelectedLanguage] = useState(LANGUAGES[0].code);
    const [isCopied, setIsCopied] = useState(false);
    const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
    const [fontSize, setFontSize] = useState(18); // Default font size increased
    
    // Audio State
    const [isPlaying, setIsPlaying] = useState(false);
    const [isAudioLoading, setIsAudioLoading] = useState(false);
    const [audioDuration, setAudioDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [volume, setVolume] = useState(1);
    const [isMuted, setIsMuted] = useState(false);
    const [hasAudioLoaded, setHasAudioLoaded] = useState(false);

    const audioPlayerRef = useRef<PCMAudioPlayer | null>(null);
    const animationFrameRef = useRef<number | null>(null);
    const exportMenuRef = useRef<HTMLDivElement>(null);
    const isLoading = loadingState !== 'idle' && loadingState !== 'chatting'; 

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
                setIsExportMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // Cleanup audio
    useEffect(() => {
        return () => {
            if (audioPlayerRef.current) {
                audioPlayerRef.current.close();
                audioPlayerRef.current = null;
            }
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, [summary]); 

    // Update progress bar
    useEffect(() => {
        const updateProgress = () => {
            if (audioPlayerRef.current && isPlaying) {
                setCurrentTime(audioPlayerRef.current.getCurrentTime());
                animationFrameRef.current = requestAnimationFrame(updateProgress);
            }
        };

        if (isPlaying) {
            animationFrameRef.current = requestAnimationFrame(updateProgress);
        } else if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
        }

        return () => {
            if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        };
    }, [isPlaying]);

    const handleCopy = () => {
        if (summary) {
            navigator.clipboard.writeText(summary);
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        }
    };
    
    const handleZoomIn = () => setFontSize(prev => Math.min(prev + 2, 32));
    const handleZoomOut = () => setFontSize(prev => Math.max(prev - 2, 14));

    const handleToggleAudio = async () => {
        if (!audioPlayerRef.current) {
             audioPlayerRef.current = new PCMAudioPlayer();
        }

        if (isPlaying) {
            audioPlayerRef.current.pause();
            setIsPlaying(false);
            return;
        }

        if (hasAudioLoaded && audioPlayerRef.current) {
             audioPlayerRef.current.setVolume(isMuted ? 0 : volume);
             audioPlayerRef.current.play(() => setIsPlaying(false));
             setIsPlaying(true);
             return;
        }

        if (!summary) return;

        setIsAudioLoading(true);
        try {
            const base64Audio = await generateSpeech(summary);
            const duration = await audioPlayerRef.current.load(base64Audio);
            setAudioDuration(duration);
            setHasAudioLoaded(true);
            
            audioPlayerRef.current.setVolume(isMuted ? 0 : volume);
            audioPlayerRef.current.play(() => setIsPlaying(false));
            setIsPlaying(true);
        } catch (err) {
            console.error("Failed to play audio:", err);
        } finally {
            setIsAudioLoading(false);
        }
    };

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        const time = parseFloat(e.target.value);
        setCurrentTime(time);
        if (audioPlayerRef.current) {
            audioPlayerRef.current.seek(time);
        }
    };

    const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = parseFloat(e.target.value);
        setVolume(val);
        setIsMuted(val === 0);
        if (audioPlayerRef.current) {
            audioPlayerRef.current.setVolume(val);
        }
    };

    const toggleMute = () => {
        const newMuted = !isMuted;
        setIsMuted(newMuted);
        if (audioPlayerRef.current) {
            audioPlayerRef.current.setVolume(newMuted ? 0 : volume);
        }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const handleExportSummary = () => {
        downloadFile(summary, 'summary.txt', 'text/plain');
    };

    const handleExportPdf = () => {
        exportToPdf(summary, 'summary.pdf');
    };

    const handleExportFlashcards = (format: 'json' | 'csv') => {
        if (format === 'json') {
            const jsonContent = JSON.stringify(flashcards, null, 2);
            downloadFile(jsonContent, 'flashcards.json', 'application/json');
        } else if (format === 'csv') {
            const csvContent = convertFlashcardsToCSV(flashcards);
            downloadFile(csvContent, 'flashcards.csv', 'text/csv', true);
        }
        setIsExportMenuOpen(false);
    };

    const getLoadingMessage = () => {
        switch (loadingState) {
            case 'summarizing': return 'الذكاء الاصطناعي يقوم بالتلخيص الآن...';
            case 'translating': return 'جاري ترجمة النص بدقة...';
            case 'flashcards': return 'جاري إعداد بطاقات المراجعة...';
            case 'extracting': return 'جاري تحليل واستخراج النص من الملف...';
            case 'pronunciation': return 'جاري إعداد دليل النطق...';
            case 'insights': return 'جاري استنباط الأفكار الجوهرية...';
            default: return 'جاري المعالجة...';
        }
    };

    const hasContent = summary.length > 0;

    return (
        <div className="bg-white dark:bg-slate-800/50 backdrop-blur-md p-6 rounded-xl border border-slate-200 dark:border-white/10 flex flex-col min-h-[600px] lg:min-h-[688px] shadow-xl dark:shadow-2xl transition-all duration-300">
            <div className="flex flex-col gap-4 mb-4">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <h2 className="text-2xl font-bold text-slate-950 dark:text-white">النتيجة</h2>
                        {summary && activeView === View.SUMMARY && !isLoading && (
                            <div className="flex items-center gap-1 mr-4">
                                <button
                                    onClick={handleZoomIn}
                                    className="p-2 rounded-full text-slate-600 hover:text-blue-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700/50 transition-colors"
                                    aria-label="تكبير النص"
                                    title="تكبير النص"
                                >
                                    <ZoomInIcon className="w-5 h-5" />
                                </button>
                                <button
                                    onClick={handleZoomOut}
                                    className="p-2 rounded-full text-slate-600 hover:text-blue-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700/50 transition-colors"
                                    aria-label="تصغير النص"
                                    title="تصغير النص"
                                >
                                    <ZoomOutIcon className="w-5 h-5" />
                                </button>
                                <div className="w-px h-5 bg-slate-300 dark:bg-slate-600 mx-1"></div>
                                <button
                                    onClick={handleCopy}
                                    className="p-2 rounded-full text-slate-600 hover:text-blue-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700/50 transition-colors"
                                    aria-label="نسخ الملخص"
                                >
                                    {isCopied ? <CheckIcon className="w-5 h-5 text-green-500" aria-hidden="true" /> : <CopyIcon className="w-5 h-5" aria-hidden="true" />}
                                </button>
                                <button
                                    onClick={handleExportSummary}
                                    className="p-2 rounded-full text-slate-600 hover:text-blue-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700/50 transition-colors"
                                    aria-label="تصدير كنص"
                                    title="تحميل ملف نصي"
                                >
                                    <DownloadIcon className="w-5 h-5" />
                                </button>
                                <button
                                    onClick={handleExportPdf}
                                    className="p-2 rounded-full text-slate-600 hover:text-red-600 hover:bg-red-50 dark:text-slate-400 dark:hover:bg-slate-700/50 transition-colors"
                                    aria-label="تصدير PDF"
                                    title="تحميل ملف PDF"
                                >
                                    <PdfIcon className="w-5 h-5" />
                                </button>
                            </div>
                        )}
                         {flashcards.length > 0 && activeView === View.FLASHCARDS && !isLoading && (
                            <div className="relative" ref={exportMenuRef}>
                                <button
                                    onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
                                    className="p-2 rounded-full text-slate-600 hover:text-blue-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700/50 transition-colors"
                                    aria-label="تصدير بطاقات المراجعة"
                                    aria-haspopup="true"
                                    aria-expanded={isExportMenuOpen}
                                >
                                    <DownloadIcon className="w-5 h-5" />
                                </button>
                                {isExportMenuOpen && (
                                    <div className="absolute left-0 mt-2 w-56 origin-top-left rounded-md bg-white dark:bg-slate-800 shadow-lg ring-1 ring-black ring-opacity-5 dark:ring-white/10 focus:outline-none z-10 border border-slate-200 dark:border-slate-700">
                                        <div className="py-1" role="menu" aria-orientation="vertical">
                                            <button
                                                onClick={() => handleExportFlashcards('json')}
                                                className="w-full text-start px-4 py-2 text-slate-700 dark:text-gray-200 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors flex items-center justify-between"
                                                role="menuitem"
                                            >
                                                <div className="flex flex-col">
                                                    <span className="font-medium text-sm">تصدير كـ JSON</span>
                                                    <span className="text-xs text-slate-500">للمطورين</span>
                                                </div>
                                                <DownloadIcon className="w-5 h-5 text-slate-400" aria-hidden="true" />
                                            </button>
                                            <div className="border-t border-slate-200 dark:border-slate-700 mx-1"></div>
                                            <button
                                                onClick={() => handleExportFlashcards('csv')}
                                                className="w-full text-start px-4 py-2 text-slate-700 dark:text-gray-200 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors flex items-center justify-between"
                                                role="menuitem"
                                            >
                                                <div className="flex flex-col">
                                                    <span className="font-medium text-sm">تصدير كـ CSV</span>
                                                    <span className="text-xs text-slate-500">لبرامج Excel</span>
                                                </div>
                                                <DownloadIcon className="w-5 h-5 text-slate-400" aria-hidden="true" />
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                     </div>
                </div>

                {/* Audio Player Controls */}
                {summary && activeView === View.SUMMARY && !isLoading && (
                    <div className="flex items-center gap-3 bg-slate-100 dark:bg-slate-900/40 p-3 rounded-lg border border-slate-200 dark:border-white/5 transition-all duration-300 shadow-inner">
                         <button
                            onClick={handleToggleAudio}
                            disabled={isAudioLoading}
                            className={`p-2.5 rounded-full transition-all flex-shrink-0 ${
                                isAudioLoading 
                                    ? 'text-blue-500/50 cursor-wait' 
                                    : isPlaying 
                                        ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-md ring-2 ring-blue-200 dark:ring-blue-900' 
                                        : 'bg-white text-slate-800 border border-slate-300 hover:bg-slate-200 dark:bg-slate-700 dark:text-white dark:border-transparent dark:hover:bg-slate-600'
                            }`}
                            aria-label={isPlaying ? "إيقاف القراءة" : "قراءة الملخص"}
                        >
                            {isAudioLoading ? (
                                <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                            ) : isPlaying ? (
                                <StopIcon className="w-5 h-5" aria-hidden="true" />
                            ) : (
                                <PlayIcon className="w-5 h-5 ml-0.5 rtl:mr-0.5 rtl:ml-0" aria-hidden="true" />
                            )}
                        </button>
                        
                        {/* Progress Bar */}
                        <div className="flex-grow flex items-center gap-3">
                             <span className="text-xs font-mono text-slate-600 dark:text-slate-400 w-10 text-center tabular-nums">{formatTime(currentTime)}</span>
                             <input
                                type="range"
                                min="0"
                                max={audioDuration || 100}
                                value={currentTime}
                                onChange={handleSeek}
                                disabled={!hasAudioLoaded}
                                className="w-full h-2 bg-slate-300 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600 disabled:opacity-50"
                            />
                            <span className="text-xs font-mono text-slate-600 dark:text-slate-400 w-10 text-center tabular-nums">{formatTime(audioDuration)}</span>
                        </div>

                        {/* Volume Control */}
                        <div className="hidden sm:flex items-center gap-2 group relative">
                            <button onClick={toggleMute} className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
                                {isMuted || volume === 0 ? <VolumeXIcon className="w-6 h-6"/> : <VolumeIcon className="w-6 h-6"/>}
                            </button>
                            <div className="w-0 overflow-hidden group-hover:w-24 transition-all duration-300 ease-in-out">
                                 <input 
                                    type="range" 
                                    min="0" 
                                    max="1" 
                                    step="0.1" 
                                    value={isMuted ? 0 : volume} 
                                    onChange={handleVolumeChange}
                                    className="w-24 h-2 bg-slate-300 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                />
                            </div>
                        </div>
                    </div>
                )}
            </div>
            
            {hasContent && !isLoading && (
                 <div className="border-b border-slate-200 dark:border-slate-700 mt-2 mb-6 overflow-x-auto scrollbar-none">
                    <nav className="-mb-px flex gap-6 min-w-max" aria-label="Tabs">
                        {[
                            { id: View.SUMMARY, label: 'الملخص' },
                            { id: View.INSIGHTS, label: 'أفكار رئيسية', disabled: insights.length === 0 },
                            { id: View.CHAT, label: 'محادثة' },
                            { id: View.FLASHCARDS, label: 'بطاقات مراجعة', disabled: flashcards.length === 0 },
                            { id: View.PRONUNCIATION, label: 'دليل النطق', disabled: pronunciationList.length === 0 },
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveView(tab.id)}
                                disabled={tab.disabled}
                                className={`shrink-0 border-b-2 px-2 pb-3 text-base font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                                    activeView === tab.id
                                        ? 'border-blue-600 text-blue-700 dark:text-blue-400 dark:border-blue-400'
                                        : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:border-slate-500'
                                }`}
                                aria-pressed={activeView === tab.id}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </nav>
                </div>
            )}
            
            <div className="flex-grow flex flex-col">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center h-full flex-grow min-h-[400px]" role="status">
                        <LoadingSpinner />
                        <p className="mt-6 text-lg font-medium text-slate-700 dark:text-slate-300 animate-pulse">{getLoadingMessage()}</p>
                    </div>
                ) : error ? (
                    <div role="alert" className="flex items-center justify-center h-full flex-grow text-red-700 bg-red-50 border border-red-200 dark:text-red-400 dark:bg-red-900/20 dark:border-red-900/50 p-6 rounded-xl shadow-sm">
                        <p className="font-bold text-lg">{error}</p>
                    </div>
                ) : !hasContent ? (
                    <div className="flex items-center justify-center h-full flex-grow">
                        <WelcomePlaceholder />
                    </div>
                ) : (
                    <div className="animate-fade-in h-full flex flex-col">
                        {activeView === View.SUMMARY && (
                            <>
                                <div 
                                    className="prose prose-lg max-w-none prose-slate dark:prose-invert whitespace-pre-wrap leading-loose transition-all duration-300 text-justify font-medium text-slate-950 dark:text-slate-100 mb-8"
                                    style={{ fontSize: `${fontSize}px` }}
                                >
                                    {summary}
                                </div>
                                
                                <div className="mt-auto pt-6 border-t border-slate-200 dark:border-slate-700">
                                    <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-4 uppercase tracking-wider flex items-center gap-2">
                                        <SparklesIcon className="w-4 h-4" />
                                        أدوات ذكية
                                    </h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                                        {/* Translation */}
                                        <div className="col-span-1 sm:col-span-2 lg:col-span-1 flex gap-2">
                                            <div className="relative flex-grow">
                                                <select
                                                    value={selectedLanguage}
                                                    onChange={(e) => setSelectedLanguage(e.target.value)}
                                                    className="w-full appearance-none bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 py-2 px-3 pr-8 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                >
                                                    {LANGUAGES.map((lang) => (
                                                        <option key={lang.code} value={lang.code}>{lang.name}</option>
                                                    ))}
                                                </select>
                                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-700 dark:text-slate-400">
                                                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => onTranslate(selectedLanguage)}
                                                className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg transition-colors"
                                                title="ترجمة"
                                            >
                                                <TranslateIcon className="w-5 h-5" />
                                            </button>
                                        </div>

                                        {/* Key Insights */}
                                        <button
                                            onClick={onGenerateInsights}
                                            className="flex items-center justify-center gap-2 bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 py-2 px-4 rounded-lg transition-colors text-sm font-bold"
                                        >
                                            <LightbulbIcon className="w-5 h-5" />
                                            أفكار رئيسية
                                        </button>

                                        {/* Flashcards */}
                                        <button
                                            onClick={onGenerateFlashcards}
                                            className="flex items-center justify-center gap-2 bg-teal-50 dark:bg-teal-900/20 hover:bg-teal-100 dark:hover:bg-teal-900/40 text-teal-700 dark:text-teal-400 border border-teal-200 dark:border-teal-800 py-2 px-4 rounded-lg transition-colors text-sm font-bold"
                                        >
                                            <GraduationCapIcon className="w-5 h-5" />
                                            بطاقات مراجعة
                                        </button>

                                        {/* Chat */}
                                        <button
                                            onClick={() => setActiveView(View.CHAT)}
                                            className="flex items-center justify-center gap-2 bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/40 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-800 py-2 px-4 rounded-lg transition-colors text-sm font-bold"
                                        >
                                            <ChatBubbleIcon className="w-5 h-5" />
                                            محادثة
                                        </button>
                                        
                                        {/* Pronunciation */}
                                        <button
                                            onClick={onGeneratePronunciation}
                                            className="col-span-1 sm:col-span-2 lg:col-span-4 flex items-center justify-center gap-2 bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600 py-2 px-4 rounded-lg transition-colors text-sm font-bold mt-1"
                                        >
                                            <SpeakerIcon className="w-5 h-5" />
                                            دليل النطق للكلمات الصعبة
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}
                        {activeView === View.INSIGHTS && (
                            <div className="space-y-4">
                                {insights.map((insight, idx) => (
                                    <div key={idx} className="bg-amber-50 dark:bg-slate-800/80 p-5 rounded-xl border border-amber-200 dark:border-slate-700 hover:border-amber-400 dark:hover:border-amber-700 transition-colors flex gap-4 items-start shadow-sm">
                                        <div className="bg-amber-100 dark:bg-amber-900/30 p-2 rounded-full flex-shrink-0">
                                            <LightbulbIcon className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                                        </div>
                                        <p className="text-slate-950 dark:text-slate-100 text-lg font-medium leading-relaxed">{insight}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                        {activeView === View.CHAT && (
                            <ChatInterface 
                                messages={chatMessages} 
                                onSendMessage={onChatSubmit} 
                                isLoading={loadingState === 'chatting'} 
                            />
                        )}
                        {activeView === View.FLASHCARDS && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {flashcards.map((card, index) => (
                                    <Flashcard key={index} question={card.question} answer={card.answer} />
                                ))}
                            </div>
                        )}
                        {activeView === View.PRONUNCIATION && (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                                {pronunciationList.map((item, index) => (
                                    <div key={index} className="bg-white dark:bg-slate-800/80 p-6 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-blue-500/50 transition-colors shadow-md hover:shadow-lg">
                                        <div className="flex justify-between items-start mb-3">
                                            <h3 className="font-black text-xl text-slate-950 dark:text-white">{item.word}</h3>
                                            <SpeakerIcon className="w-5 h-5 text-blue-600 opacity-70" />
                                        </div>
                                        <div className="mb-4">
                                            <p className="text-blue-700 dark:text-blue-300 font-mono text-base bg-blue-50 dark:bg-blue-900/30 inline-block px-3 py-1 rounded-lg border border-blue-100 dark:border-blue-800" dir="ltr">
                                                {item.pronunciation}
                                            </p>
                                        </div>
                                        <p className="text-base font-medium text-slate-700 dark:text-slate-300">{item.note}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
