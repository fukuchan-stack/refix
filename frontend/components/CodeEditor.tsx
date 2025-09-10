import React, { useRef, useEffect } from 'react';
import Editor, { Monaco } from '@monaco-editor/react';
import { editor } from 'monaco-editor';

interface CodeEditorProps {
  code: string;
  onCodeChange: (code: string) => void;
  language: string;
  selectedLine?: number | null;
}

export const CodeEditor: React.FC<CodeEditorProps> = ({ code, onCodeChange, language, selectedLine }) => {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const decorationRef = useRef<string[]>([]);

  const handleEditorDidMount = (editor: editor.IStandaloneCodeEditor, monaco: Monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
  };

  useEffect(() => {
    const editor = editorRef.current;
    if (editor && monacoRef.current && selectedLine) {
      editor.revealLineInCenter(selectedLine, monacoRef.current.editor.ScrollType.Smooth);

      decorationRef.current = editor.deltaDecorations(
        decorationRef.current,
        [
          {
            range: new monacoRef.current.Range(selectedLine, 1, selectedLine, 1),
            options: {
              isWholeLine: true,
              // ▼ 変更点: ダークモード用のハイライト色を追加
              className: 'bg-yellow-200 bg-opacity-40 dark:bg-yellow-700 dark:bg-opacity-40',
              // ▼ 変更点: ダークモード用のハイライト色を追加
              linesDecorationsClassName: 'border-l-4 border-yellow-400 dark:border-yellow-500',
            },
          },
        ]
      );
    } else if (editor) {
      decorationRef.current = editor.deltaDecorations(decorationRef.current, []);
    }
  }, [selectedLine]);

  return (
    // ▼ 変更点: ダークモード用のボーダー色を追加
    <div className="border rounded-md overflow-hidden h-full border-gray-300 dark:border-gray-700">
      <Editor
        height="100%"
        language={language}
        value={code}
        // ▼ 変更点: エディタのテーマをダークに設定
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