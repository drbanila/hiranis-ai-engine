import { google } from '@ai-sdk/google';
import { streamText, convertToModelMessages, type UIMessage } from 'ai';

// Allow streaming responses up to 30 seconds.
export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = streamText({
    model: google('gemini-2.5-flash'),
    system:
      "You are Hirani's AI Engine, a thoughtful and concise cloud intelligence. " +
      'Help the user explore ideas clearly and helpfully.',
    messages: await convertToModelMessages(messages),
  });

  return result.toUIMessageStreamResponse();
}
