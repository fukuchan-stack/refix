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


    const handleSuggestionClick = (suggestion: Suggestion) => {
        setSelectedSuggestion(suggestion);
        setSelectedLine(suggestion.line_number);
        setTestCode(null); // 新しい指摘を選択したらテストコードをリセット
    }

    const handleBackToList = () => {
        setSelectedSuggestion(null);
        setSelectedLine(null);
        setTestCode(null); // リストに戻る時もテストコードをリセット
    }

    const handleGenerateTest = async () => {
        if (!selectedSuggestion) return;

        setIsGeneratingTest(true);
        setTestCode(null); // 前回の結果をクリア

        try {
            const response = await fetch('/api/tests/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    // フロントエンドから内部APIを呼び出すためのAPIキー
                    'X-API-KEY': process.env.NEXT_PUBLIC_INTERNAL_API_KEY || '',
                },
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


    // 詳細表示が選択されているかどうかに基づいて表示を切り替える
    if (selectedSuggestion) {
        return (
            // --- 詳細表示 ---
            <div className="flex-1 overflow-y-auto p-4 h-full">
                <button onClick={handleBackToList} className="text-sm text-blue-600 dark:text-blue-400 hover:underline mb-4">
                    &larr; リストに戻る
                </button>
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
                                <button 
                                    onClick={handleGenerateTest} 
                                    className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-1 px-3 text-sm rounded disabled:bg-gray-400 disabled:cursor-not-allowed"
                                    disabled={isGeneratingTest}
                                >
                                    {isGeneratingTest ? '生成中...' : '▶️ テストを実行して検証'}
                                </button>
                            </div>

                            {isGeneratingTest && (
                                <div className="mt-4 p-4 text-sm text-center text-gray-500 dark:text-gray-400">
                                    AIがテストコードを生成しています...
                                </div>
                            )}

                            {testCode && (
                                <div className="mt-4">
                                    <h4 className="font-semibold text-md mb-1 text-gray-900 dark:text-gray-100">生成されたテストコード:</h4>
                                    <div className="bg-gray-900 text-white p-4 rounded-md text-sm overflow-x-auto">
                                        <pre><code>{testCode}</code></pre>
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
        // --- リスト表示 ---
        <div className="flex-1 overflow-y-auto p-4 space-y-3 h-full">
            {filteredSuggestions.map((s) => (
                <div key={s.id} onClick={() => handleSuggestionClick(s)} className={`border rounded-lg p-3 text-sm cursor-pointer transition-all dark:border-gray-800 bg-gray-50 dark:bg-black hover:bg-gray-100 dark:hover:bg-gray-900`}>
                    <p className="font-bold text-gray-800 dark:text-gray-200">{s.category}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">by {s.model_name}</p>
                    <p className="text-gray-700 dark:text-gray-300 truncate">{s.description}</p>
                </div>
            ))}
            {filteredSuggestions.length === 0 && <p className="text-sm text-gray-500 dark:text-gray-400 p-4 text-center">該当する指摘事項はありません。</p>}
        </div>
    );
};