import React, { useEffect, useRef, useState } from 'react';
import 'highlight.js/styles/github.css';
import hljs from 'highlight.js';
import Link from 'next/link';

// (型定義は変更なし)
interface Review { id: number; code_snippet: string; review_content: string; created_at: string; language?: string; project_id?: number; }
interface ChatViewProps {
  reviews: Review[];
  onGenerateReview: (code: string, language: string, mode: string) => Promise<void>;
  isGeneratingReview: boolean;
  projectId: number;
}

export const ChatView: React.FC<ChatViewProps> = ({
  reviews,
  onGenerateReview,
  isGeneratingReview,
  projectId
}) => {
  const [inputText, setInputText] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [reviews]);
  
  useEffect(() => {
    document.querySelectorAll('pre code').forEach((block) => hljs.highlightElement(block as HTMLElement));
  }, [reviews]);

  const handleSubmit = () => {
    if (!inputText.trim()) return;

    // ★ 修正点2: 正規表現をより柔軟なものに変更
    const codeBlockRegex = /```(\w*)\s*([\s\S]*?)```/;
    const match = inputText.match(codeBlockRegex);

    if (match) {
      const language = match[1] || 'auto';
      const code = match[2].trim();
      
      if(code) {
        onGenerateReview(code, language, 'balanced');
        setInputText('');
      } else {
        alert('コードブロック内にレビューしてほしいコードを記述してください。');
      }
    } else {
      // ★ 修正点1: alert内のプロジェクト名を修正
      alert("コードレビューを依頼する際は、レビューしたいコードをバッククォート3つ（```）で囲んで送信してください。\n\n例:\n```python\nprint('Hello, Refix!')\n```");
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-200px)] bg-gray-50 border rounded-lg shadow-inner">
      {/* 1. チャット履歴表示エリア */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {reviews.map((review, index) => (
          <React.Fragment key={index}>
            <div className="flex flex-col items-end">
              <pre className="bg-white rounded-lg p-3 max-w-2xl shadow border text-sm overflow-x-auto"><code className={`language-${review.language || 'plaintext'}`}>{review.code_snippet}</code></pre>
            </div>
            <div className="flex flex-col items-start">
              <div className="bg-indigo-100 rounded-lg p-3 max-w-2xl shadow border text-sm">
                <p>AIによるレビューが生成されました。詳細は<Link href={`/projects/${projectId}/history`} legacyBehavior><a className="text-indigo-600 font-bold hover:underline">履歴ページ</a></Link>で確認できます。</p>
              </div>
            </div>
          </React.Fragment>
        ))}
        {isGeneratingReview && (
            <div className="flex justify-center items-center p-4">
                <p className="text-gray-500">AIがレビューを生成中です...</p>
            </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* 2. テキスト入力エリア */}
      <div className="border-t p-4 bg-white">
        <div className="w-full max-w-4xl mx-auto flex items-center space-x-2">
          <textarea
            className="flex-1 p-2 border rounded-md resize-none"
            rows={2}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="レビューしてほしいコードを ``` で囲んで入力してください..."
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
          />
          <button
            onClick={handleSubmit}
            disabled={isGeneratingReview || !inputText.trim()}
            className="bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-indigo-700 disabled:bg-gray-400"
          >
            送信
          </button>
        </div>
      </div>
    </div>
  );
};