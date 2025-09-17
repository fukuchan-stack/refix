import React, { useRef, useEffect } from 'react';
import Editor, { Monaco } from '@monaco-editor/react';
import { editor } from 'monaco-editor';
import hljs from 'highlight.js'; // ★★★ 変更点①: highlight.jsをインポート ★★★

interface CodeEditorProps {
    code: string;
    onCodeChange: (code: string) => void;
    language: string;
    selectedLine?: number | null;
    onLanguageChange: (language: string) => void; // ★★★ 変更点②: 新しいPropsを追加 ★★★
}

export const CodeEditor: React.FC<CodeEditorProps> = ({ code, onCodeChange, language, selectedLine, onLanguageChange }) => {
    const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
    const monacoRef = useRef<Monaco | null>(null);
    const decorationRef = useRef<string[]>([]);

    const handleEditorDidMount = (editor: editor.IStandaloneCodeEditor, monaco: Monaco) => {
        editorRef.current = editor;
        monacoRef.current = monaco;

        // ★★★ 変更点③: 貼り付け時に言語を即時判定するリスナーを追加 ★★★
        editor.onDidPaste((e) => {
            const pastedText = editor.getModel()?.getValueInRange(e.range);
            if (pastedText) {
                const result = hljs.highlightAuto(pastedText);
                console.log(`Pasted content detected as: ${result.language} with relevance ${result.relevance}`);
                if (result.language && result.relevance > 20) { // 関連性が高い場合のみ
                    onLanguageChange(result.language);
                }
            }
        });
    };

    // ★★★ 変更点④: コード変更時に言語を自動検出するロジック(デバウンス付き)を追加 ★★★
    useEffect(() => {
        // ユーザーのタイピングが500ミリ秒止まったら実行
        const handler = setTimeout(() => {
            if (code && code.length > 50) { // 50文字以上ある場合のみ判定
                const result = hljs.highlightAuto(code);
                console.log(`Debounced content detected as: ${result.language} with relevance ${result.relevance}`);
                // 関連性が高く(relevance > 10)、かつ現在の言語と異なる場合のみ更新
                if (result.language && result.relevance > 10 && result.language !== language) {
                    onLanguageChange(result.language);
                }
            }
        }, 500);

        // 次のコード変更があったら、前のタイマーをキャンセルする（デバウンス処理）
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