import { useUser } from '@auth0/nextjs-auth0/client';
import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import Head from 'next/head';
import { CodeEditor } from '../components/CodeEditor';
import { ThemeSwitcher } from '../components/ThemeSwitcher';
import { ResultsPanel } from '../components/ResultsPanel';
import { ControlSidebar } from '../components/ControlSidebar';
import { Allotment } from "allotment";

// --- 型定義 ---
interface AIReviewDetail {
    category: string;
    line_number: number;
    description: string;
    details?: string;
    suggestion: string;
}
interface AIReview {
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
  const [rateLimitError, setRateLimitError] = useState<boolean>(false);
  
  const [activeAiTab, setActiveAiTab] = useState<string>("Gemini (Balanced)");
  const [activeFilter, setActiveFilter] = useState<FilterType>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedSuggestion, setSelectedSuggestion] = useState<Suggestion | null>(null);
  const [selectedLine, setSelectedLine] = useState<number | null>(null);

  const handleInspect = async () => {
    if (!inputText.trim()) return;
    setIsInspecting(true);
    setAnalysisResults([]);
    setRateLimitError(false);
    setSelectedSuggestion(null);
    try {
        const res = await fetch(`/api/inspect/public`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey || '' },
            body: JSON.stringify({ code: inputText, language: 'auto' })
        });
        if (res.ok) {
          setAnalysisResults(await res.json());
        } else if (res.status === 429) {
          setRateLimitError(true);
        } else {
          const errorText = await res.text();
          alert(`分析の実行に失敗しました: ${errorText}`);
        }
    } catch (err) { alert('サーバーとの通信中にエラーが発生しました。');
    } finally { setIsInspecting(false); }
  };
  
  const handleClearCode = () => {
    setInputText('');
  };

  const handleApplySuggestion = () => {
    if (!selectedSuggestion || !selectedSuggestion.suggestion) return;
    setInputText(selectedSuggestion.suggestion);
    setSelectedSuggestion(null);
    alert('修正案を適用しました！');
  };

  const allSuggestions = useMemo(() => {
    const suggestions: Suggestion[] = [];
    analysisResults.forEach((result) => {
      if (result.review) {
        const details: AIReviewDetail[] = result.review.details || result.review.panels || [];
        details.forEach((detail, detailIndex) => {
          suggestions.push({ id: `${result.model_name}-${detailIndex}`, model_name: result.model_name, ...detail });
        });
      }
    });
    return suggestions;
  }, [analysisResults]);

  const filteredSuggestions = useMemo(() => {
    let suggestions = allSuggestions.filter(s => s.model_name === activeAiTab);
    if (activeFilter !== 'All') {
        const mapping: Record<FilterType, string[]> = {
            All: [], 'Repair': ['Security', 'Bug', 'Bug Risk'], 'Performance': ['Performance'],
            'Advance': ['Quality', 'Readability', 'Best Practice', 'Design', 'Style'],
        };
        const targetCategories = mapping[activeFilter];
        suggestions = suggestions.filter(s => targetCategories.includes(s.category));
    }
    if (searchQuery.trim() !== '') {
        const lowercasedQuery = searchQuery.toLowerCase();
        suggestions = suggestions.filter(s => s.description.toLowerCase().includes(lowercasedQuery));
    }
    return suggestions;
  }, [activeAiTab, activeFilter, allSuggestions, searchQuery]);

  return (
    <div className="flex flex-col h-screen bg-gray-100 dark:bg-black text-gray-900 dark:text-gray-200">
      <Head>
          <title>Demo Workbench - Refix</title>
      </Head>
      <header className="flex items-center justify-between p-2 bg-white dark:bg-black border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center">
          <Link href="/" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">&larr; トップページ</Link>
          <h1 className="text-xl font-bold ml-4 text-gray-900 dark:text-gray-100">Demo Workbench</h1>
        </div>
        <div className="flex items-center space-x-2 p-2">
            <button 
              onClick={handleClearCode} 
              className="text-sm font-semibold py-2 px-4 rounded-md border border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400 hover:bg-blue-600 hover:text-white dark:hover:bg-blue-400 dark:hover:text-black transition-colors"
            >
              クリア
            </button>
            <button 
              onClick={handleInspect} 
              disabled={isInspecting} 
              className="text-base font-bold py-2 px-5 rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isInspecting ? '実行中...' : '実行'}
            </button>
            <ThemeSwitcher />
            {user ? ( <Link href="/dashboard" className="text-sm bg-gray-100 dark:bg-gray-800 py-2 px-4 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700">ダッシュボードへ &rarr;</Link>) 
                   : ( <Link href="/api/auth/login" className="text-sm font-semibold hover:text-blue-500">ログイン</Link> )}
        </div>
      </header>

      <main className="flex flex-1 overflow-hidden">
        <ControlSidebar
            activeAiTab={activeAiTab}
            setActiveAiTab={setActiveAiTab}
            activeFilter={activeFilter}
            setActiveFilter={setActiveFilter}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            allSuggestions={allSuggestions}
        />
        <div className="flex-1 flex flex-col p-4 overflow-hidden">
            <Allotment vertical>
              <Allotment.Pane preferredSize={"67%"}>
                <CodeEditor code={inputText} onCodeChange={setInputText} language={'javascript'} selectedLine={selectedLine} />
              </Allotment.Pane>
              <Allotment.Pane preferredSize={"33%"}>
                <ResultsPanel 
                  filteredSuggestions={filteredSuggestions}
                  selectedSuggestion={selectedSuggestion}
                  setSelectedSuggestion={setSelectedSuggestion}
                  setSelectedLine={setSelectedLine}
                  inputText={inputText}
                  handleApplySuggestion={handleApplySuggestion}
                />
              </Allotment.Pane>
            </Allotment>
        </div>
      </main>
    </div>
  );
};
export default DemoWorkbenchPage;