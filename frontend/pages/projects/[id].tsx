import { useRouter } from 'next/router';
import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import Head from 'next/head';
import { CodeEditor } from '../../components/CodeEditor';
import { ResultsPanel } from '../../components/ResultsPanel';
import { ControlSidebar } from '../../components/ControlSidebar';
import { Allotment } from "allotment";
import "allotment/dist/style.css";
import { FiMenu, FiSearch } from 'react-icons/fi';
import { scanDependenciesWithSnyk, inspectCodeConsolidated, getProjectById } from '../../lib/api';
import SnykResults from '../../components/SnykResults';
import SnykScanModal from '../../components/SnykScanModal';
import ConsolidatedView from '../../components/ConsolidatedView';
import { Suggestion } from '../../types';

// --- 型定義 ---
interface Project {
    id: number;
    name: string;
    github_url: string | null;
    user_id: string;
    created_at: string;
    updated_at: string | null;
    display_order: number;
    conversations: any[];
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
type FilterType = 'All' | 'Repair' | 'Performance' | 'Advance';

const sampleCode = `# Example Python code with an intentional bug
def calculate_average(numbers):
    # Bug: Division by zero if numbers is an empty list
    return sum(numbers) / len(numbers)
`;

const ProjectDetailPage = () => {
    const router = useRouter();
    const { id } = router.query;
    const [project, setProject] = useState<Project | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [accessToken, setAccessToken] = useState<string | null>(null);
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

    const [inputText, setInputText] = useState<string>('');
    const [language, setLanguage] = useState<string>('');
    const [isInspecting, setIsInspecting] = useState<boolean>(false);
    const [analysisResults, setAnalysisResults] = useState<InspectionResult[]>([]);
    const [activeAiTab, setActiveAiTab] = useState<string>("Gemini (Balanced)");
    const [activeFilter, setActiveFilter] = useState<FilterType>('All');
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [selectedSuggestion, setSelectedSuggestion] = useState<Suggestion | null>(null);
    const [selectedLine, setSelectedLine] = useState<number | null>(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    const [showSampleButton, setShowSampleButton] = useState(true);
    const [showClearButton, setShowClearButton] = useState(true);
    const [showSearchBar, setShowSearchBar] = useState(true);
    const [showSnykButton, setShowSnykButton] = useState(true);

    const [snykResults, setSnykResults] = useState<any | null>(null);
    const [isSnykLoading, setIsSnykLoading] = useState<boolean>(false);
    const [snykError, setSnykError] = useState<string | null>(null);

    const [isSnykModalOpen, setIsSnykModalOpen] = useState(false);

    const [consolidatedIssues, setConsolidatedIssues] = useState<any[]>([]);

    const fetchAccessToken = async () => {
        const res = await fetch('/api/auth/token');
        if (!res.ok) {
          throw new Error('Failed to fetch access token');
        }
        const data = await res.json();
        return data.accessToken;
    };

    useEffect(() => {
        if (!id || typeof id !== 'string') return;

        const fetchInitialData = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const token = await fetchAccessToken();
                setAccessToken(token);
                const projectData = await getProjectById(token, id);
                setProject(projectData);
            } catch (err: any) { 
                setError(`プロジェクトの取得に失敗しました。`);
                console.error(err);
            } finally { 
                setIsLoading(false); 
            }
        };
        fetchInitialData();
    }, [id]);
    
    const handleInspect = async () => {
        if (!inputText.trim() || !project || !language || !accessToken) return;
        setIsInspecting(true);
        setAnalysisResults([]);
        setConsolidatedIssues([]);
        setSelectedSuggestion(null);
        try {
            const [rawResults, consolidatedData] = await Promise.all([
                 fetch(`${apiBaseUrl}/api/projects/${project.id}/inspect`, {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json', 
                        'Authorization': `Bearer ${accessToken}` 
                    },
                    body: JSON.stringify({ code: inputText, language: language })
                }).then(res => {
                    if (!res.ok) throw new Error('Failed to fetch raw results');
                    return res.json();
                }),
                fetch(`${apiBaseUrl}/api/projects/${project.id}/inspect/consolidated`, {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json', 
                        'Authorization': `Bearer ${accessToken}`
                    },
                    body: JSON.stringify({ code: inputText, language: language })
                }).then(res => {
                    if (!res.ok) throw new Error('Failed to fetch consolidated results');
                    return res.json();
                })
            ]);

