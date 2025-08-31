import { useRouter } from 'next/router';
import { useUser } from '@auth0/nextjs-auth0/client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ReviewDashboard } from '../../components/ReviewDashboard';
import { CodeEditor } from '../../components/CodeEditor';
import hljs from 'highlight.js';

// 型定義
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
  
  const placeholderText = "// ここにレビューしてほしいコードを貼り付けてください\n";
  const [code, setCode] = useState<string>(placeholderText);
  const [language, setLanguage] = useState<string>("typescript");
  const [mode, setMode] = useState<string>('balanced');

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

  useEffect(() => {
    const handler = setTimeout(() => {
      if (code && code.trim() !== '' && code !== placeholderText) {
        const supportedLanguages = ['typescript', 'javascript', 'python', 'html', 'css'];
        const result = hljs.highlightAuto(code, supportedLanguages);
        console.log(`Language detected: ${result.language}, Confidence: ${result.relevance}`);
        
        if (result.language && supportedLanguages.includes(result.language)) {
          setLanguage(result.language);
        }
      }
    }, 500);

    return () => {
      clearTimeout(handler);
    };
  }, [code]);

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
    if (!code.trim() || code === placeholderText) {
      alert('レビューするコードを入力してください。');
      return;
    }
    setIsGeneratingReview(true);
    try {
      const res = await fetch(`http://localhost:8000/projects/${id}/generate-review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: code,
          language: language,
          mode: mode,
        }),
      });

      if (res.ok) {
        const newReview: Review = await res.json();
        setProject(currentProject => {
          if (!currentProject) return null;
          return { ...currentProject, reviews: [...currentProject.reviews, newReview] };
        });
        alert('新しいAIレビューが生成されました！');
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
  
  const handleEditorFocus = () => {
    if (code === placeholderText) {
      setCode("");
    }
  };

  if (userIsLoading || isLoading) return <div>読み込み中...</div>;
  if (userError) return <div>{userError.message}</div>;
  if (error) return <div>エラー: {error}</div>;
  if (!user || !project) return <div>プロジェクトが見つかりませんでした。</div>;
  
  return (
    <div className="container mx-auto p-4 md:p-8">
      <div className="flex justify-between items-center mb-4">
        <Link href="/" legacyBehavior><a className="text-blue-500 hover:underline">&larr; プロジェクト一覧に戻る</a></Link>
        <button onClick={handleDelete} className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded transition-colors">プロジェクトを削除</button>
      </div>

      <h1 className="text-3xl font-bold mb-6 border-b pb-2">{project.name}</h1>
      
      <div className="bg-white shadow-xl rounded-lg p-6 mb-8 border border-gray-200">
        <h2 className="text-2xl font-bold mb-4">New Review Session</h2>

        <div className='mb-4'>
          <label className="block text-sm font-medium text-gray-700 mb-2">Review Mode</label>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            <div className="flex items-center">
              <input type="radio" id="mode_balanced" name="review_mode" value="balanced" checked={mode === 'balanced'} onChange={() => setMode('balanced')} className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"/>
              <label htmlFor="mode_balanced" className="ml-2 block text-sm text-gray-900">✨ バランス (Gemini)</label>
            </div>
            <div className="flex items-center">
              <input type="radio" id="mode_fast" name="review_mode" value="fast_check" checked={mode === 'fast_check'} onChange={() => setMode('fast_check')} className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"/>
              <label htmlFor="mode_fast" className="ml-2 block text-sm text-gray-900">🚀 高速チェック (Claude)</label>
            </div>
            <div className="flex items-center">
              <input type="radio" id="mode_strict" name="review_mode" value="strict_audit" checked={mode === 'strict_audit'} onChange={() => setMode('strict_audit')} className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"/>
              <label htmlFor="mode_strict" className="ml-2 block text-sm text-gray-900">🛡️ 厳密な監査 (GPT-4o)</label>
            </div>
          </div>
        </div>

        <div className='mb-4'>
          <div className="flex items-center">
            <label htmlFor="language-select" className="block text-sm font-medium text-gray-700">Language</label>
            <span className="ml-2 text-xs text-gray-500">(コードを貼り付けると自動検出します)</span>
          </div>
          <select id="language-select" value={language} onChange={(e) => setLanguage(e.target.value)} className="mt-1 p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500">
            <option value="typescript">TypeScript</option>
            <option value="javascript">JavaScript</option>
            <option value="python">Python</option>
            <option value="html">HTML</option>
            <option value="css">CSS</option>
          </select>
        </div>
        
        <div onFocus={handleEditorFocus}>
          <CodeEditor code={code} onCodeChange={setCode} language={language} />
        </div>

        <button onClick={handleGenerateReview} disabled={isGeneratingReview} className="mt-4 w-full bg-green-500 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-lg transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed text-lg">
          {isGeneratingReview ? 'レビューを生成中...' : 'このコードのAIレビューを依頼する'}
        </button>
      </div>

      <div className="mt-8">
        <h2 className="text-2xl font-bold mb-4">AI Review History</h2>
        <div className="space-y-6">
          {project.reviews && project.reviews.length > 0 ? (
            [...project.reviews].reverse().map(review => (
              <div key={review.id} className="bg-white shadow-lg rounded-lg p-6 border-l-4 border-gray-300">
                <p className="text-sm text-gray-500 mb-4">
                  Review generated on: {new Date(review.created_at).toLocaleString('ja-JP')}
                </p>
                <ReviewDashboard review={review} />
              </div>
            ))
          ) : (
            <div className="bg-white shadow-md rounded-lg p-6 text-center text-gray-500">
              <p>まだレビューはありません。</p>
              <p>上のエディタにコードを貼り付けて、最初のレビューを生成しましょう！</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProjectDetailPage;