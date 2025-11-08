import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { PageTransition } from "@/components/PageTransition";
import { Toaster } from 'react-hot-toast';

export const metadata: Metadata = {
  title: "Study Autopilot - AI-Powered Study Planning",
  description: "Break down assignments into achievable work sessions with smart scheduling. No more procrastination, no more all-nighters.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('theme');
                  var isDark = theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches);
                  if (isDark) {
                    document.documentElement.classList.add('dark');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="antialiased">
        <ThemeProvider>
          <PageTransition>
            {children}
          </PageTransition>
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: 'var(--background)',
                color: 'var(--foreground)',
                border: '1px solid rgba(0, 0, 0, 0.1)',
                borderRadius: '0.5rem',
                padding: '1rem',
              },
              success: {
                iconTheme: {
                  primary: '#10b981',
                  secondary: 'white',
                },
              },
              error: {
                iconTheme: {
                  primary: '#ef4444',
                  secondary: 'white',
                },
              },
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
