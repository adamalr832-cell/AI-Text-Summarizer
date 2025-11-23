
import React, { useState, useCallback } from 'react';
import { Header } from './components/Header';
import { InputSection } from './components/InputSection';
import { OutputSection } from './components/OutputSection';
import { LiveSessionOverlay } from './components/LiveSessionOverlay';
import { 
    summarizeText, 
    translateText, 
    generateFlashcards, 
    extractTextFromImage, 
    generatePronunciationGuide,
    generateKeyInsights,
    askQuestionAboutText
} from './services/geminiService';
import { extractTextFromPdf } from './services/pdfService';
import type { SummaryType, FlashcardData, PronunciationData, ChatMessage } from './types';
import { View } from './types';

export type LoadingState = 'idle' | 'summarizing' | 'translating' | 'flashcards' | 'extracting' | 'pronunciation' | 'insights' | 'chatting';

const App: React.FC = () => {
    const [inputText, setInputText] = useState<string>('');
    const [summary, setSummary] = useState<string>('');
    const [flashcards, setFlashcards] = useState<FlashcardData[]>([]);
    const [pronunciationList, setPronunciationList] = useState<PronunciationData[]>([]);
    const [insights, setInsights] = useState<string[]>([]);
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
    
    const [loadingState, setLoadingState] = useState<LoadingState>('idle');
    const [error, setError] = useState<string | null>(null);
    const [activeView, setActiveView] = useState<View>(View.SUMMARY);
    const [summaryType, setSummaryType] = useState<SummaryType>('medium');
    const [fileName, setFileName] = useState<string | null>(null);
    const [isLiveMode, setIsLiveMode] = useState(false);

    const handleClear = useCallback(() => {
        setInputText('');
        setSummary('');
        setFlashcards([]);
        setPronunciationList([]);
        setInsights([]);
        setChatMessages([]);
        setError(null);
        setFileName(null);
        setActiveView(View.SUMMARY);
    }, []);

    const handleFileUpload = useCallback(async (file: File) => {
        setInputText('');
        setSummary('');
        setFlashcards([]);
        setPronunciationList([]);
        setInsights([]);
        setChatMessages([]);
        setError(null);
        setFileName(file.name);
        setActiveView(View.SUMMARY);
        setLoadingState('extracting');
        
        try {
            let text;
            if (file.type === 'application/pdf') {
                text = await extractTextFromPdf(file);
            } else if (file.type.startsWith('image/')) {
                text = await extractTextFromImage(file);
            } else {
                throw new Error('Unsupported file type.');
            }
            setInputText(text);
        } catch (err) {
            console.error("Error processing file:", err);
            setError("فشل في قراءة الملف. يرجى التأكد من أن الملف صالح (PDF أو صورة) وأنه يحتوي على نص واضح.");
            setFileName(null);
        } finally {
            setLoadingState('idle');
        }
    }, []);

    const handleSummarize = useCallback(async (type: SummaryType) => {
        setError(null);
        if (!inputText.trim()) {
            setError('الرجاء إدخال نص أو رفع ملف أولاً.');
            return;
        }
        setLoadingState('summarizing');
        setSummary('');
        setFlashcards([]);
        setPronunciationList([]);
        setInsights([]);
        setChatMessages([]);
        setActiveView(View.SUMMARY);
        
        try {
            const result = await summarizeText(inputText, type);
            setSummary(result);
        } catch (err) {
            console.error(err);
            setError('حدث خطأ أثناء التلخيص. الرجاء المحاولة مرة أخرى.');
        } finally {
            setLoadingState('idle');
        }
    }, [inputText]);

    const handleTranslate = useCallback(async (language: string) => {
        setError(null);
        if (!summary.trim()) {
            setError('الرجاء إنشاء ملخص أولاً قبل الترجمة.');
            return;
        }
        setLoadingState('translating');
        setActiveView(View.SUMMARY);

        try {
            const translatedSummary = await translateText(summary, language);
            setSummary(translatedSummary);
            setFlashcards([]); 
            setPronunciationList([]);
            setInsights([]);
        } catch (err) {
            console.error(err);
            setError('حدث خطأ أثناء الترجمة. الرجاء المحاولة مرة أخرى.');
        } finally {
            setLoadingState('idle');
        }
    }, [summary]);
    
    const handleGenerateFlashcards = useCallback(async () => {
        setError(null);
        if (!summary.trim()) {
            setError('الرجاء إنشاء ملخص أولاً لإنشاء بطاقات المراجعة.');
            return;
        }
        setLoadingState('flashcards');

        try {
            const cards = await generateFlashcards(summary);
            if (cards && cards.length > 0) {
                setFlashcards(cards);
                setActiveView(View.FLASHCARDS);
            } else {
                setError('لم يتمكن الذكاء الاصطناعي من إنشاء بطاقات مراجعة من هذا الملخص.');
                setActiveView(View.SUMMARY);
            }
        } catch (err) {
            console.error(err);
            setError('حدث خطأ أثناء إنشاء البطاقات.');
            setActiveView(View.SUMMARY);
        } finally {
            setLoadingState('idle');
        }
    }, [summary]);

    const handleGeneratePronunciation = useCallback(async () => {
        setError(null);
        if (!summary.trim()) {
             setError('الرجاء إنشاء ملخص أولاً لإنشاء دليل النطق.');
             return;
        }
        setLoadingState('pronunciation');

        try {
            const guides = await generatePronunciationGuide(summary);
            if (guides && guides.length > 0) {
                setPronunciationList(guides);
                setActiveView(View.PRONUNCIATION);
            } else {
                 setError('لم يتم العثور على كلمات معقدة لإنشاء دليل النطق.');
            }
        } catch (err) {
            console.error(err);
             setError('حدث خطأ أثناء إنشاء دليل النطق.');
        } finally {
            setLoadingState('idle');
        }
    }, [summary]);

    const handleGenerateInsights = useCallback(async () => {
        setError(null);
        if (!summary.trim()) {
            setError('الرجاء إنشاء ملخص أولاً.');
            return;
        }
        setLoadingState('insights');
        
        try {
            // Use original text for better insights if available, else summary
            const source = inputText.trim() || summary;
            const results = await generateKeyInsights(source);
            if (results && results.length > 0) {
                setInsights(results);
                setActiveView(View.INSIGHTS);
            } else {
                setError('لم يتم العثور على رؤى رئيسية.');
            }
        } catch (err) {
            console.error(err);
            setError('فشل في استخراج الرؤى الرئيسية.');
        } finally {
            setLoadingState('idle');
        }
    }, [summary, inputText]);

    const handleChatSubmit = useCallback(async (message: string) => {
        setChatMessages(prev => [...prev, { role: 'user', content: message }]);
        setLoadingState('chatting');

        try {
            // Use original text for Q&A context
            const source = inputText.trim() || summary;
            const answer = await askQuestionAboutText(source, message);
            setChatMessages(prev => [...prev, { role: 'ai', content: answer }]);
        } catch (err) {
            console.error(err);
            setChatMessages(prev => [...prev, { role: 'ai', content: 'عذراً، حدث خطأ أثناء محاولة الإجابة.' }]);
        } finally {
            setLoadingState('idle');
        }
    }, [inputText, summary]);

    const handleToggleLiveMode = useCallback(() => {
        setIsLiveMode(prev => !prev);
    }, []);

    return (
        <div className="bg-transparent min-h-screen text-gray-300 dark:text-gray-300 transition-colors duration-300 relative">
            <Header />
            <main className="container mx-auto px-4 py-12">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <InputSection 
                        inputText={inputText}
                        setInputText={setInputText}
                        onSummarize={handleSummarize}
                        loadingState={loadingState}
                        summaryType={summaryType}
                        setSummaryType={setSummaryType}
                        onFileChange={handleFileUpload}
                        fileName={fileName}
                        onClear={handleClear}
                        onStartLive={handleToggleLiveMode}
                    />
                    <OutputSection
                        summary={summary}
                        flashcards={flashcards}
                        pronunciationList={pronunciationList}
                        insights={insights}
                        chatMessages={chatMessages}
                        loadingState={loadingState}
                        error={error}
                        activeView={activeView}
                        onTranslate={handleTranslate}
                        onGenerateFlashcards={handleGenerateFlashcards}
                        onGeneratePronunciation={handleGeneratePronunciation}
                        onGenerateInsights={handleGenerateInsights}
                        onChatSubmit={handleChatSubmit}
                        setActiveView={setActiveView}
                    />
                </div>
            </main>
            {isLiveMode && (
                <LiveSessionOverlay 
                    onClose={() => setIsLiveMode(false)} 
                    initialContext={inputText || summary || undefined}
                />
            )}
        </div>
    );
};

export default App;
