import { AIContext, AISuggestion, AIInsight } from '../types/ai-agent';
import { freeModels} from '../models'
// Use OpenRouter API key
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

if (!OPENROUTER_API_KEY) {
  throw new Error('OPENROUTER_API_KEY is not set in environment variables');
}

const MODELS = freeModels;

// Helper function to generate UUID
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export class AIAgent {
  private static instance: AIAgent;
  private constructor() {}

  public static getInstance(): AIAgent {
    if (!AIAgent.instance) {
      AIAgent.instance = new AIAgent();
    }
    return AIAgent.instance;
  }

  private async callModel(prompt: string): Promise<string> {
    let lastError: any = null;
    let triedModels: string[] = [];
    
    for (const model of MODELS) {
      triedModels.push(model);
      try {
        console.log(`Trying model: ${model}`);
        
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://demo.openrouter.ai', // Change for production!
            'X-Title': 'Life Agent',
          },
          body: JSON.stringify({
            model: model, // Use the current model from the array
            messages: [
              {
                role: 'user',
                content: prompt
              }
            ],
            temperature: 0.7,
            max_tokens: 1024,
          }),
        });
    
        if (!response.ok) {
          const text = await response.text();
          let message = text;
          try {
            const error = JSON.parse(text);
            message = error.message || response.statusText || text;
          } catch (_) {}
          
          // Handle specific error types
          if (response.status === 402) {
            console.warn(`Payment required for model ${model}, trying next model...`);
            lastError = new Error(`Payment required for model ${model}`);
            continue; // Try next model
          }
          
          if (response.status === 429) {
            console.warn(`Rate limit exceeded for model ${model}, trying next model...`);
            lastError = new Error(`Rate limit exceeded for model ${model}`);
            continue; // Try next model
          }
          
          throw new Error(`OpenRouter API error with model ${model}: ${message}`);
        }
    
        const data = await response.json();
        const text = data.choices?.[0]?.message?.content || '';
        
        if (!text) {
          throw new Error('Empty response from AI model');
        }
        
        console.log(`Successfully used model: ${model}`);
        return text;
      } catch (error: any) {
        console.error(`Error calling AI model ${model}:`, error.message);
        lastError = error;
        // Continue to next model if there's an error
      }
    }
    
    // If all models failed
    const errorMessage = `All AI models failed after trying: ${triedModels.join(', ')}. Last error: ${lastError?.message || 'Unknown error'}`;
    console.error(errorMessage);
    throw new Error(errorMessage);
  }

  private _extractJsonFromString(inputString: string): string {
    // First, try to find JSON in markdown code blocks
    const jsonBlockMatch = inputString.match(/```json\n([\s\S]*?)\n```/);
    if (jsonBlockMatch && jsonBlockMatch[1]) {
      return jsonBlockMatch[1].trim();
    }
    
    // Try to find JSON in code blocks without language specification
    const codeBlockMatch = inputString.match(/```\n([\s\S]*?)\n```/);
    if (codeBlockMatch && codeBlockMatch[1]) {
      const content = codeBlockMatch[1].trim();
      // Check if it looks like JSON
      if (content.startsWith('[') || content.startsWith('{')) {
        return content;
      }
    }

    // Try to find JSON array or object directly
    const firstBrace = inputString.indexOf('{');
    const lastBrace = inputString.lastIndexOf('}');
    const firstBracket = inputString.indexOf('[');
    const lastBracket = inputString.lastIndexOf(']');

    if (firstBrace !== -1 && lastBrace !== -1 && firstBrace < lastBrace) {
      const jsonCandidate = inputString.substring(firstBrace, lastBrace + 1);
      // Try to validate it's proper JSON
      try {
        JSON.parse(jsonCandidate);
        return jsonCandidate;
      } catch (e) {
        // If it's not valid JSON, continue to other methods
      }
    } 
    
    if (firstBracket !== -1 && lastBracket !== -1 && firstBracket < lastBracket) {
      const jsonCandidate = inputString.substring(firstBracket, lastBracket + 1);
      // Try to validate it's proper JSON
      try {
        JSON.parse(jsonCandidate);
        return jsonCandidate;
      } catch (e) {
        // If it's not valid JSON, continue to other methods
      }
    }
    
    // If no valid JSON found, try to clean up the response and extract what looks like JSON
    const lines = inputString.split('\n');
    const jsonLines: string[] = [];
    let inJsonBlock = false;
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine.startsWith('[') || trimmedLine.startsWith('{')) {
        inJsonBlock = true;
      }
      if (inJsonBlock) {
        jsonLines.push(line);
      }
      if (inJsonBlock && (trimmedLine.endsWith(']') || trimmedLine.endsWith('}'))) {
        break;
      }
    }
    
    if (jsonLines.length > 0) {
      const jsonCandidate = jsonLines.join('\n');
      try {
        JSON.parse(jsonCandidate);
        return jsonCandidate;
      } catch (e) {
        console.warn('Failed to parse extracted JSON candidate:', e);
      }
    }
    
    // Last resort: return the original string and let the caller handle it
    console.warn('Could not extract valid JSON from AI response, returning original string');
    return inputString;
  }

  private anonymizeContext(context: AIContext): AIContext {
    if (!context) {
      throw new Error('Context is required');
    }

    // Remove any PII or sensitive information
    return {
      ...context,
      recentTasks: (context.recentTasks || []).map(task => ({
        ...task,
        title: task.title.replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, '[EMAIL]'),
      })),
      recentHabits: (context.recentHabits || []).map(habit => ({
        ...habit,
        name: habit.name.replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, '[EMAIL]'),
      })),
      recentGoals: (context.recentGoals || []).map(goal => ({
        ...goal,
        title: goal.title.replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, '[EMAIL]'),
      })),
    };
  }

  public async getSuggestions(context: AIContext): Promise<AISuggestion[]> {
    try {
      const anonymizedContext = this.anonymizeContext(context);
      
      const prompt = `Based on the following user context, suggest 3 helpful tasks, habits, or goals in JSON format. Ensure each suggestion includes 'title', 'description', 'priority' (high|medium|low), and 'reason'.
      {
        "suggestions": [
          {
            "type": "task|habit|goal",
            "title": "Suggestion Title",
            "description": "Detailed description of the suggestion.",
            "priority": "high|medium|low",
            "reason": "Why this suggestion is helpful based on context."
          }
        ]
      }

      Recent Tasks: ${JSON.stringify(anonymizedContext.recentTasks)}
      Recent Habits: ${JSON.stringify(anonymizedContext.recentHabits)}
      Recent Goals: ${JSON.stringify(anonymizedContext.recentGoals)}`;

      const response = await this.callModel(prompt);
      
      try {
        const jsonString = this._extractJsonFromString(response);
        const parsedResponse = JSON.parse(jsonString);
        if (!parsedResponse.suggestions || !Array.isArray(parsedResponse.suggestions)) {
          console.error('AI response missing or invalid suggestions array:', parsedResponse);
          throw new Error('AI response did not contain a valid suggestions array');
        }

        return parsedResponse.suggestions.map((suggestion: any) => ({
          id: generateUUID(),
          type: suggestion.type,
          title: suggestion.title,
          description: suggestion.description,
          priority: suggestion.priority,
          reason: suggestion.reason,
        }));
      } catch (error) {
        console.error('Error parsing AI suggestions:', error);
        throw new Error('Failed to parse AI suggestions response');
      }
    } catch (error: any) {
      console.error('Error getting suggestions:', error);
      throw new Error(`Failed to get suggestions: ${error.message}`);
    }
  }

  public async getWeeklyInsight(context: AIContext): Promise<AIInsight> {
    try {
      const anonymizedContext = this.anonymizeContext(context);
      
      const prompt = `Analyze the user data and provide a concise weekly insight in JSON format:
      {
        "content": "Your insight text here",
        "metrics": {
          "tasksCompleted": 0,
          "habitsMaintained": 0,
          "goalsProgress": 0.0
        }
      }
      
      Data:
      Recent Tasks: ${JSON.stringify(anonymizedContext.recentTasks)}
      Recent Habits: ${JSON.stringify(anonymizedContext.recentHabits)}
      Recent Goals: ${JSON.stringify(anonymizedContext.recentGoals)}`;

      const response = await this.callModel(prompt);
      
      try {
        const jsonString = this._extractJsonFromString(response);
        const parsedResponse = JSON.parse(jsonString);
        return {
          id: generateUUID(),
          content: parsedResponse.content,
          metrics: parsedResponse.metrics,
          timestamp: new Date().toISOString(),
        };
      } catch (error) {
        console.error('Error parsing weekly insight:', error);
        throw new Error('Failed to parse weekly insight response');
      }
    } catch (error: any) {
      console.error('Error getting weekly insight:', error);
      throw new Error(`Failed to get weekly insight: ${error.message}`);
    }
  }

  public async getSmartSuggestions(context: AIContext, userPrompt: string): Promise<AISuggestion[]> {
    try {
      const anonymizedContext = this.anonymizeContext(context);
      
      const prompt = `As a life management AI, your goal is to help the user achieve their objectives by interpreting their natural language requests and generating structured, actionable suggestions. The suggestions should be a JSON array of tasks, habits, or goals, with optional nested suggestions for complex plans. Prioritize clarity, actionability, and alignment with user's existing context.

      When the user describes a high-level goal (e.g., "start a tech blog", "build a company"), you should generate a comprehensive plan including the main goal, relevant sub-goals/milestones, detailed tasks with logical scheduling, and helpful habits. If the request is for a specific task or habit, generate a single, structured entry.

      Ensure all generated data strictly adheres to the following JSON array format. Provide only the JSON array in your response.
      [
        {
          "id": "[Generated UUID]", // Unique ID for the suggestion
          "type": "task|habit|goal",
          "title": "Brief, actionable title",
          "description": "Detailed explanation of what needs to be done.",
          "priority": "high|medium|low",
          "reason": "Why this suggestion is helpful and how it relates to the user's request or context.",
          "dueDate": "YYYY-MM-DD", // Optional, for tasks. Use realistic future dates.
          "completed": false, // Optional, for tasks
          "frequency": "daily|weekly|monthly", // Optional, for habits
          "reminderTime": "HH:MM", // Optional, for habits (e.g., "09:00")
          "targetCount": 0, // Optional, for habits
          "targetDate": "YYYY-MM-DD", // Optional, for goals. Use realistic future dates.
          "progress": 0, // Optional, for goals (0-100)
          "goalType": "long-term|short-term", // Optional, for goals
          "status": "pending|in-progress", // Optional, for goals and tasks
          "subSuggestions": [
            // Optional: for complex goals, break down into sub-goals, tasks, or habits
            // Each sub-suggestion follows the same AISuggestion structure
          ]
        }
      ]

      User's Request: "${userPrompt}"

      Current User Context:
      Recent Tasks: ${JSON.stringify(anonymizedContext.recentTasks)}
      Recent Habits: ${JSON.stringify(anonymizedContext.recentHabits)}
      Recent Goals: ${JSON.stringify(anonymizedContext.recentGoals)}

      Generate the JSON array of suggestions:
      `;

      const response = await this.callModel(prompt);
      console.log('Raw AI response:', response.substring(0, 500) + '...');
      
      let jsonString = '';
      try {
        jsonString = this._extractJsonFromString(response);
        console.log('Extracted JSON string:', jsonString.substring(0, 300) + '...');
        
        const parsedResponse = JSON.parse(jsonString);
        console.log('Parsed response type:', typeof parsedResponse, Array.isArray(parsedResponse) ? 'array' : 'object');
        
        let suggestions: any[] = [];
        
        // Handle both array format and single object with subSuggestions format
        if (Array.isArray(parsedResponse)) {
          // Direct array format
          suggestions = parsedResponse;
        } else if (parsedResponse && typeof parsedResponse === 'object') {
          // Single object format - check if it has subSuggestions
          if (parsedResponse.subSuggestions && Array.isArray(parsedResponse.subSuggestions)) {
            // Include the main object and its subSuggestions
            suggestions = [parsedResponse, ...parsedResponse.subSuggestions];
          } else {
            // Single object without subSuggestions
            suggestions = [parsedResponse];
          }
        } else {
          console.error('AI response not a valid JSON array or object:', parsedResponse);
          throw new Error('AI response did not contain a valid JSON array or object');
        }

        console.log('Final suggestions count:', suggestions.length);

        // Basic validation for each suggestion
        suggestions.forEach((s: any, index: number) => {
          if (!s.id) s.id = generateUUID(); // Ensure ID exists
          if (!s.type || !['task', 'habit', 'goal'].includes(s.type)) {
            console.warn(`Invalid or missing type for suggestion ${index}: ${s.title || 'Unknown'}. Defaulting to task.`);
            s.type = 'task';
          }
          if (!s.title) s.title = 'Untitled Suggestion';
          if (!s.description) s.description = 'No description provided.';
          if (!s.priority || !['high', 'medium', 'low'].includes(s.priority)) {
            s.priority = 'medium';
          }
          if (!s.reason) s.reason = 'AI generated.';
          // Further validation for date/time formats, etc., can be added here.
        });

        return suggestions as AISuggestion[];
      } catch (error) {
        console.error('Error parsing AI smart suggestions:', error);
        console.error('Failed JSON string:', jsonString);
        
        // Provide a fallback suggestion based on the user prompt
        const fallbackSuggestion: AISuggestion = {
          id: generateUUID(),
          type: 'task',
          title: `Complete: ${userPrompt}`,
          description: `This is a fallback suggestion for your request: "${userPrompt}". The AI response could not be parsed properly.`,
          priority: 'medium',
          reason: 'Fallback suggestion due to parsing error.',
        };
        
        console.log('Returning fallback suggestion due to parsing error');
        return [fallbackSuggestion];
      }
    } catch (error: any) {
      console.error('Error getting smart suggestions:', error);
      
      // Provide a fallback suggestion even if the AI call fails
      const fallbackSuggestion: AISuggestion = {
        id: generateUUID(),
        type: 'task',
        title: `Complete: ${userPrompt}`,
        description: `This is a fallback suggestion for your request: "${userPrompt}". The AI service is currently unavailable.`,
        priority: 'medium',
        reason: 'Fallback suggestion due to AI service error.',
      };
      
      console.log('Returning fallback suggestion due to AI service error');
      return [fallbackSuggestion];
    }
  }
} 