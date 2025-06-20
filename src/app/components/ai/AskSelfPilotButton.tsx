import { useState } from 'react';
import { AIContext, AISuggestion } from '../../types/ai-agent';
import { Sparkles, X } from 'lucide-react';

interface AskSelfPilotButtonProps {
  context?: AIContext;
  className?: string;
  onSuggestionSelect?: (suggestion: AISuggestion) => void;
  onNewSuggestions?: (suggestions: AISuggestion[]) => void;
  onSuggestionsAccepted?: (suggestions: AISuggestion[]) => void;
}

export function AskSelfPilotButton({ context, className = '', onSuggestionSelect, onNewSuggestions, onSuggestionsAccepted }: AskSelfPilotButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSuggestions = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/ai-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'getSuggestions',
          context
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get suggestions');
      }

      const data = await response.json();
      setSuggestions(data.suggestions);
      if (onNewSuggestions) {
        onNewSuggestions(data.suggestions);
      }
    } catch (err) {
      setError('Unable to get suggestions. Please try again.');
      console.error('Error fetching suggestions:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpen = () => {
    setIsOpen(true);
    fetchSuggestions();
  };

  const handleAcceptAll = () => {
    if (onSuggestionsAccepted) {
      onSuggestionsAccepted(suggestions);
    }
    setIsOpen(false);
    setSuggestions([]);
  };

  const getPriorityColor = (priority: AISuggestion['priority']) => {
    switch (priority) {
      case 'high':
        return 'text-red-500';
      case 'medium':
        return 'text-yellow-500';
      case 'low':
        return 'text-green-500';
    }
  };

  return (
    <>
      <button
        onClick={handleOpen}
        className={`flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors ${className}`}
      >
        <Sparkles className="w-5 h-5" />
        <span>Ask SelfPilot</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b dark:border-gray-700">
              <div className="flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-purple-500" />
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  AI Suggestions
                </h2>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-8rem)]">
              {isLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
                  <p className="mt-2 text-gray-600 dark:text-gray-400">
                    Analyzing your data...
                  </p>
                </div>
              ) : error ? (
                <div className="text-center py-8">
                  <p className="text-red-500">{error}</p>
                  <button
                    onClick={fetchSuggestions}
                    className="mt-2 text-purple-600 hover:text-purple-700"
                  >
                    Try Again
                  </button>
                </div>
              ) : suggestions.length > 0 ? (
                <div className="space-y-6">
                  {suggestions.map((suggestion) => (
                    <div
                      key={suggestion.id}
                      className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-medium text-gray-900 dark:text-white">
                            {suggestion.title}
                          </h3>
                          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                            {suggestion.description}
                          </p>
                        </div>
                        <span
                          className={`text-sm font-medium ${getPriorityColor(
                            suggestion.priority
                          )}`}
                        >
                          {suggestion.priority}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                        {suggestion.reason}
                      </p>
                      {onSuggestionSelect && (
                        <div className="flex space-x-2 mt-3">
                          <button
                            onClick={() => {
                              onSuggestionSelect(suggestion);
                              setSuggestions(prevSuggestions => prevSuggestions.filter(s => s.id !== suggestion.id));
                            }}
                            className="text-purple-600 hover:text-purple-700 text-sm font-medium"
                          >
                            Use this suggestion
                          </button>
                          <button
                            onClick={() => {
                              setSuggestions(prevSuggestions => prevSuggestions.filter(s => s.id !== suggestion.id));
                            }}
                            className="text-gray-500 hover:text-gray-700 text-sm font-medium"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-600 dark:text-gray-400">
                    No suggestions available at the moment.
                  </p>
                </div>
              )}
            </div>

            {suggestions.length > 0 && (
              <div className="p-6 border-t dark:border-gray-700 flex justify-end">
                <button
                  onClick={handleAcceptAll}
                  className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
                >
                  Accept All Suggestions
                </button>
              </div>
            )}

            <div className="p-6 border-t dark:border-gray-700">
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Suggestions are generated based on your recent activity and goals.
                Your data is never shared externally.
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
} 