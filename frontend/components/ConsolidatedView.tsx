import { useState } from 'react';
import { FiChevronDown, FiCode } from 'react-icons/fi';
import { Suggestion } from '../types';

const AILogo = ({ modelName }: { modelName: string }) => {
  const baseClasses = "w-4 h-4 rounded-full flex items-center justify-center text-xs font-bold text-white";
  if (modelName.includes('Gemini')) return <div className={`${baseClasses} bg-blue-500`} title={modelName}>G</div>;
  if (modelName.includes('Claude')) return <div className={`${baseClasses} bg-orange-500`} title={modelName}>C</div>;
  if (modelName.includes('GPT-4o')) return <div className={`${baseClasses} bg-green-500`} title={modelName}>G</div>;
  return null;
};

interface ConsolidatedViewProps {
  issues: any[];
  onSuggestionSelect: (suggestion: Suggestion) => void;
}

const ConsolidatedView: React.FC<ConsolidatedViewProps> = ({ issues, onSuggestionSelect }) => {
  const [openIssueId, setOpenIssueId] = useState<string | null>(null);

  if (!issues || issues.length === 0) {
    return <div className="p-4 text-gray-400 text-sm">指摘事項はありません。</div>;
  }

  const toggleIssue = (issueId: string) => {
    setOpenIssueId(openIssueId === issueId ? null : issueId);
  };

  return (
    <div className="py-4 h-full overflow-y-auto">
      <h3 className="text-lg font-semibold text-white mb-3 px-4">AI集約表示 ({issues.length}件)</h3>
      <div className="space-y-2 px-2">
        {issues.map((issue) => (
          <div key={issue.issue_id} className="bg-gray-800/50 rounded-lg">
            <button
              onClick={() => toggleIssue(issue.issue_id)}
              className="w-full flex items-center justify-between p-3 text-left hover:bg-gray-700/50 rounded-lg transition-colors"
            >
              <div className="flex items-center space-x-3 overflow-hidden">
                <div className="flex items-center flex-shrink-0 space-x-1" title="指摘したAI">
                  {issue.participating_ais.map((ai: string) => <AILogo key={ai} modelName={ai} />)}
                </div>
                <div className="flex items-center text-sm min-w-0">
                  <FiCode className="mr-2 text-gray-500 flex-shrink-0" />
                  <span className="font-mono text-gray-400">L{issue.line_number}</span>
                  <span className="ml-3 text-white truncate">{issue.title}</span>
                </div>
              </div>
              <FiChevronDown className={`transition-transform flex-shrink-0 ${openIssueId === issue.issue_id ? 'rotate-180' : ''}`} />
            </button>
            {openIssueId === issue.issue_id && (
              <div className="p-3 border-t border-gray-700 space-y-2">
                {issue.suggestions.map((sugg: any, index: number) => (
                  <button 
                    key={index} 
                    onClick={() => onSuggestionSelect({ id: `${issue.issue_id}-${index}`, ...sugg })}
                    className="w-full text-left p-2 rounded-md hover:bg-gray-700 transition-colors"
                  >
                    <div className="flex items-center space-x-2 mb-1">
                      <AILogo modelName={sugg.model_name} />
                      <span className="text-sm font-semibold text-gray-300">{sugg.model_name}</span>
                    </div>
                    <p className="text-sm text-gray-400 pl-6">{sugg.description}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ConsolidatedView;