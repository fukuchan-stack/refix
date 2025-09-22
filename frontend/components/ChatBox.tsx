// frontend/components/ChatBox.tsx

import { useState } from 'react';
import { FiSend } from 'react-icons/fi';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatBoxProps {
  chatHistory: Message[];
  onSendMessage: (message: string) => void;
  isChatLoading: boolean;
}

const ChatBox: React.FC<ChatBoxProps> = ({ chatHistory, onSendMessage, isChatLoading }) => {
  const [userInput, setUserInput] = useState('');

  const handleSend = () => {
    if (userInput.trim() && !isChatLoading) {
      onSendMessage(userInput);
      setUserInput('');
    }
  };

  return (
    <div className="mt-6 bg-gray-800 p-4 rounded-lg">
      <h4 className="text-sm font-semibold text-gray-300 mb-3">AIに質問する</h4>
      <div className="space-y-4 max-h-60 overflow-y-auto pr-2">
        {chatHistory.map((msg, index) => (
          <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-xs md:max-w-md lg:max-w-lg rounded-lg px-3 py-2 text-sm ${
              msg.role === 'user' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-700 text-gray-200'
            }`}>
              <p className="whitespace-pre-wrap">{msg.content}</p>
            </div>
          </div>
        ))}
        {isChatLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-700 text-gray-400 rounded-lg px-3 py-2 text-sm">
              <span className="animate-pulse">Typing...</span>
            </div>
          </div>
        )}
      </div>
      <div className="mt-4 flex">
        <input
          type="text"
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="レビューについて質問..."
          className="flex-grow bg-gray-900 border border-gray-700 rounded-l-md text-sm p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          disabled={isChatLoading}
        />
        <button
          onClick={handleSend}
          disabled={isChatLoading}
          className="bg-blue-600 px-4 py-2 rounded-r-md hover:bg-blue-700 disabled:bg-gray-500"
        >
          <FiSend />
        </button>
      </div>
    </div>
  );
};

export default ChatBox;