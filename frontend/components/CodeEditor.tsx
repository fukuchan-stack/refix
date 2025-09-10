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
              className: 'bg-yellow-200 bg-opacity-40',
              linesDecorationsClassName: 'border-l-4 border-yellow-400',
            },
          },
        ]
      );
    } else if (editor) {
      decorationRef.current = editor.deltaDecorations(decorationRef.current, []);
    }
  }, [selectedLine]);

  return (
    <div className="border rounded-md overflow-hidden h-full">
      <Editor
        height="100%"
        language={language}
        value={code}
        onChange={(value) => onCodeChange(value || '')}
        onMount={handleEditorDidMount}
        options={{
          // ▼▼▼ 修正箇所 ▼▼▼
          automaticLayout: true,
          // ▲▲▲ 修正箇所 ▲▲▲
          minimap: { enabled: false },
          fontSize: 14,
          wordWrap: 'on',
          scrollBeyondLastLine: false,
        }}
      />
    </div>
  );
};