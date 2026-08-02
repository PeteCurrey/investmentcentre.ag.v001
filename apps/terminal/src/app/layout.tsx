import React from 'react';
import './globals.css';

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
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
