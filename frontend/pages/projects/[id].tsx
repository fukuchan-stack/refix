import { useRouter } from 'next/router';
import { useUser } from '@auth0/nextjs-auth0/client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChatView } from '../../components/ChatView';
import Head from 'next/head';

// 型定義
interface ChatMessage { 
  id: number; 
  role: 'user' | 'assistant'; 
  content: string; 
  created_at: string; 
}
interface Review { 
  id: number; 
  code_snippet: string; 
  review_content: string; 
  created_at: string; 
  chat_messages: ChatMessage[]; 
  language?: string; 
  project_id?: number; // 履歴ページへのリンク用に追加
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
  const { user } = useUser();
  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // チャットとレビュー生成の状態管理
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isGeneratingReview, setIsGeneratingReview] = useState(false);
  const apiKey = process.env.NEXT_PUBLIC_INTERNAL_API_KEY;

  useEffect(() => {
    if (!id) return;
    const fetchProjectDetails = async () => {
      try {
        setIsLoading(true);
        const res = await fetch(`/api/projects/${id}`, { headers: { 'X-API-Key': apiKey || '' } });
        if (res.ok) {
          const data: Project = await res.json();
          setProject(data);
          // 履歴を古い順（時系列）で表示するために配列を反転させる
          setReviews(data.reviews.reverse());
        } else {
          setError('プロジェクトの取得に失敗しました。');
        }
      } catch (err) {
        setError('サーバーとの通信エラーです。');
      } finally {
        setIsLoading(false);
      }
    };
    fetchProjectDetails();
  }, [id, apiKey]);

  // 新しいレビューを生成するロジック
  const handleGenerateReview = async (code: string, language: string, mode: string) => {
    if (!project) return;
    setIsGeneratingReview(true);
    try {
      const res = await fetch(`/api/projects/${project.id}/generate-review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey || '' },
        body: JSON.stringify({ code, language, mode }),
      });
      if (res.ok) {
        const newReview: Review = await res.json();
        setReviews(prevReviews => [...prevReviews, newReview]);
      } else {
        const errorData = await res.json();
        alert(`レビューの生成に失敗しました: ${errorData.detail || '不明なエラー'}`);
      }
    } catch (err) {
      alert('レビューの生成中に通信エラーが発生しました。');
    } finally {
      setIsGeneratingReview(false);
    }
  };

  if (isLoading) return <div className="text-center p-10">読み込み中...</div>;
  if (error) return <div className="text-center p-10 text-red-500">{error}</div>;
  if (!project) return <div className="text-center p-10">プロジェクトが見つかりません。</div>;

  return (
    <>
      <Head>
          <title>{project.name} - Refix AI Chat</title>
      </Head>
      <main className="container mx-auto p-4 md:p-8">
        <div className="flex justify-between items-center mb-4">
          <div>
            <Link href="/" legacyBehavior><a className="text-sm text-indigo-600 hover:underline">&larr; プロジェクト一覧に戻る</a></Link>
            <h1 className="text-3xl font-bold">{project.name}</h1>
          </div>
          <Link href={`/projects/${id}/history`} legacyBehavior>
              <a className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded transition-colors">
                  全レビュー履歴を見る
              </a>
          </Link>
        </div>
        
        {/* チャットUIコンポーネント */}
        <ChatView
          reviews={reviews}
          onGenerateReview={handleGenerateReview}
          isGeneratingReview={isGeneratingReview}
          projectId={project.id}
        />
      </main>
    </>
  );
};

export default ProjectDetailPage;