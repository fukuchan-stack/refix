// frontend/src/pages/index.tsx

import { useUser } from '@auth0/nextjs-auth0/client';
import { useEffect, useState, FormEvent } from 'react';

// --- (今回追加) APIから受け取るItemの型を定義 ---
interface Item {
  id: number;
  name: string;
  description: string | null;
}

export default function Home() {
  const { user, error, isLoading } = useUser();
  const [userData, setUserData] = useState(null);

  // --- (今回追加) アイテム一覧を管理するためのstate ---
  const [items, setItems] = useState<Item[]>([]);

  // --- (今回追加) バックエンドからアイテム一覧を取得する関数 ---
  const fetchItems = async () => {
    try {
      const res = await fetch('http://localhost:8000/items/');
      if (res.ok) {
        const data: Item[] = await res.json();
        setItems(data); // 取得したデータでstateを更新
      }
    } catch (err) {
      console.error("Failed to fetch items:", err);
    }
  };

  // --- 既存のuseEffectを更新して、ページ読み込み時にもアイテムを取得 ---
  useEffect(() => {
    const fetchUserData = async () => {
      // ... (ユーザーデータ取得のロジックは変更なし)
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          setUserData(data);
          // ユーザーがログインしていたら、アイテム一覧も取得する
          fetchItems(); 
        } else {
          setUserData(null);
        }
      } catch (err) {
        setUserData(null);
      }
    };

    if (user) {
      fetchUserData();
    } else {
      setUserData(null);
    }
  }, [user]);


  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const apiUrl = 'http://localhost:8000/items/';
    const itemData = { name, description };

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(itemData),
      });

      if (!response.ok) throw new Error(`Error: ${response.status}`);

      const createdItem = await response.json();
      console.log('Success:', createdItem);
      alert(`アイテム「${createdItem.name}」が作成されました！ (ID: ${createdItem.id})`);
      setName('');
      setDescription('');
      
      // --- (今回追加) アイテム作成後、一覧を再取得して画面を更新 ---
      fetchItems();

    } catch (error) {
      console.error('Failed to create item:', error);
      alert('アイテムの作成に失敗しました。');
    }
  };

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>{error.message}</div>;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-2">
      <main className="flex flex-col items-center justify-center w-full flex-1 px-20 text-center">
        <h1 className="text-6xl font-bold">Welcome to Refix</h1>

        {userData ? (
          <div>
            <h2>Welcome {user?.name}</h2>
            <a href="/api/auth/logout">Logout</a>
          </div>
        ) : (
          <a href="/api/auth/login">Login</a>
        )}

        {user && (
          <div className="mt-10 p-6 border rounded-lg w-full max-w-4xl flex gap-10">
            {/* 左側: アイテム作成フォーム */}
            <div className="w-1/3">
              <h2 className="text-2xl font-bold mb-4">Create New Item</h2>
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div>
                  <label htmlFor="name" className="block text-left font-medium">Name</label>
                  <input
                    type="text"
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="mt-1 p-2 w-full border rounded-md"
                  />
                </div>
                <div>
                  <label htmlFor="description" className="block text-left font-medium">Description</label>
                  <input
                    type="text"
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="mt-1 p-2 w-full border rounded-md"
                  />
                </div>
                <button type="submit" className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
                  送信
                </button>
              </form>
            </div>
            
            {/* --- (今回追加) 右側: アイテム一覧表示 --- */}
            <div className="w-2/3 border-l pl-10">
                <h2 className="text-2xl font-bold mb-4">Item List</h2>
                <div className="flex flex-col gap-3 text-left">
                    {items.length > 0 ? (
                        items.map(item => (
                            <div key={item.id} className="p-3 border rounded-md bg-gray-50">
                                <h3 className="font-bold text-lg">{item.name} (ID: {item.id})</h3>
                                <p className="text-gray-600">{item.description}</p>
                            </div>
                        ))
                    ) : (
                        <p>No items found. Create one!</p>
                    )}
                </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}