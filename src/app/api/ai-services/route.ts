import { NextResponse, NextRequest } from 'next/server';
import { models } from "../../models"; // Corrected import path

interface RecommendationsRequestBody {
    serviceType: 'recommendations';
    context?: RecommendationsContext;
}

interface MoodAnalysisRequestBody {
    serviceType: 'mood-analysis';
    entries?: MoodAnalysisEntry[];
}

interface MoodAnalysisEntry {
    content?: string;
    mood?: string;
    created_at: string;
}

interface ChatMessage {
    role: "system" | "user";
    content: string;
}

// Placeholder for GROQ_API_KEY - ensure this is defined in your environment
const GROQ_API_KEY = process.env.GROQ_API_KEY;

if (!GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY is not set in environment variables");
}

async function tryModelsSequentially(messages: ChatMessage[], maxTokens: number, temperature: number): Promise<{ success: boolean; data: { choices: { message: { content: string } }[] } | null; modelUsed: string } | { success: false; data: null; modelUsed: "none"; }> {
    let lastError: Error | null = null;
    const triedModels: string[] = [];

    for (const model of models) {
        triedModels.push(model);
        try {
            console.log(`Trying model: ${model}`);

            const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${GROQ_API_KEY}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: model,
                    messages: messages,
                    temperature: temperature,
                    max_tokens: maxTokens,
                }),
            });

            if (!response.ok) {
                const text = await response.text();
                let message = text;
                try {
                    const error = JSON.parse(text);
                    message = error.message || response.statusText || text;
                } catch {
                    // If JSON parsing fails, use the raw text
                }

                if (response.status === 429) {
                    console.warn(`Rate limit exceeded for model ${model}, trying next model...`);
                    lastError = new Error(`Rate limit exceeded for model ${model}`);
                    continue; // Try next model
                }

                throw new Error(`Groq API error with model ${model}: ${message}`);
            }

            const data = await response.json();
            console.log(`Successfully used model: ${model}`);
            return { success: true, data: data, modelUsed: model };

        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error(`Error calling AI model ${model}:`, errorMessage);
            lastError = error instanceof Error ? error : new Error(errorMessage);
            // Continue to next model if there's an error
        }
    }

    // If all models failed
    const errorMessage = `All AI models failed after trying: ${triedModels.join(', ')}. Last error: ${lastError?.message || 'Unknown error'}`;
    console.error(errorMessage);
    return { success: false, data: null, modelUsed: "none" };
}

//  the RecommendationsContext interface
interface RecommendationsContext {
    tasks?: Array<{
        id: string;
        title: string;
        description?: string;
        status: string;
        created_at: string;
        completed_at?: string;
        goal_id?: string;
    }>;
    goals?: Array<{
        id: string;
        title: string;
        description?: string;
        status: string;
        created_at: string;
        progress: number;
        deadline?: string;
    }>;
    habits?: Array<{
        id: string;
        title: string;
        description?: string;
        frequency: string;
        last_completed?: string;
        streak?: number;
    }>;
    journals?: Array<{
        id: string;
        content: string;
        mood?: string;
        created_at: string;
    }>;
    completionRate?: number;
}

