import React, { useState, useEffect } from 'react';
import ReactDiffViewer from 'react-diff-viewer-continued';
import { useTheme } from 'next-themes';
import Link from 'next/link';

// --- 型定義 ---
interface Suggestion {
    id: string;
    model_name: string;
    category: string;
    description: string;
    line_number: number;
    suggestion: string;
}
// ★★★ 変更点①: テスト結果の型定義を追加 ★★★
interface TestResult {
    status: 'success' | 'failed' | 'error';
    output: string;
}

// --- コンポーネントが受け取るプロパティの型定義 ---
interface ResultsPanelProps {
    filteredSuggestions: Suggestion[];
    selectedSuggestion: Suggestion | null;
    setSelectedSuggestion: (suggestion: Suggestion | null) => void;
    setSelectedLine: (line: number | null) => void;
    inputText: string;
    handleApplySuggestion: () => void;
    language: string;
}

export const ResultsPanel: React.FC<ResultsPanelProps> = ({
    filteredSuggestions,
    selectedSuggestion,
    setSelectedSuggestion,
    setSelectedLine,
    inputText,
    handleApplySuggestion,
    language
}) => {
    const { theme } = useTheme();
    const [mounted, setMounted] = useState(false);
    useEffect(() => { setMounted(true); }, []);

    const [testCode, setTestCode] = useState<string | null>(null);
    const [isGeneratingTest, setIsGeneratingTest] = useState(false);

    // ★★★ 変更点②: テスト実行状態と結果を管理するStateを追加 ★★★
    const [isExecutingTest, setIsExecutingTest] = useState(false);
    const [testResult, setTestResult] = useState<TestResult | null>(null);


    const handleSuggestionClick = (suggestion: Suggestion) => {
        setSelectedSuggestion(suggestion);
        setSelectedLine(suggestion.line_number);
        setTestCode(null);
        setTestResult(null); // ★★★ 結果もリセット ★★★
    }

    const handleBackToList = () => {
        setSelectedSuggestion(null);
        setSelectedLine(null);
        setTestCode(null);
        setTestResult(null); // ★★★ 結果もリセット ★★★
    }

    const handleGenerateTest = async () => {
        if (!selectedSuggestion) return;

        setIsGeneratingTest(true);
        setTestCode(null);
        setTestResult(null); // ★★★ テスト生成時にも結果をリセット ★★★

        try {
            const response = await fetch('/api/tests/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-API-KEY': process.env.NEXT_PUBLIC_INTERNAL_API_KEY || '' },
                body: JSON.stringify({
                    original_code: inputText,
                    revised_code: selectedSuggestion.suggestion,
                    language: language,
                }),
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'テストコードの生成に失敗しました。');
            }
            const data = await response.json();
            setTestCode(data.test_code);
        } catch (error: any) {
            console.error('Test generation error:', error);
            setTestCode(`# エラーが発生しました:\n# ${error.message}`);
        } finally {
            setIsGeneratingTest(false);
        }
    };

    // ★★★ 変更点③: テスト実行APIを呼び出す関数を追加 ★★★
    const handleRunTest = async () => {
        if (!testCode || !selectedSuggestion) return;

        setIsExecutingTest(true);
        setTestResult(null);

        try {
            const response = await fetch('/api/tests/run', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-API-KEY': process.env.NEXT_PUBLIC_INTERNAL_API_KEY || '' },
                body: JSON.stringify({
                    test_code: testCode,
                    code_to_test: selectedSuggestion.suggestion, // テスト対象は「修正案」のコード
                }),
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'テストの実行に失敗しました。');
            }
            const resultData = await response.json();
            setTestResult(resultData);
        } catch (error: any) {
            console.error('Test execution error:', error);
            setTestResult({ status: 'error', output: `フロントエンドエラー:\n${error.message}` });
        } finally {
            setIsExecutingTest(false);
        }
    };

    // 結果表示用のスタイルを定義
    const resultStyles = {
        success: 'bg-green-100 dark:bg-green-900 border-green-500 text-green-800 dark:text-green-200',
        failed: 'bg-red-100 dark:bg-red-900 border-red-500 text-red-800 dark:text-red-200',
        error: 'bg-yellow-100 dark:bg-yellow-900 border-yellow-500 text-yellow-800 dark:text-yellow-200',
    };


    if (selectedSuggestion) {
        return (
            <div className="flex-1 overflow-y-auto p-4 h-full">
                <button onClick={handleBackToList} className="text-sm text-blue-600 dark:text-blue-400 hover:underline mb-4">&larr; リストに戻る</button>
                <div>
                    <h3 className="font-bold text-lg text-gray-900 dark:text-gray-100">選択中の指摘</h3>
                    <p className="text-sm text-gray-700 dark:text-gray-300 mt-2 mb-4 whitespace-pre-wrap">{selectedSuggestion.description}</p>
                    
                    {selectedSuggestion.suggestion && mounted && (
                        <div>
                            <h4 className="font-semibold text-md mb-1 text-gray-900 dark:text-gray-100">修正案 (差分表示):</h4>
                            <div className="border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden text-sm">
                                <ReactDiffViewer oldValue={inputText} newValue={selectedSuggestion.suggestion} splitView={false} useDarkTheme={theme === 'dark'} leftTitle="現在のコード" rightTitle="修正案" />
                            </div>
                            
                            <div className="mt-4 flex items-center gap-2">
                                <button onClick={handleApplySuggestion} className="bg-green-500 hover:bg-green-600 text-white font-bold py-1 px-3 text-sm rounded">✅ この修正を適用</button>
                                <button onClick={handleGenerateTest} className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-1 px-3 text-sm rounded disabled:bg-gray-400 disabled:cursor-not-allowed" disabled={isGeneratingTest}>
                                    {isGeneratingTest ? '生成中...' : '▶️ テストを生成して検証'}
                                </button>
                            </div>

                            {isGeneratingTest && ( <div className="mt-4 p-4 text-sm text-center text-gray-500 dark:text-gray-400">AIがテストコードを生成しています...</div> )}

                            {/* ★★★ 変更点④: テスト実行ボタンと結果表示エリアを追加 ★★★ */}
                            {testCode && (
                                <div className="mt-4">
                                    <h4 className="font-semibold text-md mb-1 text-gray-900 dark:text-gray-100">生成されたテストコード:</h4>
                                    <div className="bg-gray-900 text-white p-4 rounded-md text-sm overflow-x-auto">
                                        <pre><code>{testCode}</code></pre>
                                    </div>
                                    <button 
                                        onClick={handleRunTest}
                                        disabled={isExecutingTest}
                                        className="mt-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-1 px-3 text-sm rounded disabled:bg-gray-400 disabled:cursor-not-allowed"
                                    >
                                        {isExecutingTest ? '実行中...' : 'このテストを実行'}
                                    </button>
                                </div>
                            )}
                            
                            {isExecutingTest && ( <div className="mt-4 p-4 text-sm text-center text-gray-500 dark:text-gray-400">サンドボックス環境でテストを実行しています...</div> )}

                            {testResult && (
                                <div className="mt-4">
                                    <h4 className="font-semibold text-md mb-1 text-gray-900 dark:text-gray-100">テスト実行結果:</h4>
                                    <div className={`border-l-4 p-4 rounded-r-lg ${resultStyles[testResult.status]}`}>
                                        <p className="font-bold text-lg mb-2">
                                            {testResult.status === 'success' && '✅ テスト成功'}
                                            {testResult.status === 'failed' && '❌ テスト失敗'}
                                            {testResult.status === 'error' && '⚠️ エラー'}
                                        </p>
                                        <div className="bg-black bg-opacity-70 text-white p-3 rounded-md text-xs overflow-x-auto">
                                          <pre><code>{testResult.output}</code></pre>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        )
    }

    return (
        // --- リスト表示 (変更なし) ---
        <div className="flex-1 overflow-y-auto p-4 space-y-3 h-full">{/* ... */}</div>
    );
};