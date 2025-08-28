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
  
  // 取得したプロジェクトデータを保存するためのState
  const [project, setProject] = useState<Project | null>(null);
  // データ取得中のローディング状態を管理するためのState
  const [isLoading, setIsLoading] = useState(true);
  // エラーメッセージを保存するためのState
  const [error, setError] = useState<string | null>(null);

  // idが取得できたら、バックエンドからデータを取得する
  useEffect(() => {
    // idがURLからまだ取得できていない場合は、何もしない
    if (!id) return;

    const fetchProjectDetails = async () => {
      try {
        setIsLoading(true); // データ取得開始
        const res = await fetch(`http://localhost:8000/projects/${id}`);
        
        if (res.ok) {
          const data: Project = await res.json();
          setProject(data);
        } else {
          // 404 Not Found などのエラーレスポンスを処理
          const errorData = await res.json();
          setError(errorData.detail || 'プロジェクトの取得に失敗しました。');
        }
      } catch (err) {
        setError('サーバーとの通信中にエラーが発生しました。');
        console.error(err);
      } finally {
        setIsLoading(false); // データ取得完了（成功・失敗問わず）
      }
    };

    fetchProjectDetails();
  }, [id]); // idの値が変化した時だけ、このuseEffectを実行する

  if (userIsLoading) return <div>認証情報を読み込み中...</div>;
  if (userError) return <div>{userError.message}</div>;
  if (!user) return <div>このページにアクセスするにはログインが必要です。</div>;
  
  // データ取得中の表示
  if (isLoading) return <div>プロジェクト情報を読み込み中...</div>;
  // エラー発生時の表示
  if (error) return <div>エラー: {error}</div>;
  // プロジェクトが見つからなかった時の表示
  if (!project) return <div>プロジェクトが見つかりませんでした。</div>;
  
  // 正常にデータが取得できた場合の表示
  return (
    <div className="container mx-auto p-8">
      <Link href="/" legacyBehavior>
        <a className="text-blue-500 hover:underline mb-6 inline-block">&larr; プロジェクト一覧に戻る</a>
      </Link>
      <h1 className="text-3xl font-bold mb-4">{project.name}</h1>
      
      <div className="bg-white shadow-md rounded-lg p-6">
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