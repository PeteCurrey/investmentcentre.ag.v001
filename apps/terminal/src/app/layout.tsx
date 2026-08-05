import React from 'react';
import { DM_Mono } from 'next/font/google';
import './globals.css';

const dmMono = DM_Mono({
  weight: ['300', '400', '500'],
  style: ['normal', 'italic'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-dm-mono',
});

export const metadata = {
  title: 'MERIDIAN — Master Intelligence Console',
  description: 'Private Institutional Investment Intelligence & Execution Terminal'
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={dmMono.variable}>
      <body className={dmMono.className}>
        {children}
      </body>
    </html>
  );
}
