import React, { useRef, useEffect } from 'react';
import Editor, { Monaco } from '@monaco-editor/react';
import { editor } from 'monaco-editor';
import hljs from 'highlight.js';

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
                if (result.language && result.relevance > 20) {
                    onLanguageChange(result.language);
                }
            }
        });
    };

    useEffect(() => {
        const handler = setTimeout(() => {
            if (code && code.length > 50) {
                const result = hljs.highlightAuto(code);
                console.log(`Debounced content detected as: ${result.language} with relevance ${result.relevance}`);
                if (result.language && result.relevance > 10 && result.language !== language) {
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
        <div className="border rounded-md overflow-hidden h-full border-gray-300 dark:border-gray-700">
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
    );
};