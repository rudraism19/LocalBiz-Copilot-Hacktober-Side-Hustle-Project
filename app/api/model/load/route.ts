import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const baseUrl = process.env.AI_SERVICE_URL || 'http://127.0.0.1:8000';
  const apiKey = process.env.AI_SERVICE_API_KEY;

  try {
    let body: any = {};
    try {
      body = await req.json();
    } catch {}

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (apiKey) {
      headers['X-API-Key'] = apiKey;
    }

    const res = await fetch(`${baseUrl}/api/load`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json(
        { error: data.detail || 'Failed to load model on inference service' },
        { status: res.status }
      );
    }

    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json(
      {
        error:
          'Could not reach local AI service at ' +
          baseUrl +
          '. Please verify `uvicorn ai_service.main:app` is running.',
      },
      { status: 503 }
    );
  }
}
