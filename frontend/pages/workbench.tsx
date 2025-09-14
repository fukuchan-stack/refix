import { useUser } from '@auth0/nextjs-auth0/client';
import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import Head from 'next/head';
import { CodeEditor } from '../components/CodeEditor';
import { ResultsPanel } from '../components/ResultsPanel';
import { ControlSidebar } from '../components/ControlSidebar';
import { Allotment } from "allotment";
import { FiMenu } from 'react-icons/fi';

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

const sampleCode = `// ここに監査したいコードを貼り付けるか、「サンプルを表示」ボタンを押してください

function factorial(n) {
  if (n === 0) {
    return 1;
  } else {
    return n * factorial(n - 1);
  }
}`;


const DemoWorkbenchPage = () => {
    const { user } = useUser();
    const apiKey = process.env.NEXT_PUBLIC_INTERNAL_API_KEY;

    const [inputText, setInputText] = useState<string>('');
    const [language, setLanguage] = useState<string>('javascript');
    const [isInspecting, setIsInspecting] = useState<boolean>(false);
    const [analysisResults, setAnalysisResults] = useState<InspectionResult[]>([]);
    const [rateLimitError, setRateLimitError] = useState<boolean>(false);
    
    const [activeAiTab, setActiveAiTab] = useState<string>("Gemini (Balanced)");
    const [activeFilter, setActiveFilter] = useState<FilterType>('All');
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [selectedSuggestion, setSelectedSuggestion] = useState<Suggestion | null>(null);
    const [selectedLine, setSelectedLine] = useState<number | null>(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    // ヘッダーボタンの表示状態を管理するState
    const [showSampleButton, setShowSampleButton] = useState(true);
    const [showClearButton, setShowClearButton] = useState(true);


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
                body: JSON.stringify({ code: inputText, language: language })
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

    const handleLoadSampleCode = () => {
        setInputText(sampleCode);
    };

    const handleApplySuggestion = () => {
        if (!selectedSuggestion || !selectedSuggestion.suggestion) return;
        setInputText(selectedSuggestion.suggestion);
        setSelectedSuggestion(null);
        alert('修正案を適用しました！');
    };

    const handleToggleSidebar = () => {
        setIsSidebarOpen(!isSidebarOpen);
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
                    <button
                        onClick={handleToggleSidebar}
                        title={isSidebarOpen ? 'メニューを閉じる' : 'メニューを開く'}
                        className="p-2 mr-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-800"
                    >
                        <FiMenu size={20} />
                    </button>
                    <Link href="/" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">&larr; トップページ</Link>
                    <h1 className="text-xl font-bold ml-4 text-gray-900 dark:text-gray-100">Demo Workbench</h1>
                </div>
                <div className="flex items-center space-x-2 p-2">
                    {showSampleButton && (
                        <button 
                            onClick={handleLoadSampleCode} 
                            className="text-sm font-semibold py-2 px-4 rounded-md border border-gray-500 text-gray-700 dark:border-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        >
                            サンプルを表示
                        </button>
                    )}
                    {showClearButton && (
                        <button 
                            onClick={handleClearCode} 
                            className="text-sm font-semibold py-2 px-4 rounded-md border border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400 hover:bg-blue-600 hover:text-white dark:hover:bg-blue-400 dark:hover:text-black transition-colors"
                        >
                            クリア
                        </button>
                    )}
                    <button 
                        onClick={handleInspect} 
                        disabled={isInspecting} 
                        className="text-base font-bold py-2 px-5 rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                        {isInspecting ? '実行中...' : '実行'}
                    </button>
                    {user ? ( <Link href="/dashboard" className="text-sm bg-gray-100 dark:bg-gray-800 py-2 px-4 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700">ダッシュボードへ &rarr;</Link>) 
                          : ( <Link href="/api/auth/login" className="text-sm font-semibold hover:text-blue-500">ログイン</Link> )}
                </div>
            </header>

            <main className="flex flex-1 overflow-hidden">
                {isSidebarOpen && (
                    <ControlSidebar
                        activeAiTab={activeAiTab}
                        setActiveAiTab={setActiveAiTab}
                        activeFilter={activeFilter}
                        setActiveFilter={setActiveFilter}
                        searchQuery={searchQuery}
                        setSearchQuery={setSearchQuery}
                        allSuggestions={allSuggestions}
                        showSampleButton={showSampleButton}
                        setShowSampleButton={setShowSampleButton}
                        showClearButton={showClearButton}
                        setShowClearButton={setShowClearButton}
                    />
                )}
                <div className="flex-1 flex flex-col p-4 overflow-hidden">
                    <Allotment vertical>
                        <Allotment.Pane preferredSize={"67%"}>
                            <CodeEditor code={inputText} onCodeChange={setInputText} language={language} selectedLine={selectedLine} />
                        </Allotment.Pane>
                        <Allotment.Pane preferredSize={"33%"}>
                            <ResultsPanel 
                                filteredSuggestions={filteredSuggestions}
                                selectedSuggestion={selectedSuggestion}
                                setSelectedSuggestion={setSelectedSuggestion}
                                setSelectedLine={setSelectedLine}
                                inputText={inputText}
                                handleApplySuggestion={handleApplySuggestion}
                                language={language}
                            />
                        </Allotment.Pane>
                    </Allotment>
                </div>
            </main>
        </div>
    );
};
export default DemoWorkbenchPage;