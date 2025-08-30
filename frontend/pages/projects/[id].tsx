import { useRouter } from 'next/router';
import { useUser } from '@auth0/nextjs-auth0/client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ReviewDashboard } from '../../components/ReviewDashboard';

// 型定義を更新
interface ChatMessage {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}
interface Review {
  id: number;
  review_content: string;
  created_at: string;
  chat_messages: ChatMessage[];
}
interface Project {
  id: number;
  name: string;
  github_url: string;
  user_id: string;
  description: string | null;
  language: string | null;
  stars: number;
  reviews: Review[];
}

const ProjectDetailPage = () => {
  const router = useRouter();
  const { id } = router.query;
  const { user, error: userError, isLoading: userIsLoading } = useUser();
  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isGeneratingReview, setIsGeneratingReview] = useState(false);

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

  const handleDelete = async () => {
    const isConfirmed = window.confirm(`本当にプロジェクト「${project?.name}」を削除しますか？この操作は元に戻せません。`);
    if (!isConfirmed) return;
    try {
      const res = await fetch(`http://localhost:8000/projects/${id}`, { method: 'DELETE' });
      if (res.ok) {
        alert('プロジェクトを削除しました。');
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

  const handleGenerateReview = async () => {
     setIsGeneratingReview(true);
    try {
      const res = await fetch(`http://localhost:8000/projects/${id}/generate-review`, {
        method: 'POST',
      });

      if (res.ok) {
        const newReview: Review = await res.json();
        setProject(currentProject => {
          if (!currentProject) return null;
          return {
            ...currentProject,
            reviews: [...currentProject.reviews, newReview],
          };
        });
        alert('新しいAIレビューが生成されました！');
      } else {
        const errorData = await res.json();
        alert(`レビューの生成に失敗しました: ${errorData.detail}`);
      }
    } catch (err) {
        alert('AIレビューの生成中に通信エラーが発生しました。');
        console.error(err);
    } finally {
      setIsGeneratingReview(false);
    }
  };

  if (userIsLoading || isLoading) return <div>読み込み中...</div>;
  if (userError) return <div>{userError.message}</div>;
  if (error) return <div>エラー: {error}</div>;
  if (!user || !project) return <div>プロジェクトが見つかりませんでした。</div>;
  
  return (
    <div className="container mx-auto p-8">
      <div className="flex justify-between items-center mb-4">
        <Link href="/" legacyBehavior><a className="text-blue-500 hover:underline">&larr; プロジェクト一覧に戻る</a></Link>
        <button onClick={handleDelete} className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded transition-colors">プロジェクトを削除</button>
      </div>

      <h1 className="text-3xl font-bold mb-4">{project.name}</h1>
      
      {/* AIレビューセクション */}
      <div className="mt-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">AI Review History</h2>
          <button onClick={handleGenerateReview} disabled={isGeneratingReview} className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded transition-colors disabled:bg-gray-400">
            {isGeneratingReview ? 'レビューを生成中...' : '新しいAIレビューを依頼する'}
          </button>
        </div>
        <div className="space-y-6">
          {project.reviews && project.reviews.length > 0 ? (
            [...project.reviews].reverse().map(review => (
              <div key={review.id} className="bg-white shadow-lg rounded-lg p-6 border-l-4 border-gray-300">
                <p className="text-sm text-gray-500 mb-4">
                  Review generated on: {new Date(review.created_at).toLocaleString('ja-JP')}
                </p>
                {/* ReviewDashboardにreviewオブジェクト全体を渡す */}
                <ReviewDashboard review={review} />
              </div>
            ))
          ) : (
            <div className="bg-white shadow-md rounded-lg p-6 text-center text-gray-500">
              <p>まだレビューはありません。</p>
              <p>ボタンを押して、最初のAIレビューを生成しましょう！</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProjectDetailPage;