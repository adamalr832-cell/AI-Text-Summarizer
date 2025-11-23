
import React, { useState, useEffect } from 'react';
import { AppLogoIcon, MoonIcon, SunIcon, CoffeeIcon } from './icons';

const ThemeToggleButton: React.FC = () => {
    // Initialize state from localStorage or system preference
    const [theme, setTheme] = useState(() => {
        if (typeof window !== 'undefined') {
            const savedTheme = localStorage.getItem('theme');
            if (savedTheme === 'dark' || savedTheme === 'light') {
                return savedTheme;
            }
            if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
                return 'dark';
            }
        }
        return 'light'; // Default to light
    });

    // Effect to apply theme class to <html> and save to localStorage
    useEffect(() => {
        const root = window.document.documentElement;
        if (theme === 'dark') {
            root.classList.add('dark');
        } else {
            root.classList.remove('dark');
        }
        localStorage.setItem('theme', theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prevTheme => (prevTheme === 'dark' ? 'light' : 'dark'));
    };

    return (
        <button
            onClick={toggleTheme}
            aria-label="تبديل الوضع"
            className="p-2 rounded-full text-slate-700 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-700/50 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-slate-900"
        >
            {theme === 'dark' ? (
                <SunIcon className="w-6 h-6 text-yellow-400" aria-hidden="true" />
            ) : (
                <MoonIcon className="w-6 h-6 text-slate-800" aria-hidden="true" />
            )}
        </button>
    );
};

export const Header: React.FC = () => {
    return (
        <header className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md sticky top-0 z-50 border-b border-slate-200 dark:border-white/10 transition-colors duration-300 shadow-sm">
            <div className="container mx-auto px-4 py-3 flex items-center justify-between">
                {/* Right side: Empty for layout balance */}
                <div className="flex-1 flex justify-start">
                </div>

                {/* Center: Title and Icon */}
                <div className="flex items-center justify-center space-x-3 rtl:space-x-reverse flex-shrink-0">
                    <div className="bg-slate-900 dark:bg-blue-600 p-1.5 rounded-lg shadow-lg">
                         <AppLogoIcon className="w-6 h-6 text-white" aria-hidden="true"/>
                    </div>
                    <div className="flex flex-col items-center">
                        <h1 className="text-2xl font-black text-slate-900 dark:text-white text-center whitespace-nowrap tracking-tight leading-none">
                            AI Text Summarizer
                        </h1>
                        <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 tracking-widest uppercase">ملخص النصوص بالذكاء الاصطناعي</span>
                    </div>
                </div>

                {/* Left side: Theme Toggle */}
                <div className="flex-1 flex justify-end">
                    <ThemeToggleButton />
                </div>
            </div>
        </header>
    );
};
