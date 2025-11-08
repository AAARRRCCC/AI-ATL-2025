import type { Metadata } from "next";
import "./globals.css";

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
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