// Replace the existing handleRecommendations function
async function handleRecommendations(req: NextRequest, body: RecommendationsRequestBody) {
    try {
        const { context } = body;
        
        // Analyze user patterns
        const analysis = analyzeUserPatterns(context);
        
        const messages: ChatMessage[] = [
            {
                role: "system",
                content: `You are a personalized productivity coach analyzing specific user data. Provide EXACTLY 3 highly specific recommendations based on their actual activities, goals, and habits.

IMPORTANT: Base recommendations on their ACTUAL data:
- Reference specific goals by name
- Mention specific habits they\'ve been missing
- Suggest tasks related to their existing projects
- Consider their journal mood patterns

Return ONLY valid JSON in this format:
{
  "suggestions": [
    {
      "type": "task" | "habit" | "goal" | "journal",
      "title": "Specific actionable title referencing their actual work",
      "description": "Detailed description mentioning their specific goals/habits",
      "priority": "high" | "medium" | "low",
      "relatedGoalId": "goal-id if applicable",
      "relatedHabitId": "habit-id if applicable",
      "dueDate": "YYYY-MM-DD" (optional, for tasks),
      "frequency": "daily" | "weekly" | "monthly" (optional, for habits),
      "content": "Full journal entry content" (required for journal type),
      "mood": "happy" | "sad" | "neutral" | "excited" | "stressed" | "angry" (required for journal type),
      "tags": ["tag1", "tag2"] (optional array of strings)
    }
  ]
}`
            },
            {
                role: "user",
                content: `Analyze this user\'s data and provide personalized recommendations:\n\n${analysis}\n\nRecent Goals:\n${context?.goals?.slice(0, 5).map(g => `- "${g.title}" (${g.progress}% complete, status: ${g.status})`).join('\n') || 'No goals'}\n\nRecent Tasks:\n${context?.tasks?.slice(0, 10).map(t => `- "${t.title}" (status: ${t.status}, created: ${new Date(t.created_at).toLocaleDateString()})`).join('\n') || 'No tasks'}\n\nHabits:\n${context?.habits?.map(h => `- "${h.title}" (${h.frequency}, last completed: ${h.last_completed ? new Date(h.last_completed).toLocaleDateString() : 'Never'})`).join('\n') || 'No habits'}\n\nRecent Journal Mood:\n${context?.journals?.slice(0, 3).map(j => `- ${j.mood || 'neutral'} (${new Date(j.created_at).toLocaleDateString()})`).join('\n') || 'No journal entries'}\n\nProvide 3 specific recommendations based on their actual activities, not generic advice.`
            }
        ];

        const result = await tryModelsSequentially(
            messages,
            600,
            0.7
        );

        if (result.success && result.data && result.data.choices) {
            const rawContent = result.data.choices[0]?.message?.content || '';
            const content = removeThinkTags(rawContent);
            
            try {
                const cleanedContent = content
                    .replace(/```json\s*/gi, '')
                    .replace(/```\s*/gi, '')
                    .trim();
                
                const parsedResponse = JSON.parse(cleanedContent);
                
                if (parsedResponse.suggestions && Array.isArray(parsedResponse.suggestions)) {
                    console.log(`Personalized recommendations generated using model: ${result.modelUsed}`);
                    return NextResponse.json({
                        content: "Based on your specific activities and patterns, here are personalized recommendations:",
                        suggestions: parsedResponse.suggestions.slice(0, 3),
                        modelUsed: result.modelUsed
                    });
                }
            } catch (e) {
                console.error('Failed to parse AI recommendation response:', e);
            }
        }

        // Return personalized fallback suggestions based on actual data
        return NextResponse.json(getPersonalizedFallbackSuggestions(context || {}));

    } catch (error) {
        console.error('Error in AI recommendations:', error);
        return NextResponse.json(getPersonalizedFallbackSuggestions(body.context || {}));
    }
}

