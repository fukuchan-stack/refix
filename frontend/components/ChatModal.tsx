import { useState, useEffect, FormEvent, MouseEvent } from 'react'; // ★ MouseEvent をインポート
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
      const res = await fetch(`http://localhost:8000/reviews/${reviewId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
  
  // ★ 外側の暗い部分をクリックしたときに閉じる処理
  const handleOverlayClick = (e: MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div onClick={handleOverlayClick} className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl h-[80vh] flex flex-col">
        {/* ★ 親要素に relative クラスを追加 */}
        <div className="p-4 border-b relative">
          <h3 className="text-lg font-bold">AIメンターとの対話</h3>
          <p className="text-sm text-gray-600">トピック: {panel.title}</p>
          <button onClick={onClose} className="absolute top-3 right-4 text-2xl font-bold hover:text-gray-700">&times;</button>
        </div>
        <div id="chat-history" className="flex-1 p-4 overflow-y-auto space-y-4">
          {messages.map(msg => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-xl p-3 rounded-lg shadow ${msg.role === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-black'}`}>
                <div className="whitespace-pre-wrap">{msg.content}</div>
              </div>
            </div>
          ))}
          {isLoading && 
            <div className="flex justify-start">
              <div className="max-w-lg p-3 rounded-lg shadow bg-gray-200 text-black">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse"></div>
                  <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse delay-75"></div>
                  <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse delay-150"></div>
                </div>
              </div>
            </div>
          }
        </div>
        <div className="p-4 border-t bg-gray-50">
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <textarea
              value={userInput}
              onChange={e => setUserInput(e.target.value)}
              placeholder="質問を入力してください..."
              className="flex-1 p-2 border rounded-md resize-none focus:ring-2 focus:ring-blue-500 focus:outline-none"
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