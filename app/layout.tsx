import type { Metadata, Viewport } from 'next';
import Link from 'next/link';
import { SettingsProvider } from '@/components/settings/SettingsProvider';
import './globals.css';

export const metadata: Metadata = {
  title: 'Christian — Read the Bible',
  description:
    'Read the World English Bible as a book on a desk, in a quiet study.',
};

export const viewport: Viewport = {
  themeColor: '#140e0b',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SettingsProvider>
          <div className="app-shell">
            <header className="app-header">
              <div>
                <h1>Christian</h1>
                <p className="promise">Read the Bible, one page at a time.</p>
              </div>
              <nav aria-label="Main">
                <Link href="/">Bible</Link>
                <Link href="/settings">Settings</Link>
              </nav>
            </header>
            {children}
          </div>
        </SettingsProvider>
      </body>
    </html>
  );
}
