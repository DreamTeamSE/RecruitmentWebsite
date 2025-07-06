import type { Metadata } from 'next';
import { Geist, Geist_Mono, Source_Serif_4 } from 'next/font/google';
import { Toaster } from 'react-hot-toast';
import './globals.css';
import Navbar from '../components/ui/sections/navbar';
import Footer from '@/components/ui/sections/footer';
import Providers from '@/components/providers/Providers';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  weight: ["300", "400", "700"],
  variable: "--font-serif",
  display: "swap",
});

export const metadata: Metadata = {
  title: 'DTE Recruitment Platform',
  description: 'Dream Team Engineering recruitment and application platform',
  keywords: ['recruitment', 'engineering', 'applications', 'DTE'],
  authors: [{ name: 'Dream Team Engineering' }],
  viewport: 'width=device-width, initial-scale=1',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${sourceSerif.variable} antialiased`}
      >
        <ErrorBoundary>
          <Providers>
            <Navbar />
            {children}
            <Footer />
            <Toaster />
          </Providers>
        </ErrorBoundary>
      </body>
    </html>
  );
}
