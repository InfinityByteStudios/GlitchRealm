// Example Netlify Function using AI Gateway
// This demonstrates how to use Netlify's built-in AI credentials
// AI Gateway automatically provides credentials for OpenAI, Anthropic, and Google

import Anthropic from '@anthropic-ai/sdk';

export default async (req, context) => {
  try {
    // Parse request
    const { prompt, gameContext } = await req.json();
    
    if (!prompt) {
      return Response.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    // AI Gateway provides credentials automatically
    // No need to manually set API keys!
    const anthropic = new Anthropic();
    
    // Example: AI-powered game recommendations
    const systemPrompt = `You are a gaming expert assistant for GlitchRealm, 
    a cyberpunk-themed browser gaming platform. Help users discover games, 
    provide gameplay tips, and explain game mechanics in an engaging, 
    tech-savvy style. Keep responses concise and actionable.`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: gameContext 
            ? `Game context: ${gameContext}\n\nUser question: ${prompt}`
            : prompt
        }
      ]
    });

    // Extract response
    const responseText = message.content[0].text;

    return Response.json({
      success: true,
      response: responseText,
      model: message.model,
      usage: {
        inputTokens: message.usage.input_tokens,
        outputTokens: message.usage.output_tokens
      }
    });

  } catch (error) {
    console.error('AI Gateway Error:', error);
    
    // Return error details for debugging
    return Response.json(
      {
        success: false,
        error: error.message,
        // Include helpful context for debugging
        hint: 'Check Netlify dashboard for AI Gateway configuration'
      },
      { status: 500 }
    );
  }
};

export const config = {
  path: '/api/ai/chat',
  method: ['POST']
};

/* 
 * Usage Example (from frontend):
 * 
 * fetch('/api/ai/chat', {
 *   method: 'POST',
 *   headers: { 'Content-Type': 'application/json' },
 *   body: JSON.stringify({
 *     prompt: 'What are some games similar to ByteWars?',
 *     gameContext: 'User enjoys strategy and cyberpunk themes'
 *   })
 * })
 * .then(r => r.json())
 * .then(data => console.log(data.response));
 */
