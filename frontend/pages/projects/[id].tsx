import { useRouter } from 'next/router';
import { useUser } from '@auth0/nextjs-auth0/client';
import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import Head from 'next/head';
import { CodeEditor } from '../../components/CodeEditor';
import { ThemeSwitcher } from '../../components/ThemeSwitcher';

// --- 型定義 ---
interface Project {
  id: number;
  name: string;
}
interface AIReviewDetail {
    category: string;
    file_path?: string;
    file_name?: string;
    line_number: number;
    description: string;
    details?: string;
    suggestion: string;
}
interface AIReview {
    overall_score: number;
    summary: string;
    details?: AIReviewDetail[];
    panels?: AIReviewDetail[];
}
interface InspectionResult {
    model_name: string;
    review?: AIReview;
    error?: string;
}
interface Suggestion {
    id: string;
    model_name: string;
    category: string;
    description: string;
    line_number: number;
    suggestion: string;
}

// ▼ 変更点: アイコンを削除
type FilterType = 'All' | 'Repair' | 'Performance' | 'Advance';

const ProjectDetailPage = () => {
  const router = useRouter();
  const { id } = router.query;
  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const apiKey = process.env.NEXT_PUBLIC_INTERNAL_API_KEY;

  const [inputText, setInputText] = useState<string>('');
  const [isInspecting, setIsInspecting] = useState<boolean>(false);
  const [analysisResults, setAnalysisResults] = useState<InspectionResult[]>([]);
  const [activeFilter, setActiveFilter] = useState<FilterType>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedSuggestion, setSelectedSuggestion] = useState<Suggestion | null>(null);

  useEffect(() => {
    if (!id) return;
    const fetchProjectDetails = async () => {
      try {
        const res = await fetch(`/api/projects/${id}`, { headers: { 'X-API-Key': apiKey || '' } });
        if (res.ok) setProject(await res.json());
        else setError('プロジェクトの取得に失敗しました。');
      } catch (err) { setError('サーバーとの通信エラーです。');
      } finally { setIsLoading(false); }
    };
    fetchProjectDetails();
  }, [id, apiKey]);

  const handleInspect = async () => {
    if (!inputText.trim() || !project) return;
    setIsInspecting(true);
    setAnalysisResults([]);
    setSelectedSuggestion(null);
    try {
        const res = await fetch(`/api/projects/${project.id}/inspect`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey || '' },
            body: JSON.stringify({ code: inputText, language: 'auto' })
        });
        if (res.ok) setAnalysisResults(await res.json());
        else alert('分析の実行に失敗しました。');
    } catch (err) { alert('サーバーとの通信中にエラーが発生しました。');
    } finally { setIsInspecting(false); }
  };

  const allSuggestions = useMemo(() => {
    const suggestions: Suggestion[] = [];
    analysisResults.forEach((result) => {
      if (result.review) {
        const reviewData = result.review;
        const details: AIReviewDetail[] = reviewData.details || reviewData.panels || [];
        details.forEach((detail, detailIndex) => {
          suggestions.push({
            id: `${result.model_name}-${detailIndex}`, model_name: result.model_name,
            category: detail.category, description: detail.details || detail.description,
            line_number: detail.line_number, suggestion: detail.suggestion,
          });
        });
      }
    });
    return suggestions;
  }, [analysisResults]);

  const filteredSuggestions = useMemo(() => {
    let suggestions = allSuggestions;
    if (activeFilter !== 'All') {
        // ▼ 変更点: アイコンを削除
        const mapping: Record<FilterType, string[]> = {
            All: [],
            'Repair': ['Security', 'Bug', 'Bug Risk'],
            'Performance': ['Performance'],
            'Advance': ['Quality', 'Readability', 'Best Practice', 'Design', 'Style'],
        };
        const targetCategories = mapping[activeFilter];
        suggestions = allSuggestions.filter(s => targetCategories.includes(s.category));
    }
    if (searchQuery.trim() !== '') {
        const lowercasedQuery = searchQuery.toLowerCase();
        suggestions = suggestions.filter(s => 
            s.description.toLowerCase().includes(lowercasedQuery) ||
            s.category.toLowerCase().includes(lowercasedQuery)
        );
    }
    return suggestions;
  }, [activeFilter, allSuggestions, searchQuery]);

  if (isLoading) return <div className="p-8">読み込み中...</div>;
  if (error) return <div className="p-8">{error}</div>;
  if (!project) return <div className="p-8">プロジェクトが見つかりません。</div>;

  const FilterButton: React.FC<{name: FilterType}> = ({ name }) => {
    const count = useMemo(() => {
        if (name === 'All') return allSuggestions.length;
        // ▼ 変更点: アイコンを削除
        const mapping: Record<FilterType, string[]> = {
            All: [],
            'Repair': ['Security', 'Bug', 'Bug Risk'],
            'Performance': ['Performance'],
            'Advance': ['Quality', 'Readability', 'Best Practice', 'Design', 'Style'],
        };
        const targetCategories = mapping[name];
        return allSuggestions.filter(s => targetCategories.includes(s.category)).length;
    }, [allSuggestions]);

    const baseClasses = "px-3 py-1 text-sm font-medium rounded-full transition-colors flex items-center space-x-2";
    const activeClasses = "bg-indigo-600 text-white";
    const inactiveClasses = "bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600";
    return (
        <button onClick={() => setActiveFilter(name)} className={`${baseClasses} ${activeFilter === name ? activeClasses : inactiveClasses}`}>
            <span>{name}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${activeFilter === name ? 'bg-indigo-400 text-white' : 'bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200'}`}>{count}</span>
        </button>
    );
  };
  
  const handleApplySuggestion = () => {
    if (!selectedSuggestion || !selectedSuggestion.suggestion) return;
    setInputText(selectedSuggestion.suggestion);
    alert('修正案を適用しました！');
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-200">
      <Head>
          <title>{project.name} - Refix Workbench</title>
      </Head>
      <header className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center">
          <Link href="/" className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline">&larr; プロジェクト一覧</Link>
          <h1 className="text-xl font-bold ml-4 text-gray-900 dark:text-gray-100">{project.name}</h1>
        </div>
        <div className="p-2">
          <ThemeSwitcher />
        </div>
      </header>

      <main className="flex flex-1 overflow-hidden">
        <div className="w-64 bg-white dark:bg-gray-800 p-4 border-r border-gray-200 dark:border-gray-700 overflow-y-auto">
          <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">コントロール</h2>
          <button onClick={handleInspect} disabled={isInspecting || !inputText.trim()} className="w-full bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-indigo-700 disabled:bg-gray-400">
            {isInspecting ? '監査実行中...' : '監査を実行'}
          </button>
        </div>
        
        <div className="flex-1 flex flex-col p-4 space-y-4 min-w-0">
          <div className="flex-1 min-h-0">
            <CodeEditor
              code={inputText}
              onCodeChange={setInputText}
              language={'python'}
              selectedLine={selectedSuggestion?.line_number}
            />
          </div>
          <div className="h-1/3 min-h-0 flex flex-col border rounded-md bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 p-4">
              {selectedSuggestion ? (
                  <div className="flex-1 overflow-y-auto">
                      <h3 className="font-bold text-lg text-gray-900 dark:text-gray-100">選択中の指摘 <span className="text-sm font-normal text-gray-500 dark:text-gray-400">({selectedSuggestion.category} by {selectedSuggestion.model_name})</span></h3>
                      <p className="text-sm text-gray-700 dark:text-gray-300 mt-2 mb-4 whitespace-pre-wrap">{selectedSuggestion.description}</p>
                      {selectedSuggestion.suggestion && (
                          <div>
                              <h4 className="font-semibold text-md mb-1 text-gray-900 dark:text-gray-100">修正案:</h4>
                              <pre className="bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200 p-2 rounded-md text-sm overflow-x-auto"><code>{selectedSuggestion.suggestion}</code></pre>
                              <button 
                                onClick={handleApplySuggestion}
                                className="mt-2 bg-green-500 hover:bg-green-600 text-white font-bold py-1 px-3 text-sm rounded"
                              >
                                  ✅ この修正を適用
                              </button>
                          </div>
                      )}
                  </div>
              ) : (
                  <div className="flex-1 flex items-center justify-center h-full">
                      <p className="text-gray-500 dark:text-gray-400">右のパネルから指摘事項を選択すると、ここに詳細が表示されます。</p>
                  </div>
              )}
          </div>
        </div>
        
        <div className="w-96 bg-white dark:bg-gray-800 p-4 border-l border-gray-200 dark:border-gray-700 overflow-y-auto flex flex-col">
          <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">分析結果</h2>
          <div className="border-b border-gray-200 dark:border-gray-700 pb-4 mb-4">
              <div className="flex flex-wrap gap-2">
                  {/* ▼ 変更点: アイコンを削除 */}
                  <FilterButton name="All" />
                  <FilterButton name="Repair" />
                  <FilterButton name="Performance" />
                  <FilterButton name="Advance" />
              </div>
              <div className="mt-4">
                  <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="結果をキーワードで検索..."
                      className="w-full p-2 border rounded-md text-sm bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-200"
                  />
              </div>
          </div>
          
          <div className="flex-1 overflow-y-auto min-h-0">
            {isInspecting && <p className="text-sm text-gray-500 dark:text-gray-400">各AIが分析中...</p>}
            {!isInspecting && analysisResults.length > 0 && (
              <div className="space-y-3">
                {filteredSuggestions.map((s) => (
                  <div 
                    key={s.id}
                    onClick={() => setSelectedSuggestion(s)}
                    className={`border rounded-lg p-3 text-sm cursor-pointer transition-all dark:border-gray-700 ${
                      selectedSuggestion?.id === s.id 
                        ? 'bg-indigo-100 dark:bg-indigo-900 dark:bg-opacity-50 border-indigo-500 dark:border-indigo-500 shadow-md scale-[1.02]' 
                        : 'bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-700 hover:border-gray-400'
                    }`}
                  >
                    <p className="font-bold text-gray-800 dark:text-gray-200">{s.category}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">by {s.model_name}</p>
                    <p className="text-gray-700 dark:text-gray-300 truncate">{s.description}</p>
                  </div>
                ))}
                {filteredSuggestions.length === 0 && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 p-4 text-center">該当する指摘事項はありません。</p>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};
export default ProjectDetailPage;