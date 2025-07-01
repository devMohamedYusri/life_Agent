// app/api/ai-services/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { models } from '@//models'; // Import your models list

interface GroqChatCompletionResponse {
    choices: Array<{
        message: {
            content: string;
        };
    }>;
}

interface DailyMotivationRequestBody {
    userProfile?: { user_name?: string };
    recentAchievements?: unknown[];
}

interface MoodAnalysisEntry {
    created_at: string;
    mood: string;
    content?: string;
}

interface MoodAnalysisRequestBody {
    entries?: MoodAnalysisEntry[];
}

interface RecommendationsContext {
    tasks?: unknown[];
    goals?: unknown[];
    completionRate?: number;
}

interface RecommendationsRequestBody {
    context?: RecommendationsContext;
}

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

// Helper function to try models sequentially until one works
async function tryModelsSequentially(
    messages: Array<{ role: string; content: string }>,
    maxTokens: number = 500,
    temperature: number = 0.7
): Promise<{ success: boolean; data?: GroqChatCompletionResponse; error?: string; modelUsed?: string }> {
    
    for (let i = 0; i < models.length; i++) {
        const model = models[i];
        console.log(`Trying model ${i + 1}/${models.length}: ${model}`);
        
        try {
            const response = await fetch(GROQ_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${GROQ_API_KEY}`
                },
                body: JSON.stringify({
                    model: model,
                    messages: messages,
                    max_tokens: maxTokens,
                    temperature: temperature,
                })
            });

            if (response.ok) {
                const data = await response.json();
                console.log(`Success with model: ${model}`);
                return { 
                    success: true, 
                    data: data, 
                    modelUsed: model 
                };
            } else {
                const errorData = await response.json();
                console.error(`Model ${model} failed:`, errorData);
                
                // If it's the last model, return the error
                if (i === models.length - 1) {
                    return { 
                        success: false, 
                        error: errorData.message || 'All models failed',
                        modelUsed: model 
                    };
                }
                // Otherwise, continue to the next model
                continue;
            }
        } catch (error) {
            console.error(`Error with model ${model}:`, error);
            
            // If it's the last model, return the error
            if (i === models.length - 1) {
                return { 
                    success: false, 
                    error: error instanceof Error ? error.message : 'Unknown error',
                    modelUsed: model 
                };
            }
            // Otherwise, continue to the next model
            continue;
        }
    }
    
    return { success: false, error: 'No models available' };
}

export async function POST(req: NextRequest) {
    if (!GROQ_API_KEY) {
        console.error('GROQ_API_KEY is not set');
        return NextResponse.json(
            { error: 'API key not configured' },
            { status: 500 }
        );
    }

    try {
        const body = await req.json();
        const { serviceType } = body;

        // Route to appropriate service based on serviceType
        switch (serviceType) {
            case 'daily-motivation':
                return await handleDailyMotivation(req, body);
            case 'mood-analysis':
                return await handleMoodAnalysis(req, body);
            case 'recommendations':
                return await handleRecommendations(req, body);
            default:
                return NextResponse.json(
                    { error: 'Invalid service type. Must be one of: daily-motivation, mood-analysis, recommendations' },
                    { status: 400 }
                );
        }
    } catch (error) {
        console.error('Error in AI services API route:', error);
        return NextResponse.json(
            { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}

// Daily Motivation Handler
async function handleDailyMotivation(req: NextRequest, body: DailyMotivationRequestBody) {
    try {
        const { userProfile, recentAchievements } = body;

        const messages = [
            {
                role: "system",
                content: "You are a motivational coach providing daily inspiration based on user's achievements. Keep your response concise and uplifting."
            },
            {
                role: "user",
                content: `Generate a short, personalized motivational message for ${userProfile?.user_name || 'our valued user'} based on their recent achievements: ${JSON.stringify(recentAchievements || [])}.`
            }
        ];

        const result = await tryModelsSequentially(
            messages,
            200,
            0.8
        );

        if (result.success && result.data) {
            console.log(`Daily motivation generated using model: ${result.modelUsed}`);
            return NextResponse.json({ 
                content: result.data.choices[0]?.message?.content || 'Stay motivated and keep making progress!',
                modelUsed: result.modelUsed 
            });
        }

        // Fallback response if all models fail
        console.log('All models failed, returning fallback motivation');
        return NextResponse.json({ 
            content: `Keep pushing forward! Every small step counts towards your bigger goals. You've got this! 💪`,
            modelUsed: 'fallback'
        });

    } catch (error) {
        console.error('Error in AI daily motivation:', error);
        // Fallback response
        return NextResponse.json({ 
            content: `Today is a new opportunity to achieve greatness. Keep moving forward! 🌟`,
            modelUsed: 'fallback'
        });
    }
}

// Mood Analysis Handler
async function handleMoodAnalysis(req: NextRequest, body: MoodAnalysisRequestBody) {
    try {
        const { entries } = body;

        const messages = [
            {
                role: "system",
                content: "You are a mental health assistant analyzing mood patterns from journal entries. Provide supportive and constructive insights."
            },
            {
                role: "user",
                content: `Analyze these mood patterns: ${JSON.stringify(entries?.map((e:MoodAnalysisEntry) => ({
                    date: e.created_at,
                    mood: e.mood,
                    content: e.content?.substring(0, 100) || ''
                })) || [])} and provide insights about emotional well-being trends.`
            }
        ];

        const result = await tryModelsSequentially(
            messages,
            400,
            0.7
        );

        if (result.success && result.data) {
            console.log(`Mood analysis generated using model: ${result.modelUsed}`);
            return NextResponse.json({ 
                content: result.data.choices[0]?.message?.content || 'Continue tracking your moods to better understand your emotional patterns.',
                modelUsed: result.modelUsed 
            });
        }

        // Fallback response if all models fail
        console.log('All models failed, returning fallback mood analysis');
        return NextResponse.json({ 
            content: "Based on your recent entries, remember that it's normal to have ups and downs. Consider maintaining regular self-care routines and reaching out for support when needed.",
            modelUsed: 'fallback'
        });

    } catch (error) {
        console.error('Error in AI mood analysis:', error);
        // Fallback response
        return NextResponse.json({ 
            content: "Keep tracking your moods - self-awareness is the first step to emotional well-being. Consider talking to someone if you're feeling overwhelmed.",
            modelUsed: 'fallback'
        });
    }
}

