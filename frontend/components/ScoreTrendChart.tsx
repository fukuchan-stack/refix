import React from 'react';
import { RadialBarChart, RadialBar, PolarAngleAxis, ResponsiveContainer } from 'recharts';
import { useTheme } from 'next-themes';

// グラフに渡すデータの型を定義
interface ChartData {
  name: string;
  score: number;
}

// コンポーネントが受け取るプロパティの型を定義
interface ScoreTrendChartProps {
  data: ChartData[];
}

export const ScoreTrendChart: React.FC<ScoreTrendChartProps> = ({ data }) => {
  const { theme } = useTheme();

  // データが存在しない、または空の場合は何も表示しない
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-xs text-gray-400 dark:text-gray-500">
        No data
      </div>
    );
  }

  // 渡されたデータの中から一番最後のスコアを「現在のスコア」として取得
  const currentScore = Math.round(data[data.length - 1].score);

  // ゲージの背景色をテーマによって変更
  const trackColor = theme === 'dark' ? '#374151' : '#e5e7eb'; // dark:bg-gray-700 or bg-gray-200

  // rechartsのRadialBarChart用のデータ形式に変換
  const chartData = [
    { name: 'score', value: currentScore, fill: '#4f46e5' }, // indigo-600
  ];

  return (
    // position-relative を追加して、中央のテキストの基準点にする
    <div className="relative w-full h-full">
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart
          innerRadius="70%"
          outerRadius="100%"
          barSize={8}
          data={chartData}
          startAngle={90}
          endAngle={-270}
        >
          {/* グラフのスケール（0〜100）を定義 */}
          <PolarAngleAxis
            type="number"
            domain={[0, 100]}
            tick={false}
          />
          {/* ゲージの背景（トラック）を描画 */}
          <RadialBar
            background
            dataKey="value"
            cornerRadius={4}
            // @ts-ignore
            background={{ fill: trackColor }}
          />
        </RadialBarChart>
      </ResponsiveContainer>
      {/* グラフの中央にスコアの数値を表示 */}
      <div className="absolute top-0 left-0 right-0 bottom-0 flex flex-col items-center justify-center pointer-events-none">
        <p className="font-bold text-xl text-gray-800 dark:text-gray-200">
          {currentScore}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 -mt-1">
          Score
        </p>
      </div>
    </div>
  );
};