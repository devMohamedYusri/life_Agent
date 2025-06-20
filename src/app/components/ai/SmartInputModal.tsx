import { useState, useEffect } from 'react';
import { AIContext, AISuggestion } from '../../types/ai-agent';
import { Sparkles, X, Plus, RefreshCw } from 'lucide-react';
import { Button } from '../ui/button';

interface SmartInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  context: AIContext;
  userPrompt: string;
  onSuggestionsAccepted: (suggestions: AISuggestion[]) => void;
}

export function SmartInputModal({
  isOpen,
  onClose,
  context,
  userPrompt,
  onSuggestionsAccepted,
}: SmartInputModalProps) {
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
          action: 'getSmartSuggestions', // New action for smart input
          context,
          userPrompt, // Pass the user's specific prompt
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to get smart suggestions');
      }

      const data = await response.json();
      setSuggestions(data.suggestions);
    } catch (err) {
      const errorMessage = (err instanceof Error) ? err.message : 'Unable to get suggestions. Please try again.';
      setError(errorMessage);
      console.error('Error fetching smart suggestions:', (err instanceof Error) ? err : "");
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch suggestions when modal opens or userPrompt changes
  useEffect(() => {
    if (isOpen && userPrompt) {
      fetchSuggestions();
    }
  }, [isOpen, userPrompt]);

  const handleAcceptSuggestion = (suggestion: AISuggestion) => {
    // In a real app, you'd send this to your backend to save it
    setSuggestions(prevSuggestions => 
      prevSuggestions.filter(s => s.id !== suggestion.id)
    );
    console.log('Accepting suggestion:', suggestion);

    onSuggestionsAccepted([suggestion]);
    // Modal stays open to allow accepting multiple suggestions
  };

  const handleRefuseSuggestion = (suggestionId: string) => {
    // Remove the refused suggestion from the list
    setSuggestions(prevSuggestions => 
      prevSuggestions.filter(suggestion => suggestion.id !== suggestionId)
    );
    console.log('Refused suggestion:', suggestionId);
  };

  const getPriorityColor = (priority: AISuggestion['priority']) => {
    switch (priority) {
      case 'high':
        return 'text-red-500';
      case 'medium':
        return 'text-yellow-500';
      case 'low':
        return 'text-green-500';
      default:
        return 'text-gray-500';
    }
  };

  if (!isOpen) return null;

  return (
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
            onClick={onClose}
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
                Generating suggestions...
              </p>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-red-500">{error}</p>
              <Button onClick={fetchSuggestions} className="mt-4">
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
            </div>
          ) : suggestions.length > 0 ? (
            <div className="space-y-6">
              <p className="text-gray-700 dark:text-gray-300 mb-4">Here are some suggestions based on your request: &quot;{userPrompt}&quot;:</p>
              {suggestions.map((suggestion) => (
                <div
                  key={suggestion.id}
                  className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white">
                        {suggestion.title}
                      </h3>
                      <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                        Type: {suggestion.type.charAt(0).toUpperCase() + suggestion.type.slice(1)}
                      </p>
                    </div>
                    <span
                      className={`text-sm font-medium ${getPriorityColor(
                        suggestion.priority
                      )}`}
                    >
                      {suggestion.priority.charAt(0).toUpperCase() + suggestion.priority.slice(1)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                    {suggestion.description}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                    Reason: {suggestion.reason}
                  </p>
                  <div className="flex justify-end gap-2">
                    <Button 
                      variant="outline" 
                      onClick={() => handleRefuseSuggestion(suggestion.id)}
                      className="text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                    >
                      Refuse
                    </Button>
                    <Button onClick={() => handleAcceptSuggestion(suggestion)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Accept
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {suggestions.length === 0 && !isLoading && !error 
                  ? "You've refused all suggestions. Would you like to generate new ones?"
                  : "No suggestions available for your request at the moment."
                }
              </p>
              {(suggestions.length === 0 && !isLoading && !error) && (
                <Button onClick={fetchSuggestions} className="mt-2">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Generate New Suggestions
                </Button>
              )}
            </div>
          )}
        </div>

        <div className="p-6 border-t dark:border-gray-700">
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Suggestions are generated based on your recent activity and goals.
            Your data is never shared externally.
          </div>
        </div>
      </div>
    </div>
  );
} 