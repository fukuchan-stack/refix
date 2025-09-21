import React from 'react';

// Snykの脆弱性一件一件のデータ型を定義します
interface Vulnerability {
  id: string;
  title: string;
  severity: 'high' | 'medium' | 'low' | 'critical';
  description: string;
  from: string[];
}

// このコンポーネントが受け取るProps（プロパティ）の型を定義します
interface SnykResultsProps {
  results: {
    vulnerabilities?: Vulnerability[];
    ok?: boolean;
    dependencyCount?: number;
  } | null;
  isLoading: boolean;
  error: string | null;
  onClose: () => void; // 閉じるための関数をpropとして追加
}

const SnykResults: React.FC<SnykResultsProps> = ({ results, isLoading, error, onClose }) => {
  // 状態がない場合は何も表示しない
  if (!isLoading && !error && !results) {
    return null;
  }

  const vulnerabilities = results?.vulnerabilities || [];

  return (
    <div className="p-4 border-t border-gray-700">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-lg font-semibold text-white">Snyk Vulnerability Scan</h3>
        <button 
          onClick={onClose} 
          className="text-gray-400 hover:text-white text-2xl leading-none"
          title="結果を閉じる"
        >
          &times;
        </button>
      </div>

      {isLoading && <p className="text-gray-400">Scanning for vulnerabilities...</p>}

      {error && (
        <>
          <h4 className="text-md font-semibold mb-1 text-red-400">Snyk Scan Failed</h4>
          <p className="text-red-500 bg-red-900/20 p-2 rounded text-sm">{error}</p>
        </>
      )}
      
      {results && !isLoading && !error && (
        vulnerabilities.length === 0 ? (
          <p className="text-green-400">✅ No vulnerabilities found!</p>
        ) : (
          <div>
            <p className="mb-4 text-gray-300">
              Found {vulnerabilities.length} vulnerabilities.
            </p>
            <div className="space-y-4">
              {vulnerabilities.map((vuln) => (
                <div key={vuln.id} className="bg-gray-800 p-3 rounded-lg">
                  <h4 className={`font-bold text-md ${getSeverityColor(vuln.severity)}`}>
                    [{vuln.severity.toUpperCase()}] {vuln.title}
                  </h4>
                  <p className="text-gray-400 text-sm mt-1">{vuln.description}</p>
                </div>
              ))}
            </div>
          </div>
        )
      )}
    </div>
  );
};

// 脆弱性の深刻度に応じて文字色を返すヘルパー関数
const getSeverityColor = (severity: string) => {
  switch (severity.toLowerCase()) {
    case 'critical':
      return 'text-red-500';
    case 'high':
      return 'text-orange-500';
    case 'medium':
      return 'text-yellow-400';
    case 'low':
      return 'text-blue-400';
    default:
      return 'text-gray-400';
  }
};

export default SnykResults;