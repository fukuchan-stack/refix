import { useRouter } from 'next/router';
import { useUser } from '@auth0/nextjs-auth0/client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Head from 'next/head';

interface Project { 
  id: number; 
  name: string; 
}
interface InspectionResult {
    model_name: string;
    review?: any; // オブジェクトを受け取るように変更
    error?: string;
}

const ProjectDetailPage = () => {
  const router = useRouter();
  const { id } = router.query;
  const { user } = useUser();
  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const apiKey = process.env.NEXT_PUBLIC_INTERNAL_API_KEY;

  const [inputText, setInputText] = useState<string>('');
  const [isInspecting, setIsInspecting] = useState<boolean>(false);
  const [analysisResults, setAnalysisResults] = useState<InspectionResult[]>([]);

  useEffect(() => {
    if (!id) return;
    const fetchProjectDetails = async () => {
      try {
        const res = await fetch(`/api/projects/${id}`, { headers: { 'X-API-Key': apiKey || '' } });
        if (res.ok) {
          setProject(await res.json());
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

  const handleInspect = async () => {
    if (!inputText.trim() || !project) return;
    setIsInspecting(true);
    setAnalysisResults([]);
    try {
        const res = await fetch(`/api/projects/${project.id}/inspect`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey || '' },
            body: JSON.stringify({ code: inputText, language: 'auto' })
        });
        if (res.ok) {
            setAnalysisResults(await res.json());
        } else {
            alert('分析の実行に失敗しました。');
        }
    } catch (err) {
        alert('サーバーとの通信中にエラーが発生しました。');
    } finally {
        setIsInspecting(false);
    }
  };

  if (isLoading) return <div className="p-8">読み込み中...</div>;
  if (error) return <div className="p-8">{error}</div>;
  if (!project) return <div className="p-8">プロジェクトが見つかりません。</div>;

  return (
    <>
      <Head>
          <title>{project.name} - Refix Workbench</title>
      </Head>
      <div className="flex flex-col h-screen bg-gray-100">
        <header className="flex items-center justify-between p-2 bg-white border-b">
          <div className="flex items-center">
            <Link href="/" legacyBehavior><a className="text-sm text-indigo-600 hover:underline">&larr; プロジェクト一覧</a></Link>
            <h1 className="text-xl font-bold ml-4">{project.name}</h1>
          </div>
          <div></div>
        </header>

        <main className="flex flex-1 overflow-hidden">
          <div className="w-64 bg-white p-4 border-r overflow-y-auto">
            <h2 className="text-lg font-semibold mb-4">コントロール</h2>
            <button
              onClick={handleInspect}
              disabled={isInspecting || !inputText.trim()}
              className="w-full bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-indigo-700 disabled:bg-gray-400"
            >
              {isInspecting ? '監査実行中...' : '監査を実行'}
            </button>
          </div>
          <div className="flex-1 flex flex-col p-4">
            <div className="flex-1 overflow-y-auto mb-4">
              <h2 className="text-lg font-semibold mb-4">コードキャンバス</h2>
              <p className="text-sm text-gray-500">（ここにチャット履歴などが表示されます）</p>
            </div>
            <div className="mt-auto">
              <textarea
                className="w-full p-2 border rounded-md font-mono text-sm"
                rows={10}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="ここに監査してほしいコードを貼り付けてください..."
              />
            </div>
          </div>
          <div className="w-1/3 bg-white p-4 border-l overflow-y-auto">
            <h2 className="text-lg font-semibold mb-4">分析結果</h2>
            {isInspecting && <p className="text-sm text-gray-500">各AIが分析中...</p>}
            <div className="space-y-4">
                {analysisResults.map((result, index) => {
                    // ★★★ ここが修正箇所 ★★★
                    const reviewData = result.review; // JSON.parseは不要
                    return (
                        <div key={index} className="border rounded-lg p-3 bg-gray-50">
                            <p className="font-bold text-md text-gray-800">{result.model_name}</p>
                            {result.error && <p className="text-red-500 text-sm">エラー: {result.error}</p>}
                            {reviewData && (
                                <div className="mt-2 text-sm">
                                    {/* ★ reviewDataがJSONオブジェクトではない可能性も考慮 */}
                                    <p>スコア: <span className="font-semibold text-indigo-600">{reviewData.overall_score || 'N/A'}/100</span></p>
                                    <p className="text-gray-600 mt-1">{reviewData.summary || '概要はありません。'}</p>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
          </div>
        </main>
      </div>
    </>
  );
};

export default ProjectDetailPage;