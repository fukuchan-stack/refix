import React from 'react';
import { UserProvider } from '@auth0/nextjs-auth0/client';
import { AppProps } from 'next/app';
import '../styles/globals.css'; // ← この行を復活させます

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <UserProvider>
      {/* Headタグとlinkタグは削除します */}
      <Component {...pageProps} />
    </UserProvider>
  );
}

export default MyApp;