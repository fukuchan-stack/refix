import { useTheme } from 'next-themes';
import { useState, useEffect } from 'react';

export const ThemeSwitcher = () => {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();

  // このコンポーネントがブラウザ側で読み込まれてからUIを表示することで、
  // サーバーとクライアントの表示の不整合を防ぎます。
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <div>
      <select 
        value={theme} 
        onChange={e => setTheme(e.target.value)}
        aria-label="テーマを切り替える"
        className="p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
        <option value="system">System</option>
        <option value="dark">Dark</option>
        <option value="light">Light</option>
      </select>
    </div>
  );
};