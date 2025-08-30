import { useState } from 'react';
import { ChatModal } from './ChatModal'; // ChatModalをインポート

// DBから取得するChatMessageの型
interface ChatMessage {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

// DBから取得するReviewの型
interface Review {
  id: number;
  review_content: string;
  created_at: string;
  chat_messages: ChatMessage[];
}

// パース後のPanelの型
export interface Panel {
  category: string;
  file_name: string;
  line_number: number;
  title: string;
  details: string;
}

export interface ParsedReview {
  overall_score: number;
  panels: Panel[];
}

interface Props {
  review: Review; // ★ reviewContentからreviewオブジェクト全体を受け取るように変更
}

const categoryStyles: { [key: string]: { icon: string; color: string } } = {
  Bug: { icon: '🐛', color: 'border-red-500' },
  Security: { icon: '🛡️', color: 'border-yellow-500' },
  Performance: { icon: '⚡', color: 'border-blue-500' },
  Quality: { icon: '🎨', color: 'border-green-500' },
  Error: { icon: '❌', color: 'border-gray-500' },
  Default: { icon: '📝', color: 'border-gray-400' },
};

export const ReviewDashboard = ({ review }: Props) => {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [selectedPanel, setSelectedPanel] = useState<Panel | null>(null);

  const handleOpenChat = (panel: Panel) => {
    setSelectedPanel(panel);
    setIsChatOpen(true);
  };
  
  // JSON.parseは一度だけ実行
  let parsedContent: ParsedReview | null = null;
  let isLegacy = false;
  try {
    parsedContent = JSON.parse(review.review_content);
  } catch (error) {
    isLegacy = true;
  }

  if (isLegacy) {
    return (
      <div>
        <h4 className="text-lg font-semibold mb-2">📝 Legacy Review</h4>
        <p className="text-gray-700 whitespace-pre-wrap">{review.review_content}</p>
      </div>
    );
  }

  if (!parsedContent) {
    return <div>Loading review...</div>;
  }
  
  const scoreColor = parsedContent.overall_score >= 80 ? 'text-green-500' : parsedContent.overall_score >= 60 ? 'text-yellow-500' : 'text-red-500';

  return (
    <>
      <div>
        <div className="mb-6 text-center">
          <h3 className="text-lg font-semibold text-gray-600">Overall Score</h3>
          <p className={`text-6xl font-bold ${scoreColor}`}>{parsedContent.overall_score}</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {parsedContent.panels.map((panel, index) => (
            <div key={index} className={`bg-gray-50 rounded-lg p-4 border-l-4 ${categoryStyles[panel.category]?.color || categoryStyles.Default.color} flex flex-col`}>
              <div>
                <h4 className="text-lg font-semibold mb-1">{categoryStyles[panel.category]?.icon || categoryStyles.Default.icon} {panel.title}</h4>
                <div className="text-xs text-gray-500 mb-2 font-mono bg-gray-200 inline-block px-2 py-1 rounded">
                  {panel.file_name} (line: {panel.line_number})
                </div>
                <p className="text-gray-700 whitespace-pre-wrap flex-1">{panel.details}</p>
              </div>
              <button onClick={() => handleOpenChat(panel)} className="mt-4 text-sm text-blue-600 hover:underline self-start">
                AIメンターに質問する →
              </button>
            </div>
          ))}
        </div>
      </div>
      {isChatOpen && selectedPanel && (
        <ChatModal
          isOpen={isChatOpen}
          onClose={() => setIsChatOpen(false)}
          reviewId={review.id}
          panel={selectedPanel}
          initialMessages={review.chat_messages}
        />
      )}
    </>
  );
};