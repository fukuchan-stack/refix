import Editor from "@monaco-editor/react";

interface Props {
  code: string;
  onCodeChange: (code: string) => void;
  language?: string;
}

export const CodeEditor = ({ code, onCodeChange, language = 'typescript' }: Props) => {
  const handleEditorChange = (value: string | undefined) => {
    onCodeChange(value || "");
  };

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden shadow-sm">
      <Editor
        height="40vh" // 画面の高さの40%
        language={language}
        value={code}
        onChange={handleEditorChange}
        theme="vs-dark"
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          wordWrap: "on",
          scrollBeyondLastLine: false,
          automaticLayout: true,
        }}
      />
    </div>
  );
};