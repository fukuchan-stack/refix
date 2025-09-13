import { useRouter } from 'next/router';
import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import Head from 'next/head';
import { CodeEditor } from '../../components/CodeEditor';
import { ThemeSwitcher } from '../../components/ThemeSwitcher';
import { ResultsPanel } from '../../components/ResultsPanel';
import { ControlSidebar } from '../../components/ControlSidebar';
import { Allotment } from "allotment";

// --- 型定義 ---
interface Project {
    id: number;
    name: string;
}
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

// ★★★ 変更点①: サンプルコード用の定数を定義 ★★★
const sampleCode = `// 「サンプルを表示」ボタンで読み込まれたコードです

function factorial(n) {
  if (n === 0) {
    return 1;
  } else {
    return n * factorial(n - 1);
  }
}`;


const ProjectDetailPage = () => {
    const router = useRouter();
    const { id } = router.query;
    const [project, setProject] = useState<Project | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const apiKey = process.env.NEXT_PUBLIC_INTERNAL_API_KEY;

    const [inputText, setInputText] = useState<string>('');
    const [language, setLanguage] = useState<string>('python');
    const [isInspecting, setIsInspecting] = useState<boolean>(false);
    const [analysisResults, setAnalysisResults] = useState<InspectionResult[]>([]);
    const [activeAiTab, setActiveAiTab] = useState<string>("Gemini (Balanced)");
    const [activeFilter, setActiveFilter] = useState<FilterType>('All');
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [selectedSuggestion, setSelectedSuggestion] = useState<Suggestion | null>(null);
    const [selectedLine, setSelectedLine] = useState<number | null>(null);

    useEffect(() => {
        if (!id) return;
        const fetchProjectDetails = async () => {
            setIsLoading(true);
            try {
                const res = await fetch(`/api/projects/${id}`, { headers: { 'X-API-Key': apiKey || '' } });
                if (res.ok) {
                    const projectData = await res.json();
                    setProject(projectData);
                }
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
                body: JSON.stringify({ code: inputText, language: language })
            });
            if (res.ok) setAnalysisResults(await res.json());
            else alert('分析の実行に失敗しました。');
        } catch (err) { alert('サーバーとの通信中にエラーが発生しました。');
        } finally { setIsInspecting(false); }
    };
    
    const handleClearCode = () => {
        setInputText('');
    };

    // ★★★ 変更点②: サンプルコードを読み込むための新しい関数を追加 ★★★
    const handleLoadSampleCode = () => {
        setInputText(sampleCode);
        // サンプルがJSなので、エディタのシンタックスハイライトもjavascriptに切り替える
        setLanguage('javascript'); 
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

    if (isLoading) return <div className="p-8">読み込み中...</div>;
    if (error) return <div className="p-8">{error}</div>;
    if (!project) return <div className="p-8">プロジェクトが見つかりません。</div>;

    return (
        <div className="flex flex-col h-screen bg-gray-100 dark:bg-black text-gray-900 dark:text-gray-200">
            <Head>
                <title>{project.name} - Refix Workbench</title>
            </Head>
            <header className="flex items-center justify-between p-2 bg-white dark:bg-black border-b border-gray-200 dark:border-gray-800">
                <div className="flex items-center">
                    <Link href="/dashboard" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">&larr; ダッシュボード</Link>
                    <h1 className="text-xl font-bold ml-4 text-gray-900 dark:text-gray-100">{project.name}</h1>
                </div>
                {/* ★★★ 変更点③: 「サンプルを表示」ボタンをヘッダーに追加 ★★★ */}
                <div className="flex items-center space-x-2 p-2">
                    <button 
                        onClick={handleLoadSampleCode} 
                        className="text-sm font-semibold py-2 px-4 rounded-md border border-gray-500 text-gray-700 dark:border-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                        サンプルを表示
                    </button>
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
export default ProjectDetailPage;