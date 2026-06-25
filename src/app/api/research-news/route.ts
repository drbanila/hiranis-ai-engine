import { getResearchNews } from '@/app/lib/research-news';

export const revalidate = 86_400;

export async function GET() {
  try {
    const payload = await getResearchNews();
    return Response.json(payload, {
      headers: {
        'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=3600',
      },
    });
  } catch (err) {
    console.error('[research-news]', err);
    return Response.json(
      {
        items: [
          {
            headline: 'Latest research updates temporarily unavailable',
            summary: 'Please check back shortly — feeds refresh daily from PubMed, Gemini, and Groq.',
            topic: 'Research',
            source: 'Banu\'s AI Engine',
          },
        ],
        updatedAt: new Date().toISOString(),
        providers: [],
      },
      { status: 200 },
    );
  }
}
