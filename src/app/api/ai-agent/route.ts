//app/api/ai-agent/route.ts
import { NextResponse } from 'next/server';
import { AIAgent } from '../../lib/ai-agent';
import { AIContext } from '../../types/ai-agent';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// Handle OPTIONS request for CORS
export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, context } = body;
    
    if (!action || !context) {
      return NextResponse.json(
        { 
          error: 'Missing required fields',
          details: {
            action: !action ? 'Action is required' : null,
            context: !context ? 'Context is required' : null
          }
        },
        { 
          status: 400,
          headers: corsHeaders
        }
      );
    }

    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json(
        { 
          error: 'Configuration error',
          details: 'Groq API key is not configured in environment variables'
        },
        { 
          status: 500,
          headers: corsHeaders
        }
      );
    }

    const aiAgent = AIAgent.getInstance();

    switch (action) {
      case 'getSuggestions':
        const suggestions = await aiAgent.getSuggestions(context as AIContext);
        return NextResponse.json(
          { suggestions },
          { headers: corsHeaders }
        );

      case 'getWeeklyInsight':
        const insight = await aiAgent.getWeeklyInsight(context as AIContext);
        return NextResponse.json(
          { insight },
          { headers: corsHeaders }
        );

      case 'getSmartSuggestions':
        const { userPrompt } = body;
        if (typeof userPrompt !== 'string' || !userPrompt.trim()) {
          return NextResponse.json(
            { 
              error: 'Missing or invalid user prompt',
              details: 'userPrompt is required for getSmartSuggestions action'
            },
            { 
              status: 400,
              headers: corsHeaders
            }
          );
        }
        const smartSuggestions = await aiAgent.getSmartSuggestions(context as AIContext, userPrompt);
        return NextResponse.json(
          { suggestions: smartSuggestions },
          { headers: corsHeaders }
        );

      default:
        return NextResponse.json(
          { 
            error: 'Invalid action',
            details: `Action "${action}" is not supported. Supported actions are: getSuggestions, getWeeklyInsight, getSmartSuggestions`
          },
          { 
            status: 400,
            headers: corsHeaders
          }
        );
    }
  } catch (error) {
    console.error('AI Agent API Error:', error);
    
    // Log Groq-specific errors
    if (typeof error === 'object' && error !== null && 'response' in error) {
      console.error('Groq API response:', (error as { response: unknown }).response);
    }
    
    let errorMessage = 'An unexpected error occurred';
    let errorStack = undefined;
    let isKnownError = false;

    if (error instanceof Error) {
      errorMessage = error.message;
      errorStack = process.env.NODE_ENV === 'development' ? error.stack : undefined;
      isKnownError = error.message.includes('Groq API error');
    }
    
    return NextResponse.json(
      { 
        error: isKnownError ? 'Groq API error' : 'Internal server error',
        message: errorMessage,
        details: errorStack
      },
      {
        status: 500,
        headers: corsHeaders
      }
    );
  }
}