// Recommendations Handler
async function handleRecommendations(req: NextRequest, body: RecommendationsRequestBody) {
    try {
        const { context } = body;
        const taskCount = context?.tasks?.length || 0;
        const goalCount = context?.goals?.length || 0;
        const completionRate = context?.completionRate || 0;

        const messages = [
            {
                role: "system",
                content: `You are a productivity coach. Provide EXACTLY 3 recommendations in this JSON format:
{
  "suggestions": [
    {
      "type": "task" | "habit" | "goal",
      "title": "Brief actionable title",
      "description": "Detailed description",
      "priority": "high" | "medium" | "low",
      "dueDate": "YYYY-MM-DD" (optional, for tasks),
      "frequency": "daily" | "weekly" | "monthly" (optional, for habits)
    }
  ]
}
Ensure the response is valid JSON only, no markdown or extra text.`
            },
            {
                role: "user",
                content: `User metrics:
- Current tasks: ${taskCount}
- Active goals: ${goalCount}
- Completion rate: ${completionRate}%

Provide 3 specific, actionable recommendations to improve productivity.`
            }
        ];

        const result = await tryModelsSequentially(
            messages,
            500,
            0.7
        );

        if (result.success && result.data) {
            const content = result.data.choices[0]?.message?.content || '';
            
            try {
                // Clean the content - remove markdown code blocks if present
                const cleanedContent = content
                    .replace(/```json\s*/gi, '')
                    .replace(/```\s*/gi, '')
                    .trim();
                
                const parsedResponse = JSON.parse(cleanedContent);
                
                // Validate the response structure
                if (parsedResponse.suggestions && Array.isArray(parsedResponse.suggestions)) {
                    console.log(`Recommendations generated using model: ${result.modelUsed}`);
                    return NextResponse.json({
                        content: "Here are some recommendations based on your current activities:",
                        suggestions: parsedResponse.suggestions.slice(0, 3), // Ensure max 3 suggestions
                        modelUsed: result.modelUsed
                    });
                } else {
                    throw new Error('Invalid response structure');
                }
            } catch (e) {
                console.error('Failed to parse AI recommendation response:', e);
                console.error('Raw content:', content);
                console.log('Returning fallback suggestions due to parse error');
                
                // Return fallback suggestions
                return NextResponse.json({
                    ...getFallbackSuggestions(context || {}),
                    modelUsed: result.modelUsed + ' (parse error - using fallback)'
                });
            }
        }

        // Return fallback suggestions if all models fail
        console.log('All models failed, returning fallback suggestions');
        return NextResponse.json({
            ...getFallbackSuggestions(context || {}),
            modelUsed: 'fallback'
        });

    } catch (error) {
        console.error('Error in AI recommendations:', error);
        // Return fallback suggestions
        return NextResponse.json({
            ...getFallbackSuggestions(body.context || {}),
            modelUsed: 'fallback'
        });
    }
}

// Keep the same getFallbackSuggestions function as before
function getFallbackSuggestions(context: RecommendationsContext) {
    const completionRate = context?.completionRate || 0;
    const taskCount = context?.tasks?.length || 0;
    const goalCount = context?.goals?.length || 0;
    
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    const nextWeekStr = nextWeek.toISOString().split('T')[0];

    const suggestions = [];

    // Suggestion 1: Task management
    if (taskCount > 10 || completionRate < 50) {
        suggestions.push({
            type: "task",
            title: "Prioritize and review pending tasks",
            description: "Take 20 minutes to review your task list, identify top priorities, and remove or delegate less important tasks",
            priority: "high",
            dueDate: tomorrowStr
        });
    } else {
        suggestions.push({
            type: "task",
            title: "Weekly task planning session",
            description: "Schedule 30 minutes to plan your tasks for the upcoming week and set clear priorities",
            priority: "medium",
            dueDate: nextWeekStr
        });
    }

    // Suggestion 2: Habit building
    if (completionRate < 70) {
        suggestions.push({
            type: "habit",
            title: "Morning productivity routine",
            description: "Start each day with a 10-minute review of your daily priorities and goals",
            priority: "medium",
            frequency: "daily"
        });
    } else {
        suggestions.push({
            type: "habit",
            title: "Weekly reflection",
            description: "Spend 15 minutes each week reviewing your progress and celebrating achievements",
            priority: "low",
            frequency: "weekly"
        });
    }

    // Suggestion 3: Goal setting
    if (goalCount < 3) {
        suggestions.push({
            type: "goal",
            title: "Set a new personal development goal",
            description: "Choose one area of your life to improve over the next month - health, skills, or relationships",
            priority: "medium"
        });
    } else {
        suggestions.push({
            type: "goal",
            title: `Improve task completion rate to ${Math.min(completionRate + 15, 95)}%`,
            description: `Focus on completing tasks consistently to increase your productivity from ${completionRate}% to ${Math.min(completionRate + 15, 95)}%`,
            priority: "high"
        });
    }

    return {
        content: "Here are some personalized recommendations to boost your productivity:",
        suggestions: suggestions
    };
}