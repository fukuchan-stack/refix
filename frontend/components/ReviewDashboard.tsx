import { useEffect, useState } from 'react';

// review_content (JSON string) をパースした後の型
interface Panel {
  category: string;
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
  // ★変更点1: isLegacyというStateを追加
  const [isLegacy, setIsLegacy] = useState(false);

  useEffect(() => {
    try {
      // まずJSONとして解釈を試みる
      const content = JSON.parse(reviewContent);
      // 成功すれば、新世代データとしてStateに保存
      setParsedContent(content);
      setIsLegacy(false);
    } catch (error) {
      // ★変更点2: パースに失敗した場合の処理
      // JSONとして解釈できなかった場合、それは旧世代のデータだと判断する
      console.log("Could not parse JSON, treating as legacy plain text review.");
      setIsLegacy(true);
    }
  }, [reviewContent]);

  // ★変更点3: isLegacyがtrueの場合の表示
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
              <h4 className="text-lg font-semibold mb-2">{style.icon} {panel.title}</h4>
              <p className="text-gray-700 whitespace-pre-wrap">{panel.details}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
};