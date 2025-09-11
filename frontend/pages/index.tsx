import { useUser } from '@auth0/nextjs-auth0/client';
import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import Head from 'next/head';
import { CodeEditor } from '../components/CodeEditor';
import { ThemeSwitcher } from '../components/ThemeSwitcher';
import ReactDiffViewer from 'react-diff-viewer-continued';
import { useTheme } from 'next-themes';

// --- 型定義 ---
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
type FilterType = 'All' | 'Repair' | 'Performance' | 'Advance';


const DemoWorkbenchPage = () => {
  const { user } = useUser();
  const apiKey = process.env.NEXT_PUBLIC_INTERNAL_API_KEY;

  const [inputText, setInputText] = useState<string>('// ここに監査したいコードを貼り付けてください\n\nfunction factorial(n) {\n  if (n === 0) {\n    return 1;\n  } else {\n    return n * factorial(n - 1);\n  }\n}');
  const [isInspecting, setIsInspecting] = useState<boolean>(false);
  const [analysisResults, setAnalysisResults] = useState<InspectionResult[]>([]);
  const [activeFilter, setActiveFilter] = useState<FilterType>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedSuggestion, setSelectedSuggestion] = useState<Suggestion | null>(null);

  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  
  const handleInspect = async () => {
    if (!inputText.trim()) return;
    setIsInspecting(true);
    setAnalysisResults([]);
    setSelectedSuggestion(null);
    try {
        const res = await fetch(`/api/inspect/public`, {
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


  const FilterButton: React.FC<{name: FilterType}> = ({ name }) => {
    const count = useMemo(() => {
        if (name === 'All') return allSuggestions.length;
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
    const activeClasses = "bg-blue-600 text-white";
    const inactiveClasses = "bg-gray-200 dark:bg-gray-800 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-700";
    return (
        <button onClick={() => setActiveFilter(name)} className={`${baseClasses} ${activeFilter === name ? activeClasses : inactiveClasses}`}>
            <span>{name}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${activeFilter === name ? 'bg-blue-400 text-white' : 'bg-gray-300 dark:bg-gray-700 text-gray-700 dark:text-gray-200'}`}>{count}</span>
        </button>
    );
  };
  
  const handleApplySuggestion = () => {
    if (!selectedSuggestion || !selectedSuggestion.suggestion) return;
    setInputText(selectedSuggestion.suggestion);
    alert('修正案を適用しました！');
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100 dark:bg-black text-gray-900 dark:text-gray-200">
      <Head>
          <title>Demo Workbench - Refix</title>
      </Head>
      <header className="flex items-center justify-between p-2 bg-white dark:bg-black border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center">
          <h1 className="text-xl font-bold ml-4 text-gray-900 dark:text-gray-100">Refix</h1>
        </div>
        <div className="flex items-center space-x-4 p-2">
            <ThemeSwitcher />
            {user ? (
                <Link href="/dashboard" className="text-sm bg-blue-600 text-white font-semibold py-2 px-4 rounded-md hover:bg-blue-700">
                    ダッシュボードへ &rarr;
                </Link>
            ) : (
                <Link href="/api/auth/login" className="text-sm bg-blue-600 text-white font-semibold py-2 px-4 rounded-md hover:bg-blue-700">
                    ログイン / 新規登録
                </Link>
            )}
        </div>
      </header>

      <main className="flex flex-1 overflow-hidden">
        <div className="w-64 bg-white dark:bg-black p-4 border-r border-gray-200 dark:border-gray-800 overflow-y-auto">
          <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">コントロール</h2>
          <button onClick={handleInspect} disabled={isInspecting || !inputText.trim()} className="w-full bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-400">
            {isInspecting ? '監査実行中...' : '監査を実行'}
          </button>
        </div>
        
        <div className="flex-1 flex flex-col p-4 space-y-4 min-w-0">
          <div className="flex-1 min-h-0">
            <CodeEditor
              code={inputText}
              onCodeChange={setInputText}
              language={'javascript'}
              selectedLine={selectedSuggestion?.line_number}
            />
          </div>
          <div className="h-1/3 min-h-0 flex flex-col border rounded-md bg-white dark:bg-black border-gray-200 dark:border-gray-800 p-4">
              {selectedSuggestion ? (
                  <div className="flex-1 overflow-y-auto">
                      <h3 className="font-bold text-lg text-gray-900 dark:text-gray-100">選択中の指摘 <span className="text-sm font-normal text-gray-500 dark:text-gray-400">({selectedSuggestion.category} by {selectedSuggestion.model_name})</span></h3>
                      <p className="text-sm text-gray-700 dark:text-gray-300 mt-2 mb-4 whitespace-pre-wrap">{selectedSuggestion.description}</p>
                      
                      {selectedSuggestion.suggestion && mounted && (
                          <div>
                              <h4 className="font-semibold text-md mb-1 text-gray-900 dark:text-gray-100">修正案 (差分表示):</h4>
                              <div className="border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden text-sm">
                                <ReactDiffViewer
                                  oldValue={inputText}
                                  newValue={selectedSuggestion.suggestion}
                                  splitView={false}
                                  useDarkTheme={theme === 'dark'}
                                  leftTitle="現在のコード"
                                  rightTitle="修正案"
                                />
                              </div>
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
        
        <div className="w-96 bg-white dark:bg-black p-4 border-l border-gray-200 dark:border-gray-800 overflow-y-auto flex flex-col">
          <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">分析結果</h2>

          {!user && analysisResults.length > 0 && (
            <div className="mb-4 p-3 bg-blue-900 bg-opacity-50 border border-blue-500 rounded-lg text-center">
                <p className="text-sm text-blue-200 mb-2">分析結果を保存し、プロジェクト管理を始めるにはログインが必要です。</p>
                <Link href="/api/auth/login" className="inline-block text-sm bg-blue-600 text-white font-semibold py-2 px-3 rounded-md hover:bg-blue-700">
                    ログイン / 新規登録
                </Link>
            </div>
          )}
          
          <div className="border-b border-gray-200 dark:border-gray-800 pb-4 mb-4">
              <div className="flex flex-wrap gap-2">
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
                      className="w-full p-2 border rounded-md text-sm bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-200"
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
                    className={`border rounded-lg p-3 text-sm cursor-pointer transition-all dark:border-gray-800 ${
                      selectedSuggestion?.id === s.id 
                        ? 'bg-blue-100 dark:bg-blue-900 dark:bg-opacity-50 border-blue-500 dark:border-blue-500 shadow-md scale-[1.02]' 
                        : 'bg-gray-50 dark:bg-black hover:bg-gray-100 dark:hover:bg-gray-900 hover:border-gray-400'
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
export default DemoWorkbenchPage;