import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'VTT — Talekeeper',
  description: 'Play storygames and TTRPGs with friends online.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col bg-zinc-900 text-zinc-100 antialiased">
        {children}
      </body>
    </html>
  );
}
