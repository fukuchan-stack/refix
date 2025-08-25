import { useState, useEffect } from 'react';

export default function Home() {
  // バックエンドからのメッセージを保存するための状態
  const [message, setMessage] = useState('Loading...');

  // このページが読み込まれた時に一度だけ実行される処理
  useEffect(() => {
    // バックエンドAPI (http://localhost:8000) にリクエストを送る
    fetch('http://localhost:8000')
      .then(response => response.json())
      .then(data => {
        // 受け取ったメッセージを状態にセットする
        setMessage(data.message);
      })
      .catch(error => {
        console.error('Error fetching data:', error);
        setMessage('Failed to load message from backend.');
      });
  }, []); // 空の配列は「最初の一回だけ実行」を意味します

  return (
    <main style={{ fontFamily: 'sans-serif', textAlign: 'center', marginTop: '50px' }}>
      <h1>Welcome to Refix!</h1>
      <p>Message from Backend:</p>
      <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#0070f3' }}>
        {message}
      </p>
    </main>
  );
}