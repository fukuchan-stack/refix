import React, { useMemo, useState } from 'react';
import { FiSettings } from 'react-icons/fi';
import { ThemeSwitcher } from './ThemeSwitcher';

// --- 型定義 ---
interface Suggestion {
    id: string;
    model_name: string;
    category: string;
    description: string;
    line_number: number;
    suggestion: string;
}
type FilterType = 'All' | 'Repair' | 'Performance' | 'Advance';

const AI_MODELS = ["Gemini (Balanced)", "Claude (Fast Check)", "GPT-4o (Strict Audit)"];

// --- コンポーネントが受け取るプロパティの型定義 ---
interface ControlSidebarProps {
    activeAiTab: string;
    setActiveAiTab: (tab: string) => void;
    activeFilter: FilterType;
    setActiveFilter: (filter: FilterType) => void;
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    suggestions: Suggestion[]; 
    setSelectedSuggestion: (suggestion: Suggestion) => void;
    showSampleButton: boolean;
    setShowSampleButton: (show: boolean) => void;
    showClearButton: boolean;
    setShowClearButton: (show: boolean) => void;
}

// --- スライド式トグルスイッチのコンポーネント ---
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
    suggestions,
    setSelectedSuggestion,
    showSampleButton,
    setShowSampleButton,
    showClearButton,
    setShowClearButton,
}) => {

    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    const FilterButton: React.FC<{name: FilterType}> = ({ name }) => {
        const count = useMemo(() => {
            if (name === 'All') return suggestions.length;
            const mapping: Record<FilterType, string[]> = {
                All: [], 'Repair': ['Security', 'Bug', 'Bug Risk'], 'Performance': ['Performance'],
                'Advance': ['Quality', 'Readability', 'Best Practice', 'Design', 'Style'],
            };
            const targetCategories = mapping[name];
            return suggestions.filter(s => targetCategories.includes(s.category)).length;
        }, [suggestions]);

        const baseClasses = "px-3 py-1 text-sm font-medium rounded-full transition-colors flex items-center space-x-2";
        const activeClasses = "bg-blue-600 text-white";
        const inactiveClasses = "bg-gray-200 dark:bg-gray-800 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-700";
        return (
            <button onClick={() => setActiveFilter(name)} className={`${baseClasses} ${activeFilter === name ? activeClasses : inactiveClasses}`}>
                <span>{name}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${activeFilter === name ? 'bg-blue-400 text-white' : 'bg-gray-300 dark:bg-gray-700 text-gray-700 dark:text-gray-200'}`}>{count}</span>
            </button>
        );
    };

    return (
        <div className="w-64 bg-white dark:bg-black border-r border-gray-200 dark:border-gray-800 flex flex-col">
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
                        <div><FilterButton name="Repair" /></div>
                        <div><FilterButton name="Performance" /></div>
                        <div><FilterButton name="Advance" /></div>
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

                <div className="border-t border-gray-200 dark:border-gray-800 pt-4">
                    <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-gray-100">Suggestions</h3>
                    <div className="space-y-2">
                        {suggestions.map((s) => (
                            <div 
                                key={s.id} 
                                onClick={() => setSelectedSuggestion(s)}
                                className="border rounded-lg p-3 text-sm cursor-pointer transition-all dark:border-gray-700 bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800"
                            >
                                <p className="font-bold text-gray-800 dark:text-gray-200">{s.category}</p>
                                <p className="text-gray-700 dark:text-gray-300 truncate">{s.description}</p>
                            </div>
                        ))}
                        {suggestions.length === 0 && <p className="text-sm text-gray-500 dark:text-gray-400 text-center">指摘はありません</p>}
                    </div>
                </div>
            </div>

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