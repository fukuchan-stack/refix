import { useState, useEffect } from 'react';

// ユーザー情報の型を定義しておきます
interface AppUser {
  name?: string;
  picture?: string;
  [key: string]: any;
}

export default function Home() {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<AppUser | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchUser() {
      try {
        const res = await fetch('/api/auth/me');

        // 応答が204 No Content（未ログイン）の場合を正しく処理する
        if (res.status === 204) {
          setUser(null);
        } else if (res.ok) {
          const data = await res.json();
          setUser(data);
        } else {
          // その他のエラーケース
          console.error('Failed to fetch user:', res.statusText);
          setError(new Error('Failed to fetch user data.'));
          setUser(null);
        }
      } catch (e: any) {
        setError(e);
      } finally {
        setIsLoading(false);
      }
    }
    fetchUser();
  }, []);

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <header style={{ display: 'flex', justifyContent: 'space-between', padding: '20px', alignItems: 'center', borderBottom: '1px solid #eaeaea' }}>
        <h1>Refix</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          {!user && (
            <a href="/api/auth/login" style={{ color: 'blue', textDecoration: 'underline', fontSize: '16px' }}>Login</a>
          )}
          {user && (
            <>
              <img src={user.picture ?? ''} alt={user.name ?? 'user'} width={40} height={40} style={{ borderRadius: '50%' }} />
              <span>Welcome, {user.name}!</span>
              <a href="/api/auth/logout" style={{ color: 'blue', textDecoration: 'underline', fontSize: '16px' }}>Logout</a>
            </>
          )}
        </div>
      </header>
      <main style={{ fontFamily: 'sans-serif', textAlign: 'center', marginTop: '50px' }}>
        <h1>Welcome to Refix!</h1>
        {user ? (
          <div>
            <h2>You are logged in!</h2>
            <p>Now you can use Refix features.</p>
          </div>
        ) : (
          <div>
            <h2>Please log in</h2>
            <p>Please log in to start reviewing your code.</p>
          </div>
        )}
      </main>
    </div>
  );
}