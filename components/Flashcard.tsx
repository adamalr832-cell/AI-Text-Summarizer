import React, { useState } from 'react';
import { FlipIcon, CopyIcon, CheckIcon } from './icons';

interface FlashcardProps {
    question: string;
    answer: string;
}

export const Flashcard: React.FC<FlashcardProps> = ({ question, answer }) => {
    const [isFlipped, setIsFlipped] = useState(false);
    const [isCopied, setIsCopied] = useState(false);

    const handleCopy = (e: React.MouseEvent) => {
        e.stopPropagation(); // Prevents the card from flipping when the copy button is clicked
        navigator.clipboard.writeText(`سؤال: ${question}\nإجابة: ${answer}`);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    };

    return (
        <div className="perspective w-full h-48 group">
             <button
                onClick={handleCopy}
                aria-label="نسخ السؤال والإجابة"
                className="absolute top-2 right-2 rtl:left-2 rtl:right-auto z-20 p-2 rounded-full bg-slate-100 dark:bg-slate-900/50 backdrop-blur-sm text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-900/80 scale-90 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-all duration-200 shadow-sm"
            >
                {isCopied ? <CheckIcon className="w-4 h-4 text-green-500" /> : <CopyIcon className="w-4 h-4" />}
            </button>

            <button
                onClick={() => setIsFlipped(!isFlipped)}
                className={`relative w-full h-full transform-style-preserve-3d transition-transform duration-500 text-right rtl:text-right p-0 bg-transparent border-none rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-slate-900 ${isFlipped ? 'rotate-y-180' : ''}`}
                aria-pressed={isFlipped}
                aria-label={isFlipped ? `إظهار السؤال: ${question}` : `إظهار الإجابة للسؤال: ${question}`}
            >
                {/* Front of card */}
                <div className="absolute w-full h-full backface-hidden flex flex-col justify-between p-5 rounded-xl shadow-md bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-blue-200 dark:border-blue-500/50">
                    <div>
                        <p className="font-bold text-sm mb-2 text-blue-600 dark:text-blue-400">سؤال:</p>
                        <p className="text-lg leading-snug">{question}</p>
                    </div>
                    <div className="flex justify-end items-center text-xs opacity-60 text-slate-500 dark:text-slate-400" aria-hidden="true">
                        <FlipIcon className="w-4 h-4 mr-1 rtl:ml-1"/>
                        <span>اضغط للقلب</span>
                    </div>
                </div>
                {/* Back of card */}
                <div className="absolute w-full h-full backface-hidden rotate-y-180 flex flex-col justify-between p-5 rounded-xl shadow-md bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-teal-200 dark:border-teal-500/50">
                    <div>
                        <p className="font-bold text-sm mb-2 text-teal-600 dark:text-teal-400">إجابة:</p>
                        <p className="text-lg leading-snug">{answer}</p>
                    </div>
                    <div className="flex justify-end items-center text-xs opacity-60 text-slate-500 dark:text-slate-400" aria-hidden="true">
                        <FlipIcon className="w-4 h-4 mr-1 rtl:ml-1"/>
                        <span>اضغط للقلب</span>
                    </div>
                </div>
            </button>
        </div>
    );
};