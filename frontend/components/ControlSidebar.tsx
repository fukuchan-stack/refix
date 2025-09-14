import React, { useMemo, useState } from 'react'; // ★★★ 変更点①: useStateを追加 ★★★
import { FiSettings } from 'react-icons/fi'; // ★★★ 変更点②: アイコンをインポート ★★★
import { ThemeSwitcher } from './ThemeSwitcher'; // ★★★ 変更点③: ThemeSwitcherをインポート ★★★


// --- 型定義 ---
interface Suggestion {
    id: string;
    model_name: string;
    category: string;
}
type FilterType = 'All' | 'Repair' | 'Performance' | 'Advance';

const AI_MODELS = ["Gemini (Balanced)", "Claude (Fast Check)", "GPT-4o (Strict Audit)"];

// --- コンポーネントが受け取るプロパティの型定義 ---
// ★★★ 変更点④: Propsに設定用の項目を追加 ★★★
interface ControlSidebarProps {
    activeAiTab: string;
    setActiveAiTab: (tab: string) => void;
    activeFilter: FilterType;
    setActiveFilter: (filter: FilterType) => void;
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    allSuggestions: Suggestion[];
    showSampleButton: boolean;
    setShowSampleButton: (show: boolean) => void;
    showClearButton: boolean;
    setShowClearButton: (show: boolean) => void;
}

// ★★★ 変更点⑤: スライド式トグルスイッチのコンポーネントを定義 ★★★
const ToggleSwitch: React.FC<{ label: string; isEnabled: boolean; onToggle: (enabled: boolean) => void; }> = ({ label, isEnabled, onToggle }) => (
    <div className="flex items-center justify-between">
        <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
        <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" checked={isEnabled} onChange={(e) => onToggle(e.target.checked)} className="sr-only peer" />
            <div className="w-11 h-6 bg-gray-200 dark:bg-gray-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
        </label>
    </div>
);


export const ControlSidebar: React.FC<ControlSidebarProps> = ({
    activeAiTab,
    setActiveAiTab,
    activeFilter,
    setActiveFilter,
    searchQuery,
    setSearchQuery,
    allSuggestions,
    // ★★★ 変更点⑥: 新しいPropsを受け取る ★★★
    showSampleButton,
    setShowSampleButton,
    showClearButton,
    setShowClearButton,
}) => {

    // ★★★ 変更点⑦: 設定パネルの開閉状態を管理するStateを追加 ★★★
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    const FilterButton: React.FC<{name: FilterType}> = ({ name }) => {
        // ... (FilterButtonコンポーネントの中身は変更なし) ...
    };

    return (
        // ★★★ 変更点⑧: レイアウトをメインコンテンツ＋フッター（設定）に変更 ★★★
        <div className="w-64 bg-white dark:bg-black border-r border-gray-200 dark:border-gray-800 flex flex-col">
            
            {/* メインのコンテンツエリア (スクロール可能) */}
            <div className="flex-1 p-4 space-y-6 overflow-y-auto">
                <div>
                    <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-gray-100">AI Model</h3>
                    <div className="flex flex-col items-start space-y-1">
                        {AI_MODELS.map(modelName => (
                            <button 
                                key={modelName}
                                onClick={() => setActiveAiTab(modelName)}
                                className={`px-3 py-1 text-sm rounded-md w-full text-left transition-colors
                                ${activeAiTab === modelName 
                                    ? 'bg-blue-100 dark:bg-blue-900 dark:bg-opacity-50 text-blue-700 dark:text-blue-300 font-semibold' 
                                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-900'
                                }`}
                            >
                                {modelName}
                            </button>
                        ))}
                    </div>
                </div>

                <div>
                    <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-gray-100">Filters</h3>
                    <div className="flex flex-col items-start space-y-4">
                        <div><FilterButton name="All" /></div>
                        <div>
                            <FilterButton name="Repair" />
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 pl-3">バグや脆弱性の修正</p>
                        </div>
                        <div>
                            <FilterButton name="Performance" />
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 pl-3">パフォーマンスの改善</p>
                        </div>
                        <div>
                            <FilterButton name="Advance" />
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 pl-3">品質や設計の向上</p>
                        </div>
                    </div>
                </div>
                
                <div>
                    <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-gray-100">Search</h3>
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="結果をキーワードで検索..."
                        className="w-full p-2 border rounded-md text-sm bg-gray-50 dark:bg-gray-900 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-200"
                    />
                </div>
            </div>

            {/* フッターの設定エリア */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-800">
                {isSettingsOpen && (
                    <div className="p-4 mb-4 bg-gray-50 dark:bg-gray-900 rounded-lg space-y-3">
                        <h4 className="font-bold text-gray-900 dark:text-gray-100">設定</h4>
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-700 dark:text-gray-300">テーマ</span>
                            <ThemeSwitcher />
                        </div>
                        <ToggleSwitch 
                            label="「サンプル」ボタン"
                            isEnabled={showSampleButton}
                            onToggle={setShowSampleButton}
                        />
                         <ToggleSwitch 
                            label="「クリア」ボタン"
                            isEnabled={showClearButton}
                            onToggle={setShowClearButton}
                        />
                    </div>
                )}
                <button 
                    onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                    title="設定を開く/閉じる"
                    className="w-full flex items-center justify-center p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-800"
                >
                    <FiSettings size={20} className="text-gray-600 dark:text-gray-400" />
                </button>
            </div>
        </div>
    );
};