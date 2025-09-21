import React, { useRef, useEffect } from 'react';
import Editor, { Monaco } from '@monaco-editor/react';
import { editor } from 'monaco-editor';
import hljs from 'highlight.js/lib/core';
import toast from 'react-hot-toast';

import javascript from 'highlight.js/lib/languages/javascript';
import typescript from 'highlight.js/lib/languages/typescript';
import python from 'highlight.js/lib/languages/python';

hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('typescript', typescript);
hljs.registerLanguage('python', python);

interface CodeEditorProps {
    code: string;
    onCodeChange: (code: string) => void;
    language: string;
    selectedLine?: number | null;
    onLanguageChange: (language: string) => void;
}

export const CodeEditor: React.FC<CodeEditorProps> = ({ code, onCodeChange, language, selectedLine, onLanguageChange }) => {
    const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
    const monacoRef = useRef<Monaco | null>(null);
    const decorationRef = useRef<string[]>([]);

    const handleEditorDidMount = (editor: editor.IStandaloneCodeEditor, monaco: Monaco) => {
        editorRef.current = editor;
        monacoRef.current = monaco;

        editor.onDidPaste((e) => {
            const pastedText = editor.getModel()?.getValueInRange(e.range);
            if (pastedText) {
                const result = hljs.highlightAuto(pastedText);
                console.log(`Pasted content detected as: ${result.language} with relevance ${result.relevance}`);
                // ▼▼▼ 条件を > 5 から >= 5 に修正 ▼▼▼
                if (result.language && result.relevance >= 5 && result.language !== language) {
                    onLanguageChange(result.language);
                    toast.success(`${result.language}を検出しました。`, {
                        style: {
                            background: '#333',
                            color: '#fff',
                        },
                    });
                }
            }
        });
    };

    useEffect(() => {
        const handler = setTimeout(() => {
            if (code && code.length > 20) {
                const result = hljs.highlightAuto(code);
                console.log(`Debounced content detected as: ${result.language} with relevance ${result.relevance}`);
                // ▼▼▼ 条件を > 5 から >= 5 に修正 ▼▼▼
                if (result.language && result.relevance >= 5 && result.language !== language) {
                    onLanguageChange(result.language);
                }
            }
        }, 500);

        return () => {
            clearTimeout(handler);
        };
    }, [code, language, onLanguageChange]);


    useEffect(() => {
        const editor = editorRef.current;
        if (editor && monacoRef.current && selectedLine) {
            editor.revealLineInCenter(selectedLine, monacoRef.current.editor.ScrollType.Smooth);
            decorationRef.current = editor.deltaDecorations(decorationRef.current, [{
                range: new monacoRef.current.Range(selectedLine, 1, selectedLine, 1),
                options: {
                    isWholeLine: true,
                    className: 'bg-yellow-200 bg-opacity-40 dark:bg-yellow-700 dark:bg-opacity-40',
                    linesDecorationsClassName: 'border-l-4 border-yellow-400 dark:border-yellow-500',
                },
            }]);
        } else if (editor) {
            decorationRef.current = editor.deltaDecorations(decorationRef.current, []);
        }
    }, [selectedLine]);

    return (
        <div className="border rounded-md overflow-hidden h-full border-gray-300 dark:border-gray-700 flex flex-col">
            <div className="flex-1 min-h-0">
                <Editor
                    height="100%"
                    language={language}
                    value={code}
                    theme="vs-dark"
                    onChange={(value) => onCodeChange(value || '')}
                    onMount={handleEditorDidMount}
                    options={{
                        automaticLayout: true,
                        minimap: { enabled: false },
                        fontSize: 14,
                        wordWrap: 'on',
                        scrollBeyondLastLine: false,
                    }}
                />
            </div>
            <div className="bg-gray-100 dark:bg-gray-900 px-4 py-1 text-xs text-gray-600 dark:text-gray-400 border-t dark:border-gray-700">
                言語: {language}
            </div>
        </div>
    );
};