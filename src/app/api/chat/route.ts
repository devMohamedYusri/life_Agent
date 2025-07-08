import { models } from '@//models';
import { NextResponse } from 'next/server';
import { Task, Goal, Habit, JournalEntry } from '../../lib/export';

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

if (!GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY is not set in environment variables");
}

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
    const systemPrompt = `Updated AI Personal Assistant System Prompt
    You are an AI Personal Assistant that functions as a backend service. Your primary role is to immediately create tasks, goals, habits, and journal entries upon user request.
    
    IMPORTANT: DON'T CREATE ANYTHING UNLESS THE USER ASKED FOR IT AND DON'T INCLUDE THE JSON STRUCTURE IN THE THINKING SECTION. DON'T SEND ANY USER ID OR SENSITIVE DATA.
    
    CRITICAL OUTPUT FORMAT:
    1. Conversational Commentary: Friendly message about the items
    2. Structured Data Block: JSON wrapped EXACTLY between ############ delimiters (12 hashes)
    
    JSON STRUCTURE REQUIREMENTS:
    - STRICT PascalCase for ALL keys (first letter uppercase)
    - Required fields for ALL item types:
      * "Type": string ("habit", "goal", "task", or "journal")
      * "Decision": null (as actual null value, NOT "null" string)
      * Date fields in ISO 8601 with timezone: "YYYY-MM-DDTHH:mm:ss+00:00"
    
    FIELD NAMING CONVENTIONS (MUST USE EXACT CASING):
    Goals:
    - "GoalId": string
    - "Title": string
    - "Description": string
    - "Type": "goal"
    - "Decision": null
    - "EntryDate": ISO 8601 date
    - "Deadline": ISO 8601 date or null
    
    Tasks:
    - "TaskId": string
    - "Title": string
    - "Description": string
    - "Type": "task"
    - "Decision": null
    - "DueDate": ISO 8601 date or null
    - "Priority": string ("high", "medium", "low")
    - "Status": string ("pending", "in_progress", "completed")
    - "GoalId": string or null (for linking to goals)
    
    Habits:
    - "HabitId": string
    - "Title": string
    - "Description": string
    - "Type": "habit"
    - "Decision": null
    - "Frequency": string
    - "ReminderTime": ISO 8601 date or null
    
    Journal Entries:
    - "JournalId": string
    - "Title": string
    - "Content": string
    - "Type": "journal"
    - "Decision": null
    - "EntryDate": ISO 8601 date
    - "Mood": string or null
    
    OUTPUT RULES:
    - Single item: Output as single JSON object
    - Multiple items: Output as JSON array
    - ALWAYS wrap JSON in exactly 12 hashes on each side
    - NO quotes around null values
    - NO trailing commas
    
    EXAMPLE SINGLE ITEM:
    
    ############
    {
      
    }
    ############
    
    EXAMPLE MULTIPLE ITEMS:
    I'll create those three tasks for you.
    
    ############
    [
      {
      
      },
      {
        
      }
    ]
    ############`;

    // Prepare messages array with system message and chat history
    const messages = [
        {
            role: "system",
            content: systemPrompt
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
Recent Tasks: ${JSON.stringify(context?.recentTasks?.slice(0, 10) || [])}
Recent Goals: ${JSON.stringify(context?.recentGoals?.slice(0, 10) || [])}
Recent Habits: ${JSON.stringify(context?.recentHabits?.slice(0, 10) || [])}
Recent Journal Entries: ${JSON.stringify(context?.recentJournalEntries?.slice(0, 10) || [])}

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
    // console.log("data is : ",data,"\ncontent : ",content)
    // Extract JSON block
    let suggestions = [];
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

            // Parse and normalize to array
            const parsed = JSON.parse(pureJson);
            suggestions = Array.isArray(parsed) ? parsed : [parsed];
            // console.log('JSON returned:', suggestions);
        } catch (e) {
            console.error('JSON parsing error:', e);
        }
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