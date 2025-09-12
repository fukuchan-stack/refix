import "allotment/dist/style.css"; // ← この行を追加
import React from 'react';
import { UserProvider } from '@auth0/nextjs-auth0/client';
import { AppProps } from 'next/app';
import { ThemeProvider } from 'next-themes'; // ← インポートしました
import '../styles/globals.css';

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <UserProvider>
      {/* ↓ このThemeProviderで全体を囲みます */}
      <ThemeProvider attribute="class"> 
        <Component {...pageProps} />
      </ThemeProvider>
    </UserProvider>
  );
}

export default MyApp;