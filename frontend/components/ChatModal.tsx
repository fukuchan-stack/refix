import { useState, useEffect, FormEvent, MouseEvent } from 'react';
import { Panel } from './ReviewDashboard';

// DBから取得するChatMessageの型
interface ChatMessage {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  reviewId: number;
  panel: Panel;
  initialMessages: ChatMessage[];
}

export const ChatModal = ({ isOpen, onClose, reviewId, panel, initialMessages }: Props) => {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  const apiKey = process.env.NEXT_PUBLIC_INTERNAL_API_KEY;

  useEffect(() => {
    if (isOpen) {
      const chatHistory = document.getElementById('chat-history');
      if (chatHistory) {
        chatHistory.scrollTop = chatHistory.scrollHeight;
      }
    }
  }, [isOpen, messages]);

  const handleSendMessage = async (e: FormEvent) => {
    e.preventDefault();
    if (!userInput.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now(), // 一時的なID
      role: 'user',
      content: userInput,
      created_at: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setUserInput('');
    setIsLoading(true);

    try {
      // ▼▼▼ パスを修正 ▼▼▼
      const res = await fetch(`${apiBaseUrl}/api/reviews/${reviewId}/chat`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-API-Key': apiKey || ''
        },
        body: JSON.stringify({
          user_message: userInput,
          original_review_context: `Title: ${panel.title}\nDetails: ${panel.details}`,
        }),
      });

      if (res.ok) {
        const newAssistantMessage: ChatMessage = await res.json();
        setMessages(prev => [...prev, newAssistantMessage]);
      } else {
        const errorResponse = { id: Date.now(), role: 'assistant', content: 'エラーが発生しました。', created_at: new Date().toISOString() };
        setMessages(prev => [...prev, errorResponse]);
      }
    } catch (error) {
      const errorResponse = { id: Date.now(), role: 'assistant', content: '通信エラーが発生しました。', created_at: new Date().toISOString() };
      setMessages(prev => [...prev, errorResponse]);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleOverlayClick = (e: MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div onClick={handleOverlayClick} className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-2xl w-full max-w-2xl h-[80vh] flex flex-col text-gray-900 dark:text-gray-100">
        <div className="p-4 border-b dark:border-gray-700 relative">
          <h3 className="text-lg font-bold">AIメンターとの対話</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">トピック: {panel.title}</p>
          <button onClick={onClose} className="absolute top-3 right-4 text-2xl font-bold hover:text-gray-700 dark:hover:text-gray-300">&times;</button>
        </div>
        <div id="chat-history" className="flex-1 p-4 overflow-y-auto space-y-4">
          {messages.map(msg => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-xl p-3 rounded-lg shadow ${msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-black dark:text-white'}`}>
                <div className="whitespace-pre-wrap">{msg.content}</div>
              </div>
            </div>
          ))}
          {isLoading && 
            <div className="flex justify-start">
              <div className="max-w-lg p-3 rounded-lg shadow bg-gray-200 dark:bg-gray-700 text-black dark:text-white">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse"></div>
                  <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse delay-75"></div>
                  <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse delay-150"></div>
                </div>
              </div>
            </div>
          }
        </div>
        <div className="p-4 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <textarea
              value={userInput}
              onChange={e => setUserInput(e.target.value)}
              placeholder="質問を入力してください..."
              className="flex-1 p-2 border rounded-md resize-none focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white dark:bg-gray-800 dark:border-gray-600"
              rows={2}
              disabled={isLoading}
            />
            <button type="submit" disabled={isLoading} className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-md disabled:bg-gray-400 transition-colors">
              送信
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};