            setAnalysisResults(rawResults);
            setConsolidatedIssues(consolidatedData.consolidated_issues || []);
            setActiveAiTab('AI集約表示');

        } catch (err) { alert('サーバーとの通信中にエラーが発生しました。');
        } finally { setIsInspecting(false); }
    };
    
    const handleTriggerSnykScan = async (fileContent: string) => {
        if (!accessToken) return;
        setIsSnykModalOpen(false);
        setIsSnykLoading(true);
        setSnykError(null);
        setSnykResults(null);
        try {
            const results = await scanDependenciesWithSnyk(accessToken, fileContent, language);
            setSnykResults(results);
        } catch (err: any) {
            setSnykError(err.message || 'An unknown error occurred during the Snyk scan.');
        } finally {
            setIsSnykLoading(false);
        }
    };
    
    const handleClearCode = () => {
        setInputText('');
        setLanguage('');
        setSelectedLine(null);
        setAnalysisResults([]);
        setConsolidatedIssues([]);
        setSelectedSuggestion(null);
        setSnykResults(null);
        setSnykError(null);
    };

    const handleLoadSampleCode = () => {
        setInputText(sampleCode);
        setLanguage('python'); 
    };

    const handleApplySuggestion = () => {
        if (!selectedSuggestion?.suggestion) return;
        setInputText(selectedSuggestion.suggestion);
        setSelectedSuggestion(null);
        alert('修正案を適用しました！');
    };

    const handleToggleSidebar = () => {
        setIsSidebarOpen(!isSidebarOpen);
    };

    const handleCloseSnykResults = () => {
        setSnykResults(null);
        setSnykError(null);
    };

    const allSuggestions = useMemo(() => {
        const suggestions: Suggestion[] = [];
        analysisResults.forEach((result) => {
            if (result.review?.details) {
                result.review.details.forEach((detail, detailIndex) => {
                    suggestions.push({
                        id: `${result.model_name}-${detailIndex}`,
                        model_name: result.model_name,
                        ...detail
                    });
                });
            }
        });
        return suggestions;
    }, [analysisResults]);

    const filteredSuggestions = useMemo(() => {
        if (activeAiTab === 'AI集約表示') return [];

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

    if (isLoading) return <div className="p-8">プロジェクト情報を読み込み中...</div>;
    if (error) return <div className="p-8 text-red-500">{error}</div>;
    if (!project) return <div className="p-8">プロジェクトが見つかりません。</div>;

    return (
        <div className="flex flex-col h-screen bg-gray-100 dark:bg-black text-gray-900 dark:text-gray-200">
            <Head>
                <title>{project.name} - Refix Workbench</title>
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
                    <Link href="/dashboard" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">&larr; ダッシュボード</Link>
                    <h1 className="text-xl font-bold ml-4 text-gray-900 dark:text-gray-100">{project.name}</h1>
                </div>
                <div className="flex items-center space-x-2 p-2">
                    {showSearchBar && (
                        <div className="relative">
                            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="キーワードで検索..."
                                className="w-full pl-9 pr-3 py-2 border rounded-md text-sm bg-gray-50 dark:bg-gray-900 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-200"
                            />
                        </div>
                    )}
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
                    {showSnykButton && (
                        <button 
                            onClick={() => setIsSnykModalOpen(true)}
                            disabled={!language}
                            className="text-sm font-semibold py-2 px-4 rounded-md bg-purple-600 text-white hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                        >
                            Snykで依存関係をスキャン
                        </button>
                    )}
                    <button 
                        onClick={handleInspect} 
                        disabled={isInspecting || !language} 
                        className="text-base font-bold py-2 px-5 rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                        {isInspecting ? '実行中...' : '実行'}
                    </button>
                </div>
            </header>
            
            <main className="flex flex-1 overflow-hidden">
                {isSidebarOpen && (
                    <ControlSidebar
                        activeAiTab={activeAiTab}
                        setActiveAiTab={setActiveAiTab}
                        activeFilter={activeFilter}
                        setActiveFilter={setActiveFilter}
                        suggestions={allSuggestions}
                        showSampleButton={showSampleButton}
                        setShowSampleButton={setShowSampleButton}
                        showClearButton={showClearButton}
                        setShowClearButton={setShowClearButton}
                        showSearchBar={showSearchBar}
                        setShowSearchBar={setShowSearchBar}
                        showSnykButton={showSnykButton}
                        setShowSnykButton={setShowSnykButton}
                    />
                )}
                <div className="flex-1 flex flex-col p-4 overflow-hidden">
                    <Allotment vertical>
                        <Allotment.Pane preferredSize={"67%"}>
                            <CodeEditor 
                                code={inputText} 
                                onCodeChange={setInputText} 
                                language={language} 
                                selectedLine={selectedLine}
                                onLanguageChange={setLanguage}
                            />
                        </Allotment.Pane>
                        <Allotment.Pane preferredSize={"33%"}>
                            <div className="flex flex-col h-full overflow-y-auto">
                                {selectedSuggestion ? (
                                    <ResultsPanel 
                                        filteredSuggestions={filteredSuggestions}
                                        selectedSuggestion={selectedSuggestion}
                                        setSelectedSuggestion={setSelectedSuggestion}
                                        setSelectedLine={setSelectedLine}
                                        inputText={inputText}
                                        handleApplySuggestion={handleApplySuggestion}
                                        language={language}
                                        rateLimitError={false}
                                        projectId={project.id}
                                        accessToken={accessToken}
                                    />
                                ) : activeAiTab === 'AI集約表示' ? (
                                    <ConsolidatedView 
                                        issues={consolidatedIssues}
                                        onSuggestionSelect={setSelectedSuggestion}
                                    />
                                ) : (
                                    <ResultsPanel 
                                        filteredSuggestions={filteredSuggestions}
                                        selectedSuggestion={null}
                                        setSelectedSuggestion={setSelectedSuggestion}
                                        setSelectedLine={setSelectedLine}
                                        inputText={inputText}
                                        handleApplySuggestion={handleApplySuggestion}
                                        language={language}
                                        rateLimitError={false}
                                        projectId={project.id}
                                        accessToken={accessToken}
                                    />
                                )}
                                <SnykResults
                                    results={snykResults}
                                    isLoading={isSnykLoading}
                                    error={snykError}
                                    onClose={handleCloseSnykResults}
                                />
                            </div>
                        </Allotment.Pane>
                    </Allotment>
                </div>
            </main>
            
            <SnykScanModal
                isOpen={isSnykModalOpen}
                onClose={() => setIsSnykModalOpen(false)}
                onScan={handleTriggerSnykScan}
                language={language}
            />
        </div>
    );
};
export default ProjectDetailPage;