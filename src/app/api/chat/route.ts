//app/api/chat/route.ts
import { models } from '@//models';
import { NextResponse } from 'next/server';
import { Task, Goal, Habit, JournalEntry } from '../../lib/export';

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

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

async function tryModel(model: string, message: string, context: ChatContext,) {
    // Prepare messages array with system message and chat history
    const messages = [
        {
            role: "system",
            content: `Updated AI Personal Assistant System Prompt
You are an AI Personal Assistant that functions as a backend service. Your primary role is to immediately create tasks, goals, habits, and journal entries upon user request.

While users can send normal conversational messages that don't require creating items, the typical and expected use case is for users to request the creation of tasks, goals, habits, or journal entries. 

When the user's intent is to create an item, you MUST act immediately and strictly follow this two-part structure:

1. Conversational Commentary: A friendly, helpful message that comments on the item you have just created or without needing to add an item.

2. Structured Data Block: Immediately after the commentary, you MUST provide the data inside a block that starts with ############ on a new line and ends with ############ on a new line.

Crucial Rule: Do NOT ask for permission or confirmation (e.g., "Would you like me to create this?"). If the user asks you to create something, assume they want it created and generate the JSON block immediately.

If the user's request is ambiguous, use your best judgment to create the most likely item they want. You can mention any assumptions you made in the conversational commentary.

You MUST use the following JSON schemas with the exact PascalCase keys shown below. Do NOT use bullet points or markdown for the data block. The user's application relies on parsing this exact JSON format.

IMPORTANT: Every JSON response MUST include a "Type" field with one of these exact values: "habit", "goal", "task", or "journal"
and Every JSON response MUST include a "Decision" field  with one of these exact valus : "null"
all the suggestions should be in small case letters 
. This field is required for the application to properly categorize and process the response.`
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

    const response = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${GROQ_API_KEY}`
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
        console.error(`Groq API error for model ${model}:`, {
            status: response.status,
            statusText: response.statusText,
            error: errorText
        });

        if (response.status === 429) {
            return { error: 'RATE_LIMIT' };
        }

        throw new Error(`Groq API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content || '';
    console.log("data is : ",data,"\ncontent : ",content)
    // Extract JSON block
    let jsonData = null;
    let conversationalContent = content;
    
    // Regex to find content between ############ delimiters
    const blockRegex = /#{8,}[\s\S]*?#{8,}/g;
    const blockMatch = content.match(blockRegex);
    
    if (blockMatch && blockMatch[0]) {
        const blockContent = blockMatch[0];
        // Remove the block from conversational content
        conversationalContent = content.replace(blockContent, '').trim();
        
        // Try to parse JSON from block
        try {
            // Remove the delimiter lines and trim whitespace
            let pureJson = blockContent
                .split('\n')
                .filter((line: string) => !line.trim().startsWith('#'))
                .join('\n')
                .trim();

            // Attempt to fix unquoted keys (e.g., {key: "value"} -> {"key": "value"})
            pureJson = pureJson.replace(/(\b[A-Z][a-zA-Z0-9_]*\b)\s*:/g, '"$1":');

            jsonData = JSON.parse(pureJson);
            console.log('json returned : ',pureJson)
        } catch (e) {
            console.error('JSON parsing error:', e);
        }
    }

    // Convert to suggestions array
    let suggestions = [];
    if (jsonData) {
        suggestions = Array.isArray(jsonData) ? jsonData : [jsonData];
    }

    return {
        content: conversationalContent,
        suggestions
    };
}

export async function POST(request: Request) {
    if (!GROQ_API_KEY) {
        console.error('GROQ_API_KEY is not set');
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
        for (const model of models) {
            try {
                console.log(`Trying model: ${model}`);
                const result = await tryModel(model, message, context);

                if (result.error === 'RATE_LIMIT') {
                    console.log(`Rate limit reached for model ${model}, trying next model...`);
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