import React, { useMemo } from 'react';

// --- 型定義 ---
interface Suggestion {
  id: string;
  model_name: string;
  category: string;
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
  allSuggestions: Suggestion[];
}

export const ControlSidebar: React.FC<ControlSidebarProps> = ({
  activeAiTab,
  setActiveAiTab,
  activeFilter,
  setActiveFilter,
  searchQuery,
  setSearchQuery,
  allSuggestions,
}) => {

  const FilterButton: React.FC<{name: FilterType}> = ({ name }) => {
    const count = useMemo(() => {
        let suggestions = allSuggestions.filter(s => s.model_name === activeAiTab);
        if (name === 'All') return suggestions.length;
        const mapping: Record<FilterType, string[]> = {
            All: [], 'Repair': ['Security', 'Bug', 'Bug Risk'], 'Performance': ['Performance'],
            'Advance': ['Quality', 'Readability', 'Best Practice', 'Design', 'Style'],
        };
        const targetCategories = mapping[name];
        return suggestions.filter(s => targetCategories.includes(s.category)).length;
    }, [allSuggestions, activeAiTab]);

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
    <div className="w-56 bg-white dark:bg-black p-4 border-r border-gray-200 dark:border-gray-800 flex flex-col space-y-6">
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
                }`
              }
            >
              {modelName}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-gray-100">Filters</h3>
        {/* ▼▼▼ ここの構造を変更しました ▼▼▼ */}
        <div className="flex flex-col items-start space-y-4">
            <div>
                <FilterButton name="All" />
            </div>
            <div>
                <FilterButton name="Repair" />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 pl-3">
                    バグや脆弱性の修正
                </p>
            </div>
            <div>
                <FilterButton name="Performance" />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 pl-3">
                    パフォーマンスの改善
                </p>
            </div>
            <div>
                <FilterButton name="Advance" />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 pl-3">
                    品質や設計の向上
                </p>
            </div>
        </div>
        {/* ▲▲▲ ここまで ▲▲▲ */}
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
  );
};