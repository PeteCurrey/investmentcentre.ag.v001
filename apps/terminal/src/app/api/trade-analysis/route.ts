import { NextResponse } from 'next/server';
import { requireSession } from '../../../lib/auth';

export async function POST(request: Request) {
  try {
    await requireSession();
  } catch {
    return NextResponse.json({ error: 'UNAUTHORIZED: Authentication required.' }, { status: 401 });
  }
  const body = await request.json() as { instrument: string; direction: string; units: string; stopLoss: string; takeProfit: string; timeframe: string; currentPrice: string };
  const { instrument, direction, units, stopLoss, takeProfit, timeframe, currentPrice } = body;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'Anthropic API key not configured' }, { status: 500 });
  }

  const prompt = `You are Meridian's AI Trading Co-Pilot, integrated directly into a professional trading terminal.
A trader has set up the following trade setup and is requesting your expert analysis:

Instrument: ${instrument}
Proposed Direction: ${direction}
Units / Volume: ${units}
Current Market Price: ${currentPrice}
Stop Loss Level: ${stopLoss}
Take Profit Level: ${takeProfit}
Chart Timeframe: ${timeframe}

Based on this setup, provide a concise but high-quality trading analysis covering:
1. Trade Quality Rating
2. Risk:Reward Assessment: Calculate the R:R ratio from the price levels provided
3. Technical Context: Comment on what RSI, MACD, Bollinger Bands, and EMA signals you'd expect for ${instrument} given the proposed direction
4. Key risks specific to this setup
5. A single clear recommendation sentence

Format your response as JSON with this exact structure (no markdown, raw JSON only):
{
  "rating": "HIGH CONVICTION BUY",
  "rrRatio": "1 : 2.10",
  "rsiContext": "one line RSI comment",
  "macdContext": "one line MACD comment",
  "bbContext": "one line Bollinger Bands comment",
  "consensusScore": "88% Conviction",
  "keyRisk": "one line key risk",
  "summary": "2-3 sentence expert summary"
}

Rating must be one of: HIGH CONVICTION BUY, MODERATE BUY, NEUTRAL, MODERATE SELL, HIGH CONVICTION SELL, CAUTION, AVOID`;

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-5',
        max_tokens: 700,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    const data = await res.json() as { error?: { message?: string }; content?: { text: string }[] };

    if (!res.ok) {
      return NextResponse.json({ error: data.error?.message || 'Anthropic API error' }, { status: res.status });
    }

    const raw: string = data.content?.[0]?.text || '{}';
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: 'AI response could not be parsed as JSON' }, { status: 500 });
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return NextResponse.json({ success: true, analysis: parsed });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