// Add new helper function to analyze user patterns
function analyzeUserPatterns(context: RecommendationsContext | undefined) {
    if (!context) return "No user data available";
    
    const patterns = [];
    
    // Analyze inactive goals
    const inactiveGoals = context.goals?.filter(goal => {
        if (goal.status !== 'active') return false;
        
        // Check if there are recent tasks for this goal
        const recentTasksForGoal = context.tasks?.filter(task => 
            task.goal_id === goal.id && 
            new Date(task.created_at) > new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) // 2 weeks
        );
        
        return !recentTasksForGoal || recentTasksForGoal.length === 0;
    });
    
    if (inactiveGoals && inactiveGoals.length > 0) {
        patterns.push(`Inactive goals (no tasks in 2+ weeks): ${inactiveGoals.map(g => `"${g.title}"`).join(', ')}`);
    }
    
    // Analyze neglected habits
    const neglectedHabits = context.habits?.filter(habit => {
        if (!habit.last_completed) return true;
        
        const daysSinceLastCompleted = Math.floor(
            (Date.now() - new Date(habit.last_completed).getTime()) / (1000 * 60 * 60 * 24)
        );
        
        if (habit.frequency === 'daily' && daysSinceLastCompleted > 2) return true;
        if (habit.frequency === 'weekly' && daysSinceLastCompleted > 10) return true;
        
        return false;
    });
    
    if (neglectedHabits && neglectedHabits.length > 0) {
        patterns.push(`Neglected habits: ${neglectedHabits.map(h => `"${h.title}" (${h.frequency})`).join(', ')}`);
    }
    
    // Analyze task completion patterns
    const recentTasks = context.tasks?.filter(task => 
        new Date(task.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    );
    
    const completedRecentTasks = recentTasks?.filter(t => t.status === 'completed').length || 0;
    const totalRecentTasks = recentTasks?.length || 0;
    
    if (totalRecentTasks > 0) {
        const recentCompletionRate = Math.round((completedRecentTasks / totalRecentTasks) * 100);
        patterns.push(`Recent task completion rate (last 7 days): ${recentCompletionRate}%`);
    }
    
    // Analyze mood trends
    const recentMoods = context.journals?.slice(0, 7).map(j => j.mood).filter(Boolean);
    if (recentMoods && recentMoods.length > 0) {
        const moodCounts = recentMoods.reduce((acc: Record<string, number>, mood) => {
            acc[mood as string] = (acc[mood as string] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
        
        const dominantMood = Object.entries(moodCounts).sort((a, b) => b[1] - a[1])[0];
        patterns.push(`Recent mood trend: ${dominantMood[0]} (${dominantMood[1]}/${recentMoods.length} entries)`);
    }
    
    return patterns.join('\n') || "Limited activity data available";
}

// Replace getFallbackSuggestions with getPersonalizedFallbackSuggestions
function getPersonalizedFallbackSuggestions(context: RecommendationsContext) {
    const suggestions = [];
    
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    
    // Check for inactive goals
    const inactiveGoal = context.goals?.find(goal => {
        if (goal.status !== 'active') return false;
        
        const recentTasksForGoal = context.tasks?.filter(task => 
            task.goal_id === goal.id && 
            new Date(task.created_at) > new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
        );
        
        return !recentTasksForGoal || recentTasksForGoal.length === 0;
    });
    
    if (inactiveGoal) {
        // Look for similar past tasks for this goal
        const pastTaskForGoal = context.tasks?.find(t => t.goal_id === inactiveGoal.id);
        
        suggestions.push({
            type: "task",
            title: `Continue work on "${inactiveGoal.title}"`,
            description: `You haven't created any tasks for your goal "${inactiveGoal.title}" in over 2 weeks. ${
                pastTaskForGoal 
                    ? `Previously, you worked on "${pastTaskForGoal.title}". Consider creating a similar task to maintain momentum.`
                    : `Break down this goal into a specific actionable task to get back on track.`
            }`,
            priority: "high",
            relatedGoalId: inactiveGoal.id,
            dueDate: tomorrowStr
        });
    }
    
    // Check for neglected habits
    const neglectedHabit = context.habits?.find(habit => {
        if (!habit.last_completed) return true;
        
        const daysSinceLastCompleted = Math.floor(
            (Date.now() - new Date(habit.last_completed).getTime()) / (1000 * 60 * 60 * 24)
        );
        
        return (habit.frequency === 'daily' && daysSinceLastCompleted > 2) ||
               (habit.frequency === 'weekly' && daysSinceLastCompleted > 10);
    });
    
    if (neglectedHabit) {
        const daysSince = neglectedHabit.last_completed 
            ? Math.floor((Date.now() - new Date(neglectedHabit.last_completed).getTime()) / (1000 * 60 * 60 * 24))
            : null;
            
        suggestions.push({
            type: "task",
            title: `Complete your ${neglectedHabit.frequency} habit: "${neglectedHabit.title}"`,
            description: `${
                daysSince 
                    ? `It's been ${daysSince} days since you last completed this habit.`
                    : `You haven't completed this habit yet.`
            } ${neglectedHabit.description || 'Take a moment to maintain this important routine.'}`,
            priority: "medium",
            relatedHabitId: neglectedHabit.id,
            dueDate: tomorrowStr
        });
    }
    
    // Fill remaining slots with contextual suggestions
    while (suggestions.length < 3) {
        if (!suggestions.some(s => s.type === 'goal') && context.goals && context.goals.length < 3) {
            suggestions.push({
                type: "goal",
                title: "Set a new milestone goal",
                description: `You currently have ${context.goals.length} active goals. Consider setting a new specific, measurable goal in an area you want to improve.`,
                priority: "medium"
            });
        } else if (!suggestions.some(s => s.type === 'task') && context.tasks && context.tasks.length > 0) {
            // Suggest task based on recent incomplete tasks
            const incompleteTasks = context.tasks.filter(t => t.status === 'pending' || t.status === 'in_progress');
            if (incompleteTasks.length > 10) {
                suggestions.push({
                    type: "task",
                    title: "Review and prioritize pending tasks",
                    description: `You have ${incompleteTasks.length} incomplete tasks. Take 20 minutes to review them and either complete, delegate, or remove tasks that are no longer relevant.`,
                    priority: "high",
                    dueDate: tomorrowStr
                });
            } else if (incompleteTasks.length > 0) {
                const oldestTask = incompleteTasks.sort((a, b) => 
                    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
                )[0];
                
                const daysOld = Math.floor(
                    (Date.now() - new Date(oldestTask.created_at).getTime()) / (1000 * 60 * 60 * 24)
                );
                
                suggestions.push({
                    type: "task",
                    title: `Complete: "${oldestTask.title}"`,
                    description: `This task has been pending for ${daysOld} days. ${oldestTask.description || 'Consider completing it or breaking it down into smaller steps.'}`,
                    priority: "high",
                    dueDate: tomorrowStr
                });
            }
        } else {
            // Default suggestion if no specific patterns found
            suggestions.push({
                type: "task",
                title: "Weekly planning session",
                description: "Set aside 30 minutes to plan your upcoming week, review goals, and set priorities.",
                priority: "medium",
                dueDate: tomorrowStr
            });
        }
    }
    
    return {
        content: "Based on your specific activities and patterns, here are personalized recommendations:",
        suggestions: suggestions.slice(0, 3) // Ensure exactly 3 suggestions
    };
}

// Update the mood analysis handler to be more personalized as well
async function handleMoodAnalysis(req: NextRequest, body: MoodAnalysisRequestBody) {
    try {
        const { entries } = body;
        
        // Analyze specific patterns in the user's journal entries
        const moodPatterns = analyzeMoodPatterns(entries || []);

        const messages: ChatMessage[] = [
            {
                role: "system",
                content: `You are an AI mood analyst. Analyze the user's journal entries and provide a concise, empathetic summary of their recent mood patterns. Focus on trends and potential contributing factors. Include a personalized, actionable tip. If mood data is sparse, provide general encouragement.

Return ONLY valid JSON in this format:
{
  "summary": "Your mood has been...",
  "trend": "positive" | "negative" | "stable" | "mixed",
  "tip": "Try to..."
}`
            },
            {
                role: "user",
                content: `Analyze my recent journal entries for mood patterns and provide a summary, trend, and tip:

${entries?.map(entry => `- Date: ${new Date(entry.created_at).toLocaleDateString()}, Mood: ${entry.mood || 'neutral'}, Content: ${entry.content?.substring(0, 100) || ''}...`).join('\n') || 'No entries provided.'}`
            }
        ];

        const result = await tryModelsSequentially(
            messages,
            250,
            0.7
        );

        if (result.success && result.data && result.data.choices) {
            const rawContent = result.data.choices[0]?.message?.content || '';
            const content = removeThinkTags(rawContent);

            try {
                const parsedResponse = JSON.parse(content);
                if (parsedResponse.summary && parsedResponse.trend && parsedResponse.tip) {
                    console.log(`Mood analysis generated using model: ${result.modelUsed}`);
                    return NextResponse.json({
                        summary: parsedResponse.summary,
                        trend: parsedResponse.trend,
                        tip: parsedResponse.tip,
                        modelUsed: result.modelUsed
                    });
                }
            } catch (e) {
                console.error('Failed to parse AI mood analysis response:', e);
            }
        }

        // Fallback response for mood analysis
        return NextResponse.json({
            content: getPersonalizedMoodAnalysisFallback(entries || []),
            modelUsed: "none" // Indicate fallback was used
        });

    } catch (error) {
        console.error('Error in AI mood analysis:', error);
        return NextResponse.json({
            error: 'Internal server error', 
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}

// Add helper function to analyze mood patterns
function analyzeMoodPatterns(entries: MoodAnalysisEntry[]) {
    if (!entries || entries.length === 0) return "No mood data available";
    
    const patterns = [];
    
    // Count mood frequencies
    const moodCounts = entries.reduce((acc: Record<string, number>, entry) => {
        const mood = entry.mood || 'neutral';
        acc[mood] = (acc[mood] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);
    
    const totalEntries = entries.length;
    const moodPercentages = Object.entries(moodCounts).map(([mood, count]) => 
        `${mood}: ${Math.round((count / totalEntries) * 100)}%`
    );
    patterns.push(`Mood distribution: ${moodPercentages.join(', ')}`);
    
    // Check for mood streaks
    let currentStreak = 1;
    let longestStreak = 1;
    let streakMood = entries[0]?.mood;
    
    for (let i = 1; i < entries.length; i++) {
        if (entries[i].mood === entries[i-1].mood) {
            currentStreak++;
            if (currentStreak > longestStreak) {
                longestStreak = currentStreak;
                streakMood = entries[i].mood;
            }
        } else {
            currentStreak = 1;
        }
    }
    
    if (longestStreak > 2) {
        patterns.push(`Longest mood streak: ${longestStreak} consecutive "${streakMood}" entries`);
    }
    
    // Check for day-of-week patterns
    const dayMoods: Record<string, string[]> = {};
    entries.forEach((entry: MoodAnalysisEntry) => {
        const day = new Date(entry.created_at).toLocaleDateString('en-US', { weekday: 'long' });
        if (!dayMoods[day]) dayMoods[day] = [];
        dayMoods[day].push(entry.mood || 'neutral');
    });
    
    const dayPatterns = Object.entries(dayMoods).map(([day, moods]) => {
        const negativeMoods = moods.filter(m => m === 'negative').length;
        const positiveMoods = moods.filter(m => m === 'positive').length;
        if (negativeMoods > positiveMoods * 2) return `${day}s tend to be challenging`;
        if (positiveMoods > negativeMoods * 2) return `${day}s tend to be positive`;
        return null;
    }).filter(Boolean);
    
    if (dayPatterns.length > 0) {
        patterns.push(`Day patterns: ${dayPatterns.join(', ')}`);
    }
    
    // Check for content themes
    const negativeEntries = entries.filter(e => e.mood === 'negative' && e.content);
    const positiveEntries = entries.filter(e => e.mood === 'positive' && e.content);
    
    if (negativeEntries.length > 0) {
        const commonNegativeWords = findCommonThemes(negativeEntries.map(e => e.content || ''));
        if (commonNegativeWords.length > 0) {
            patterns.push(`Common themes in negative moods: ${commonNegativeWords.join(', ')}`);
        }
    }
    
    return patterns.join('\n') || "Limited mood pattern data";
}

// Helper function to find common themes in text
function findCommonThemes(texts: string[]): string[] {
    const commonKeywords = [
        'work', 'stress', 'tired', 'family', 'health', 'money', 'relationship',
        'sleep', 'exercise', 'deadline', 'meeting', 'project', 'friend', 'weekend'
    ];
    
    const combined = texts.join(' ').toLowerCase();
    const themes = commonKeywords.filter(keyword => 
        combined.includes(keyword) && 
        texts.filter(t => t.toLowerCase().includes(keyword)).length >= 2
    );
    
    return themes.slice(0, 3);
}

// Add personalized mood analysis fallback
function getPersonalizedMoodAnalysisFallback(entries: MoodAnalysisEntry[]): string {
    if (!entries || entries.length === 0) {
        return "Start tracking your moods regularly to gain insights into your emotional patterns. Even brief entries can help you understand what influences your well-being.";
    }
    
    const recentMoods = entries.slice(0, 7);
    const negativeMoods = recentMoods.filter(e => e.mood === 'negative').length;
    const positiveMoods = recentMoods.filter(e => e.mood === 'positive').length;
    
    if (negativeMoods > positiveMoods * 2) {
        return `I notice you've had ${negativeMoods} challenging days recently. ${
            entries[0].content?.toLowerCase().includes('work') 
                ? "Work seems to be a source of stress. Consider setting boundaries or talking to someone about workload management."
                : "Remember that it's okay to have difficult periods. Consider reaching out to friends, family, or a professional for support."
        } Small self-care activities might help - even a 5-minute walk or breathing exercise can make a difference.`;
    } else if (positiveMoods > negativeMoods * 2) {
        return `Great to see ${positiveMoods} positive entries recently! ${
            entries.find(e => e.mood === 'positive')?.content?.toLowerCase().includes('exercise')
                ? "Exercise seems to be contributing to your positive mood - keep it up!"
                : "Whatever you're doing is working well. Consider noting what specific activities or thoughts contribute to these positive days."
        } Keep building on these positive patterns.`;
    } else {
        return `Your mood has been balanced lately with a mix of ups and downs - this is completely normal. ${
            entries.length > 10 
                ? "Your consistent journaling is helping you build self-awareness. Look back at your entries to identify what activities or situations tend to improve your mood."
                : "Try to journal more consistently to better understand your patterns. Even brief daily check-ins can reveal important insights over time."
        }`;
    }
}

// Update daily motivation to be more personalized
async function handleDailyMotivation( body: DailyMotivationRequestBody) {
    try {
        const { userProfile, recentAchievements, recentGoals, recentTasks } = body; // No need to cast body here

        const messages: ChatMessage[] = [
            {
                role: "system",
                content: `You are a personal motivational coach who knows the user well. Create highly personalized motivation based on:
- Their specific goals and progress
- Recent completed tasks and achievements
- Current challenges they\'re facing
- Their name and personal context
- If the user doesn\'t created or have info that can produce a personalized motivation you should create a messages motivational for the user to encoursge him to work and success in his life
Keep messages short, specific, and actionable. Reference their actual work and goals by name.`

            },
            {
                role: "user",
                content: `Create a personalized motivational message for ${userProfile?.user_name || 'this user'}:

Recent Achievements:
${recentAchievements?.map(a => `- Completed: "${a.title}" (${a.type})`).join('\n') || 'No recent completions'}

Current Goals:
${recentGoals?.map(g => `- "${g.title}" (${g.progress}% complete)`).join('\n') || 'No active goals'}

Recent Tasks:
${recentTasks?.slice(0, 5).map(t => `- "${t.title}" (${t.status})`).join('\n') || 'No recent tasks'}

Create a short, personalized message that:
1. Acknowledges their specific progress
2. Addresses any stalled goals or tasks
3. Provides specific encouragement related to their actual work`
            }
        ];

        const result = await tryModelsSequentially(
            messages,
            250,
            0.8
        );

        if (result.success && result.data && result.data.choices) {
            const rawContent = result.data.choices[0]?.message?.content || 'Keep pushing forward with your goals!';
            const content = removeThinkTags(rawContent);
            
            console.log(`Personalized motivation generated using model: ${result.modelUsed}`);
            return NextResponse.json({
                content: content,
                modelUsed: result.modelUsed
            });
        }

        // Personalized fallback response
        return NextResponse.json(getPersonalizedMotivationFallback(userProfile, recentAchievements, recentGoals, recentTasks));

    } catch (error) {
        console.error('Error in AI daily motivation:', error);
        return NextResponse.json(getPersonalizedMotivationFallback(
                body.userProfile,
                body.recentAchievements,
                body.recentGoals,
                body.recentTasks
            ));
    }
}

// Add personalized motivation fallback
function getPersonalizedMotivationFallback(
    userProfile: DailyMotivationRequestBody['userProfile'],
    recentAchievements: DailyMotivationRequestBody['recentAchievements'],
    recentGoals: DailyMotivationRequestBody['recentGoals'],
    recentTasks: DailyMotivationRequestBody['recentTasks']
): string {
    const userName = userProfile?.user_name || 'there';
    
    // Check for recent completions
    if (recentAchievements && recentAchievements.length > 0) {
        const latestAchievement = recentAchievements[0];
        return `Great job completing "${latestAchievement.title}", ${userName}! 🎉 This momentum is exactly what will help you reach your ${recentGoals?.[0]?.title || 'goals'}. Keep this energy going!`;
    }
    
    // Check for stalled goals
    const stalledGoal = recentGoals?.find(g => g.progress < 30 && g.status === 'active');
    if (stalledGoal) {
        return `Hey ${userName}, your goal "${stalledGoal.title}" is waiting for you! Start with just one small task today. Remember, ${stalledGoal.progress}% progress is better than 0%. You've got this! 💪`;
    }
    
    // Check for pending tasks
    const pendingTaskCount = recentTasks?.filter(t => t.status === 'pending').length || 0;
    if (pendingTaskCount > 5) {
        return `${userName}, you have ${pendingTaskCount} tasks waiting. Pick the most important one and tackle it first. Your future self will thank you! Remember: progress over perfection. 🚀`;
    }
    
    // Check for high-progress goals
    const almostCompleteGoal = recentGoals?.find(g => g.progress > 70 && g.progress < 100);
    if (almostCompleteGoal) {
        return `${userName}, you're ${almostCompleteGoal.progress}% done with "${almostCompleteGoal.title}"! Just a final push to reach 100%. This is your moment - finish strong! 🏆`;
    }
    
    // Default personalized message
    if (recentGoals && recentGoals.length > 0) {
        return `${userName}, you're working on ${recentGoals.length} goals. Remember why you started "${recentGoals[0].title}". Every step forward counts, no matter how small. Make today count! ⭐`;
    }
    
    return `Welcome back, ${userName}! Today is a fresh opportunity to make progress. What's one thing you can do right now to move closer to your dreams? Start there! 🌟`;
}

// Update the RequestBody interfaces to include more context
interface DailyMotivationRequestBody {
    serviceType: 'daily-motivation';
    userProfile?: { user_name?: string };
    recentAchievements?: Array<{
        id: string;
        title: string;
        type: string;
        completed_at: string;
    }>;
    recentGoals?: Array<{
        id: string;
        title: string;
        progress: number;
        status: string;
    }>;
    recentTasks?: Array<{
        id: string;
        title: string;
        status: string;
    }>;
}

// Export the updated handler
export async function POST(req: NextRequest) {
    if (!GROQ_API_KEY) {
        console.error('GROQ_API_KEY is not set');
        return NextResponse.json(
            { error: 'API key not configured' },
            { status: 500 }
        );
    }

    try {
        const body: DailyMotivationRequestBody | MoodAnalysisRequestBody | RecommendationsRequestBody = await req.json();

        // Route to appropriate service based on serviceType
        switch (body.serviceType) {
            case 'daily-motivation':
                return await handleDailyMotivation(body);
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

// Helper function to remove <think> tags and their content (more robust version)
function removeThinkTags(content: string): string {
    // Remove everything between <think> and </think> tags, including the tags themselves
    // Handle multiple variations and nested content
    let cleaned = content
        .replace(/<think>[\s\S]*?<\/think>/gi, '')
        .replace(/<think>[\s\S]*/gi, '') // Handle unclosed tags
        .replace(/[\s\S]*<\/think>/gi, '') // Handle unopened closing tags
        .trim();
    
    // If the entire response starts with think content, extract what comes after
    if (cleaned === '' && content.includes('</think>')) {
        const parts = content.split('</think>');
        if (parts.length > 1) {
            cleaned = parts.slice(1).join('</think>').trim();
        }
    }
    
    return cleaned;
}