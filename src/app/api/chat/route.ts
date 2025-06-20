import { freeModels } from '@//models';
import { NextResponse } from 'next/server';
import { Task, Goal, Habit, JournalEntry } from '../../lib/export';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

const MODELS =freeModels

interface ChatMessage {
    role: string;
    content: string;
}

interface ChatContext {
    recentMessages?: ChatMessage[];
    recentTasks?: Task[];
    recentGoals?: Goal[];
    recentHabits?: Habit[];
    recentJournalEntries?: JournalEntry[];
}

// interface Suggestion {
//     type: 'task' | 'goal' | 'habit' | 'journal';
//     title: string;
//     description?: string;
//     priority?: string;
//     dueDate?: string;
//     frequency?: string;
// }

async function tryModel(model: string, message: string, context: ChatContext, origin: string) {
    // Prepare messages array with system message and chat history
    const messages = [
        {
            role: "personal-assistant",
            content: `You are an AI Personal Assistant that functions as a backend service. Your primary role is to immediately create tasks, goals, habits, and journal entries upon user request.

When the user's intent is to create an item, you MUST act immediately and strictly follow this two-part structure:

1.  **Conversational Commentary:** A friendly, helpful message that comments on the item you have just created.
2.  **Structured Data Block:** Immediately after the commentary, you MUST provide the data inside a block that starts with ############ on a new line and ends with ############ on a new line.

**Crucial Rule: Do NOT ask for permission or confirmation (e.g., "Would you like me to create this?"). If the user asks you to create something, assume they want it created and generate the JSON block immediately.**

If the user's request is ambiguous, use your best judgment to create the most likely item they want. You can mention any assumptions you made in the conversational commentary.

**You MUST use the following JSON schemas with the exact PascalCase keys shown below. Do NOT use bullet points or markdown for the data block. The user's application relies on parsing this exact JSON format.**

{
  "suggestions": [
    {
      "type": "task",
      "title": "Complete project proposal",
      "description": "Write a detailed proposal for the new client project",
      "priority": "high",
      "dueDate": "2024-03-20"
    }
  ]
}`
        }
    ];

    // Add chat history if available
    if (context?.recentMessages && context.recentMessages.length > 0) {
        messages.push(...context.recentMessages);
    }

    // Add current message with context
    messages.push({
        role: "user",
        content: `Context:
Recent Tasks: ${JSON.stringify(context?.recentTasks?.slice(0, 3) || [])}
Recent Goals: ${JSON.stringify(context?.recentGoals?.slice(0, 3) || [])}
Recent Habits: ${JSON.stringify(context?.recentHabits?.slice(0, 3) || [])}

User Message: ${message}`
    });

    const response = await fetch(OPENROUTER_API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
            'HTTP-Referer': origin || 'http://localhost:3000',
            'X-Title': 'Life Agent'
        },
        body: JSON.stringify({
            model,
            messages,
            max_tokens: 1000,
            temperature: 0.7,
            stream: false  // Disable streaming for more reliable responses
        })
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error(`OpenRouter API error for model ${model}:`, {
            status: response.status,
            statusText: response.statusText,
            error: errorText
        });

        if (response.status === 402) {
            return { error: 'CREDIT_LIMIT' };
        }

        throw new Error(`OpenRouter API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content || '';

    try {
        // Try to parse the response as JSON
        const parsedResponse = JSON.parse(content);
        return {
            content: "Here are some suggestions based on your current activities:",
            suggestions: parsedResponse.suggestions || []
        };
    } catch (e) {
        // If parsing fails, return the raw content
        return {
            content: content,
            suggestions: []
        };
    }
}

export async function POST(request: Request) {
    if (!OPENROUTER_API_KEY) {
        console.error('OPENROUTER_API_KEY is not set');
        return NextResponse.json(
            { error: 'API key not configured' },
            { status: 500 }
        );
    }

    try {
        const { message, context } : { message: string; context: ChatContext } = await request.json();

        if (!message) {
            return NextResponse.json(
                { error: 'Message is required' },
                { status: 400 }
            );
        }

        // Try each model until one works
        let lastError = null;
        for (const model of MODELS) {
            try {
                console.log(`Trying model: ${model}`);
                const result = await tryModel(model, message, context, request.headers.get('origin') || 'http://localhost:3000');

                if (result.error === 'CREDIT_LIMIT') {
                    console.log(`Credit limit reached for model ${model}, trying next model...`);
                    continue;
                }

                return NextResponse.json(result);
            } catch (error) {
                console.error(`Error with model ${model}:`, error);
                lastError = error;
                continue;
            }
        }

        // If all models fail, return the last error
        return NextResponse.json(
            { error: 'All models failed', details: lastError instanceof Error ? lastError.message : 'Unknown error' },
            { status: 500 }
        );
    } catch (error) {
        console.error('Error in chat API:', error);
        return NextResponse.json(
            { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
} 