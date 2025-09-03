import React from 'react';
import { UserProvider } from '@auth0/nextjs-auth0/client';
import { AppProps } from 'next/app';
import { ThemeProvider } from 'next-themes'; // ★ インポート
import '../styles/globals.css';

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <UserProvider>
      {/* ★ ThemeProviderで全体を囲む */}
      <ThemeProvider attribute="class">
        <Component {...pageProps} />
      </ThemeProvider>
    </UserProvider>
  );
}

export default MyApp;