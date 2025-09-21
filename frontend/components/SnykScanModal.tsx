// frontend/components/SnykScanModal.tsx

import { useState } from 'react';

interface SnykScanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (fileContent: string) => void;
  language: string;
}

// ▼▼▼ サンプル内容を定数として定義 ▼▼▼
const sampleRequirementsTxt = `# Snykのテスト用に、意図的に古いライブラリを含んでいます
fastapi==0.100.0
requests==2.19.0
sqlalchemy==2.0.19
PyYAML==5.0
`;
// ▲▲▲ ここまで追加 ▲▲▲

const SnykScanModal: React.FC<SnykScanModalProps> = ({ isOpen, onClose, onScan, language }) => {
  const [fileContent, setFileContent] = useState('');

  if (!isOpen) {
    return null;
  }

  const getFileName = () => {
    if (language === 'python') return 'requirements.txt';
    if (language === 'typescript' || language === 'javascript') return 'package.json';
    return 'dependency file';
  };

  const handleScanClick = () => {
    if (!fileContent.trim()) {
      alert('ファイルの内容を貼り付けてください。');
      return;
    }
    onScan(fileContent);
  };

  // ▼▼▼ サンプルをテキストエリアにセットする関数を追加 ▼▼▼
  const handleShowSample = () => {
    if (language === 'python') {
      setFileContent(sampleRequirementsTxt);
    } else {
      alert('現在、Python用のサンプルのみ利用可能です。');
    }
  };
  // ▲▲▲ ここまで追加 ▲▲▲

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50">
      <div className="bg-gray-800 text-white rounded-lg shadow-xl w-full max-w-2xl p-6 m-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Snyk 依存関係スキャン</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl leading-none">&times;</button>
        </div>
        <p className="mb-4 text-gray-400">
          現在選択されている言語は <strong>{language}</strong> です。<br />
          <strong>{getFileName()}</strong> の内容を下のテキストエリアに貼り付けてください。
        </p>
        <textarea
          value={fileContent}
          onChange={(e) => setFileContent(e.target.value)}
          placeholder={`ここに ${getFileName()} の内容をペースト...`}
          className="w-full h-64 p-2 bg-gray-900 border border-gray-700 rounded-md text-sm font-mono focus:ring-2 focus:ring-purple-500 focus:outline-none"
        />
        <div className="mt-6 flex justify-between items-center">
          {/* ▼▼▼ サンプル表示ボタンを追加 ▼▼▼ */}
          <button
            onClick={handleShowSample}
            className="text-sm font-semibold py-2 px-4 rounded-md border border-gray-500 text-gray-300 hover:bg-gray-700 transition-colors"
          >
            サンプルを表示
          </button>
          {/* ▲▲▲ ここまで追加 ▲▲▲ */}

          <div className="flex justify-end space-x-4">
            <button
              onClick={onClose}
              className="py-2 px-4 rounded-md border border-gray-600 hover:bg-gray-700 transition-colors"
            >
              キャンセル
            </button>
            <button
              onClick={handleScanClick}
              className="py-2 px-4 rounded-md bg-purple-600 hover:bg-purple-700 transition-colors font-semibold"
            >
              スキャンを実行
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SnykScanModal;