import { useRouter } from 'next/router';
import { useUser } from '@auth0/nextjs-auth0/client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

// 取得するプロジェクトデータの型を定義
interface Project {
  id: number;
  name: string;
  github_url: string;
  user_id: string;
  description: string | null;
  language: string | null;
  stars: number;
}

const ProjectDetailPage = () => {
  const router = useRouter();
  const { id } = router.query;
  const { user, error: userError, isLoading: userIsLoading } = useUser();
  
  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    const fetchProjectDetails = async () => {
      try {
        setIsLoading(true);
        const res = await fetch(`http://localhost:8000/projects/${id}`);
        
        if (res.ok) {
          const data: Project = await res.json();
          setProject(data);
        } else {
          const errorData = await res.json();
          setError(errorData.detail || 'プロジェクトの取得に失敗しました。');
        }
      } catch (err) {
        setError('サーバーとの通信中にエラーが発生しました。');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProjectDetails();
  }, [id]);

  // ★変更点1: 削除処理を行う関数を追加
  const handleDelete = async () => {
    // ユーザーに最終確認を行う (誤操作防止のため非常に重要！)
    const isConfirmed = window.confirm(
      `本当にプロジェクト「${project?.name}」を削除しますか？この操作は元に戻せません。`
    );

    if (!isConfirmed) {
      return; // ユーザーがキャンセルしたら、ここで処理を中断
    }

    try {
      const res = await fetch(`http://localhost:8000/projects/${id}`, {
        method: 'DELETE', // DELETEメソッドでリクエスト
      });

      if (res.ok) {
        alert('プロジェクトを削除しました。');
        // 削除が成功したら、プロジェクト一覧ページにリダイレクト
        router.push('/');
      } else {
        const errorData = await res.json();
        alert(`削除に失敗しました: ${errorData.detail}`);
      }
    } catch (err) {
      alert('サーバーとの通信中にエラーが発生しました。');
      console.error(err);
    }
  };


  if (userIsLoading) return <div>認証情報を読み込み中...</div>;
  if (userError) return <div>{userError.message}</div>;
  if (!user) return <div>このページにアクセスするにはログインが必要です。</div>;
  
  if (isLoading) return <div>プロジェクト情報を読み込み中...</div>;
  if (error) return <div>エラー: {error}</div>;
  if (!project) return <div>プロジェクトが見つかりませんでした。</div>;
  
  return (
    <div className="container mx-auto p-8">
      <div className="flex justify-between items-center mb-4">
        <Link href="/" legacyBehavior>
          <a className="text-blue-500 hover:underline">&larr; プロジェクト一覧に戻る</a>
        </Link>
        {/* ★変更点2: 削除ボタンを設置 */}
        <button
          onClick={handleDelete}
          className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded transition-colors"
        >
          プロジェクトを削除
        </button>
      </div>

      <h1 className="text-3xl font-bold mb-4">{project.name}</h1>
      
      <div className="bg-white shadow-md rounded-lg p-6">
        {/* ... (中身の表示部分は変更なし) ... */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <h2 className="text-sm font-semibold text-gray-500">Project ID</h2>
            <p className="text-lg">{project.id}</p>
          </div>
          <div>
            <h2 className="text-sm font-semibold text-gray-500">GitHub Stars</h2>
            <p className="text-lg">{project.stars}</p>
          </div>
          <div>
            <h2 className="text-sm font-semibold text-gray-500">Main Language</h2>
            <p className="text-lg">{project.language || 'N/A'}</p>
          </div>
        </div>
        
        <div className="mt-6">
          <h2 className="text-sm font-semibold text-gray-500">GitHub URL</h2>
          <a href={project.github_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline break-all">
            {project.github_url}
          </a>
        </div>
        
        <div className="mt-6">
          <h2 className="text-sm font-semibold text-gray-500">Description</h2>
          <p className="text-gray-700 mt-1">{project.description || '説明はありません。'}</p>
        </div>
      </div>
    </div>
  );
};

export default ProjectDetailPage;