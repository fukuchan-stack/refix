import React, { useMemo, useState } from 'react';
import { FiSettings } from 'react-icons/fi';
import { ThemeSwitcher } from './ThemeSwitcher';
import { Suggestion } from '../types';

type FilterType = 'All' | 'Repair' | 'Performance' | 'Advance';

const AI_MODELS = ["Gemini (Balanced)", "Claude (Fast Check)", "GPT-4o (Strict Audit)"];
const VIEW_OPTIONS = [...AI_MODELS, "AI集約表示"];

interface ControlSidebarProps {
    activeAiTab: string;
    setActiveAiTab: (tab: string) => void;
    activeFilter: FilterType;
    setActiveFilter: (filter: FilterType) => void;
    suggestions: Suggestion[];
    showSampleButton: boolean;
    setShowSampleButton: (show: boolean) => void;
    showClearButton: boolean;
    setShowClearButton: (show: boolean) => void;
    showSearchBar: boolean;
    setShowSearchBar: (show: boolean) => void;
    showSnykButton: boolean;
    setShowSnykButton: (show: boolean) => void;
}

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
    suggestions,
    showSampleButton,
    setShowSampleButton,
    showClearButton,
    setShowClearButton,
    showSearchBar,
    setShowSearchBar,
    showSnykButton,
    setShowSnykButton,
}) => {
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    
    const filters: { name: FilterType; label: string; description: string }[] = [
        { name: 'All', label: 'All', description: '全ての指摘を表示します' },
        { name: 'Repair', label: 'Repair (バグ修正)', description: 'バグや脆弱性の修正に関する指摘' },
        { name: 'Performance', label: 'Performance (改善)', description: 'パフォーマンスの改善に関する指摘' },
        { name: 'Advance', label: 'Advance (品質向上)', description: '品質や設計の向上に関する指摘' },
    ];

    const FilterButton: React.FC<{data: {name: FilterType, label: string, description: string}}> = ({ data }) => {
        const count = useMemo(() => {
            if (activeAiTab === 'AI集約表示') {
                const mapping: Record<FilterType, string[]> = {
                    All: [], 'Repair': ['Security', 'Bug', 'Bug Risk'], 'Performance': ['Performance'],
                    'Advance': ['Quality', 'Readability', 'Best Practice', 'Design', 'Style'],
                };
                if (data.name === 'All') return suggestions.length;
                const targetCategories = mapping[data.name];
                return suggestions.filter(s => targetCategories.includes(s.category)).length;
            }
            let filteredSuggestions = suggestions.filter(s => s.model_name === activeAiTab);
            if (data.name === 'All') return filteredSuggestions.length;
            
            const mapping: Record<FilterType, string[]> = {
                All: [], 'Repair': ['Security', 'Bug', 'Bug Risk'], 'Performance': ['Performance'],
                'Advance': ['Quality', 'Readability', 'Best Practice', 'Design', 'Style'],
            };
            const targetCategories = mapping[data.name];
            return filteredSuggestions.filter(s => targetCategories.includes(s.category)).length;
        }, [suggestions, activeAiTab]);

        const baseClasses = "px-3 py-1 text-sm font-medium rounded-full transition-colors flex items-center justify-between w-full";
        const activeClasses = "bg-blue-600 text-white";
        const inactiveClasses = "bg-gray-200 dark:bg-gray-800 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-700";
        
        return (
            <button title={data.description} onClick={() => setActiveFilter(data.name)} className={`${baseClasses} ${activeFilter === data.name ? activeClasses : inactiveClasses}`}>
                <span>{data.label}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${activeFilter === data.name ? 'bg-blue-400 text-white' : 'bg-gray-300 dark:bg-gray-700 text-gray-700 dark:text-gray-200'}`}>{count}</span>
            </button>
        );
    };

    return (
        <div className="w-56 bg-white dark:bg-black border-r border-gray-200 dark:border-gray-800 flex flex-col">
            <div className="flex-1 p-4 space-y-6 overflow-y-auto">
                <div>
                    <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-gray-100">表示ビュー</h3>
                    <div className="flex flex-col items-start space-y-1">
                        {VIEW_OPTIONS.map(viewName => (
                            <button 
                                key={viewName}
                                onClick={() => setActiveAiTab(viewName)}
                                className={`px-3 py-1 text-sm rounded-md w-full text-left transition-colors
                                ${viewName === 'AI集約表示' ? 'mt-2 pt-2 border-t border-gray-700' : ''}
                                ${activeAiTab === viewName 
                                    ? 'bg-blue-100 dark:bg-blue-900 dark:bg-opacity-50 text-blue-700 dark:text-blue-300 font-semibold' 
                                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-900'
                                }`}
                            >
                                {viewName}
                            </button>
                        ))}
                    </div>
                </div>

                <div>
                    <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-gray-100">Filters</h3>
                    <div className="flex flex-col items-start space-y-2">
                        {filters.map((filter) => (
                            <FilterButton key={filter.name} data={filter} />
                        ))}
                    </div>
                </div>
            </div>

            <div className="p-4">
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
                        <ToggleSwitch 
                            label="検索バー"
                            isEnabled={showSearchBar}
                            onToggle={setShowSearchBar}
                        />
                        <ToggleSwitch 
                            label="Snykスキャンボタン"
                            isEnabled={showSnykButton}
                            onToggle={setShowSnykButton}
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