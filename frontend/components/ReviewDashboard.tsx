import { useEffect, useState } from 'react';

// ★変更点1: file_nameとline_numberを型定義に追加
interface Panel {
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
  reviewContent: string;
}

// カテゴリごとのスタイルを定義
const categoryStyles: { [key: string]: { icon: string; color: string } } = {
  Bug: { icon: '🐛', color: 'border-red-500' },
  Security: { icon: '🛡️', color: 'border-yellow-500' },
  Performance: { icon: '⚡', color: 'border-blue-500' },
  Quality: { icon: '🎨', color: 'border-green-500' },
  Error: { icon: '❌', color: 'border-gray-500' },
  Default: { icon: '📝', color: 'border-gray-400' },
};

export const ReviewDashboard = ({ reviewContent }: Props) => {
  const [parsedContent, setParsedContent] = useState<ParsedReview | null>(null);
  const [isLegacy, setIsLegacy] = useState(false);

  useEffect(() => {
    try {
      const content = JSON.parse(reviewContent);
      setParsedContent(content);
      setIsLegacy(false);
    } catch (error) {
      console.log("Could not parse JSON, treating as legacy plain text review.");
      setIsLegacy(true);
    }
  }, [reviewContent]);

  if (isLegacy) {
    return (
      <div>
        <h4 className="text-lg font-semibold mb-2">📝 Legacy Review</h4>
        <p className="text-gray-700 whitespace-pre-wrap">{reviewContent}</p>
      </div>
    );
  }

  if (!parsedContent) {
    return <div>Loading review...</div>;
  }

  const scoreColor = parsedContent.overall_score >= 80 ? 'text-green-500' : parsedContent.overall_score >= 60 ? 'text-yellow-500' : 'text-red-500';

  return (
    <div>
      <div className="mb-6 text-center">
        <h3 className="text-lg font-semibold text-gray-600">Overall Score</h3>
        <p className={`text-6xl font-bold ${scoreColor}`}>{parsedContent.overall_score}</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {parsedContent.panels.map((panel, index) => {
          const style = categoryStyles[panel.category] || categoryStyles.Default;
          return (
            <div key={index} className={`bg-gray-50 rounded-lg p-4 border-l-4 ${style.color}`}>
              <h4 className="text-lg font-semibold mb-1">{style.icon} {panel.title}</h4>
              {/* ★変更点2: ファイル名と行番号を表示するUIを追加 */}
              <div className="text-xs text-gray-500 mb-2 font-mono bg-gray-200 inline-block px-2 py-1 rounded">
                {panel.file_name} (line: {panel.line_number})
              </div>
              <p className="text-gray-700 whitespace-pre-wrap">{panel.details}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
};