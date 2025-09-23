import React, { useState, useEffect, Fragment } from 'react';
import ReactDiffViewer from 'react-diff-viewer-continued';
import { useTheme } from 'next-themes';
import { Listbox, Transition } from '@headlessui/react';
import { FiCheck, FiChevronDown, FiInfo } from 'react-icons/fi';
import ChatBox from './ChatBox';
import { continueChat } from '../lib/api';

// --- 型定義 ---
interface Suggestion {
    id: string;
    model_name: string;
    category: string;
    description: string;
    line_number: number;
    suggestion: string;
}
interface TestResult {
    status: 'success' | 'failed' | 'error';
    output: string;
}
interface Message {
  role: 'user' | 'assistant';
  content: string;
}
interface ResultsPanelProps {
    filteredSuggestions: Suggestion[];
    selectedSuggestion: Suggestion | null;
    setSelectedSuggestion: (suggestion: Suggestion | null) => void;
    setSelectedLine: (line: number | null) => void;
    inputText: string;
    handleApplySuggestion: () => void;
    language: string; 
    rateLimitError: boolean;
    projectId?: number;
    accessToken: string | null;
}

const languageOptions = [
    { value: 'python', label: 'Python' },
    { value: 'typescript', label: 'TypeScript' },
    { value: 'javascript', label: 'JavaScript' },
];

