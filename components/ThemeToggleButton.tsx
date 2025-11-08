import { Sun, Moon } from 'lucide-react';
import { useEffect, useState } from 'react';

export function ThemeToggleButton({ className = '' }: { className?: string }) {
    const [theme, setTheme] = useState<'light' | 'dark'>('light');

    useEffect(() => {
        const saved = localStorage.getItem('theme') as 'light' | 'dark' | null;
        const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        setTheme(saved ?? (systemPrefersDark ? 'dark' : 'light'));
    }, []);

    useEffect(() => {
        // Use View Transitions API for smooth, performant theme switching
        const updateTheme = () => {
            document.documentElement.classList.toggle('dark', theme === 'dark');
            localStorage.setItem('theme', theme);
        };

        if ('startViewTransition' in document) {
            (document as any).startViewTransition(updateTheme);
        } else {
            // Instant switch for browsers without View Transitions API support
            updateTheme();
        }
    }, [theme]);

    return (
        <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-100 transition-all ${className}`}
        >
            {theme === 'dark' ? (
                <>
                    <Sun className="h-4 w-4" />
                    <span className="text-sm font-medium">Light Mode</span>
                </>
            ) : (
                <>
                    <Moon className="h-4 w-4" />
                    <span className="text-sm font-medium">Dark Mode</span>
                </>
            )}
        </button>
    );
}
