import type { Metadata, Viewport } from 'next';
import './globals.css';
import Sidebar from '@/components/Sidebar';
import SkipLink from '@/components/SkipLink';
import { Syne, DM_Sans, DM_Mono } from 'next/font/google';

const syne = Syne({ subsets: ['latin'], weight: ['400', '700', '800'], variable: '--font-syne' });
const dmSans = DM_Sans({ subsets: ['latin'], weight: ['400', '500'], style: ['normal', 'italic'], variable: '--font-dm-sans' });
const dmMono = DM_Mono({ subsets: ['latin'], weight: ['400', '500'], variable: '--font-dm-mono' });

export const metadata: Metadata = {
  title: 'ConcursoFlow — Gerencie seus estudos',
  description: 'Plataforma de gestão de estudos para concursos públicos com ciclos, cronômetro e analytics.',
  applicationName: 'ConcursoFlow',
  keywords: ['concurso', 'estudos', 'ciclo', 'cronômetro', 'PWA'],
  manifest: '/manifest.json',
  icons: {
    icon: '/icon.svg',
    apple: '/icon.svg',
  },
};

export const viewport: Viewport = {
  themeColor: '#08090E',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${syne.variable} ${dmSans.variable} ${dmMono.variable}`}>
      <body className="app-bg bg-dots">
        <div className="grain-overlay" />
        <SkipLink />
        <div className="app-layout">
          <Sidebar />
          <main className="main-content" id="main" role="main">
            {children}
          </main>
        </div>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').then(
                    function(registration) {
                      console.log('ServiceWorker registration successful with scope: ', registration.scope);
                    },
                    function(err) {
                      console.log('ServiceWorker registration failed: ', err);
                    }
                  );
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