export const ResultsPanel: React.FC<ResultsPanelProps> = ({
    filteredSuggestions,
    selectedSuggestion,
    setSelectedSuggestion,
    setSelectedLine,
    inputText,
    handleApplySuggestion,
    language,
    rateLimitError,
    projectId,
    accessToken
}) => {
    const { theme } = useTheme();
    const [mounted, setMounted] = useState(false);
    useEffect(() => { setMounted(true); }, []);

    const [testCode, setTestCode] = useState<string | null>(null);
    const [isGeneratingTest, setIsGeneratingTest] = useState(false);
    const [isExecutingTest, setIsExecutingTest] = useState(false);
    const [testResult, setTestResult] = useState<TestResult | null>(null);
    const [selectedLanguage, setSelectedLanguage] = useState(language);

    const [chatHistory, setChatHistory] = useState<Message[]>([]);
    const [isChatLoading, setIsChatLoading] = useState(false);

    const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

    useEffect(() => {
        setSelectedLanguage(language);
    }, [language]);

    const handleSuggestionClick = (suggestion: Suggestion) => {
        setSelectedSuggestion(suggestion);
        setSelectedLine(suggestion.line_number);
    }

    const handleBackToList = () => {
        setSelectedSuggestion(null);
        setSelectedLine(null);
    }
    
    useEffect(() => {
        if (selectedSuggestion) {
            const initialAssistantMessage = `指摘事項「${selectedSuggestion.description}」についてですね。どのような情報が必要ですか？`;
            setChatHistory([{ role: 'assistant', content: initialAssistantMessage }]);
        } else {
            setChatHistory([]);
        }
        setTestCode(null);
        setTestResult(null);
    }, [selectedSuggestion]);


    const handleGenerateTest = async () => {
        if (!selectedSuggestion || !accessToken) return;
        setIsGeneratingTest(true);
        setTestCode(null);
        setTestResult(null);
        try {
            const response = await fetch(`${apiBaseUrl}/api/tests/generate`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json', 
                    'Authorization': `Bearer ${accessToken}`
                },
                body: JSON.stringify({
                    original_code: inputText,
                    revised_code: selectedSuggestion.suggestion,
                    language: selectedLanguage,
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

    const handleRunTest = async () => {
        if (!testCode || !selectedSuggestion || !accessToken) return;
        setIsExecutingTest(true);
        setTestResult(null);
        try {
            const response = await fetch(`${apiBaseUrl}/api/tests/run`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`
                },
                body: JSON.stringify({
                    test_code: testCode,
                    code_to_test: selectedSuggestion.suggestion,
                    language: selectedLanguage,
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

    const handleSendMessage = async (userMessage: string) => {
        if (!selectedSuggestion || !projectId || !accessToken) {
            alert("プロジェクト情報または認証情報が不足しています。");
            return;
        }
        
        const newHistory: Message[] = [...chatHistory, { role: 'user', content: userMessage }];
        setChatHistory(newHistory);
        setIsChatLoading(true);

        try {
            const context = `
            【元のコード】
            \`\`\`${language}
            ${inputText}
            \`\`\`

            【AIからのレビュー内容】
            - モデル: ${selectedSuggestion.model_name}
            - カテゴリ: ${selectedSuggestion.category}
            - 行番号: ${selectedSuggestion.line_number}
            - 指摘: ${selectedSuggestion.description}
            - 修正案: 
            \`\`\`${language}
            ${selectedSuggestion.suggestion}
            \`\`\`
            `;

            const historyWithContext = [
                { role: 'user', content: context },
                ...newHistory
            ];
            
            const response = await continueChat(accessToken, historyWithContext, projectId);
            setChatHistory(prev => [...prev, { role: 'assistant', content: response.response }]);

        } catch (error: any) {
            setChatHistory(prev => [...prev, { role: 'assistant', content: `エラーが発生しました: ${error.message}` }]);
        } finally {
            setIsChatLoading(false);
        }
    };

    const resultStyles = {
        success: 'bg-green-100 dark:bg-green-900/50 border-green-500 text-green-800 dark:text-green-200',
        failed: 'bg-red-100 dark:bg-red-900/50 border-red-500 text-red-800 dark:text-red-200',
        error: 'bg-yellow-100 dark:bg-yellow-900/50 border-yellow-500 text-yellow-800 dark:text-yellow-200',
    };

    if (rateLimitError) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-center p-4 bg-yellow-100 dark:bg-yellow-900/50 rounded-lg border border-yellow-500/50">
                <h3 className="text-lg font-bold text-yellow-800 dark:text-yellow-200">APIの使用回数制限に達しました</h3>
                <p className="mt-2 text-sm text-yellow-700 dark:text-yellow-300">
                    デモ版でのご利用は1日5回までとなっております。
                </p>
            </div>
        );
    }

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

                            <div className="my-4">
                                <Listbox value={selectedLanguage} onChange={setSelectedLanguage}>
                                    <div className="relative w-full max-w-xs">
                                        <Listbox.Label className="block text-sm font-medium text-gray-400 mb-1">
                                            テスト実行言語
                                        </Listbox.Label>
                                        <Listbox.Button className="relative w-full cursor-default rounded-md bg-gray-50 dark:bg-gray-900 py-2 pl-3 pr-10 text-left shadow-sm border border-gray-300 dark:border-gray-700 focus:outline-none focus-visible:border-indigo-500 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-75 focus-visible:ring-offset-2 focus-visible:ring-offset-orange-300 sm:text-sm">
                                            <span className="block truncate text-gray-900 dark:text-white">{languageOptions.find(l => l.value === selectedLanguage)?.label}</span>
                                            <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                                                <FiChevronDown className="h-5 w-5 text-gray-400" aria-hidden="true" />
                                            </span>
                                        </Listbox.Button>
                                        <Transition as={Fragment} leave="transition ease-in duration-100" leaveFrom="opacity-100" leaveTo="opacity-0">
                                            <Listbox.Options className="absolute mt-1 max-h-60 w-full overflow-auto rounded-md bg-white dark:bg-gray-800 py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm z-10">
                                                {languageOptions.map((lang, langIdx) => (
                                                    <Listbox.Option key={langIdx} className={({ active }) => `relative cursor-default select-none py-2 pl-10 pr-4 ${ active ? 'bg-blue-100 text-blue-900 dark:bg-blue-900 dark:text-blue-100' : 'text-gray-900 dark:text-gray-100' }`} value={lang.value} >
                                                        {({ selected }) => (
                                                            <>
                                                                <span className={`block truncate ${ selected ? 'font-medium' : 'font-normal' }`}>
                                                                    {lang.label}
                                                                </span>
                                                                {selected ? (
                                                                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-blue-600 dark:text-blue-400">
                                                                        <FiCheck className="h-5 w-5" aria-hidden="true" />
                                                                    </span>
                                                                ) : null}
                                                            </>
                                                        )}
                                                    </Listbox.Option>
                                                ))}
                                            </Listbox.Options>
                                        </Transition>
                                    </div>
                                </Listbox>
                            </div>
                            
                            <div className="mt-4 flex items-center gap-2">
                                <button onClick={handleApplySuggestion} className="bg-green-500 hover:bg-green-600 text-white font-bold py-1 px-3 text-sm rounded">✅ この修正を適用</button>
                                <button onClick={handleGenerateTest} className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-1 px-3 text-sm rounded disabled:bg-gray-400 disabled:cursor-not-allowed" disabled={isGeneratingTest}>
                                    {isGeneratingTest ? '生成中...' : '▶️ テストを生成して検証'}
                                </button>
                            </div>

                            {isGeneratingTest && ( <div className="mt-4 p-4 text-sm text-center text-gray-500 dark:text-gray-400">AIがテストコードを生成しています...</div> )}

                            {testCode && (
                                <div className="mt-4">
                                    <h4 className="font-semibold text-md mb-1 text-gray-900 dark:text-gray-100">生成されたテストコード:</h4>
                                    <div className="bg-gray-900 text-white p-4 rounded-md text-sm overflow-x-auto">
                                        <pre><code>{testCode}</code></pre>
                                    </div>
                                    <button onClick={handleRunTest} disabled={isExecutingTest}
                                        className="mt-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-1 px-3 text-sm rounded disabled:bg-gray-400 disabled:cursor-not-allowed">
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
                            
                            <ChatBox
                                chatHistory={chatHistory}
                                onSendMessage={handleSendMessage}
                                isChatLoading={isChatLoading}
                            />
                        </div>
                    )}
                </div>
            </div>
        )
    }

    return (
        <div className="flex-1 overflow-y-auto p-4 space-y-3 h-full">
            {filteredSuggestions.map((s) => (
                <div key={s.id} onClick={() => handleSuggestionClick(s)} className={`border rounded-lg p-3 text-sm cursor-pointer transition-all dark:border-gray-800 bg-gray-50 dark:bg-black hover:bg-gray-100 dark:hover:bg-gray-900`}>
                    <p className="font-bold text-gray-800 dark:text-gray-200">{s.category}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">by {s.model_name}</p>
                    <p className="text-gray-700 dark:text-gray-300 truncate">{s.description}</p>
                </div>
            ))}
            {(filteredSuggestions.length === 0 && !rateLimitError) && <p className="text-sm text-gray-500 dark:text-gray-400 p-4 text-center">該当する指摘事項はありません。</p>}
        </div>
    );
};