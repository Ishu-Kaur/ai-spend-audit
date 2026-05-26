import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { auditResult, teamSize, primaryUseCase } = body;

    if (!auditResult) {
      return NextResponse.json({ error: 'Missing auditResult data' }, { status: 400 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;

    // Graceful Fallback: If no API Key is provided, use the templated generator immediately
    if (!apiKey || apiKey === 'your_anthropic_api_key') {
      console.warn('Anthropic API key missing or set to placeholder. Utilizing templated fallback generator.');
      const fallback = generateFallbackSummary(auditResult, teamSize, primaryUseCase);
      return NextResponse.json({ summary: fallback });
    }

    // Call Anthropic Claude API using standard fetch
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 250,
          temperature: 0,
          messages: [
            {
              role: 'user',
              content: `You are an elite B2B SaaS Finance Auditor. Analyze this audit result and draft a tailored summary paragraph of approximately 100 words directly to the startup founder. 
              
              Startup details:
              - Team size: ${teamSize}
              - Primary use case: ${primaryUseCase}
              - Monthly savings: $${auditResult.monthlySavings}
              - Annual savings: $${auditResult.annualSavings}
              - Recommendations: ${JSON.stringify(auditResult.recommendations)}
              
              Rules:
              1. Address the founder directly and professionally.
              2. Do not use generic filler words ("Based on the data...", "Here is your summary").
              3. Explicitly reference their specific monthly savings and the most impactful tool recommendation.
              4. Limit your output strictly to under 120 words.`
            }
          ]
        })
      });

      if (!response.ok) {
        throw new Error(`Anthropic API responded with status ${response.status}`);
      }

      const data = await response.json();
      const aiSummary = data.content?.[0]?.text?.trim();

      if (aiSummary) {
        return NextResponse.json({ summary: aiSummary });
      } else {
        throw new Error('Empty response content received from Anthropic');
      }

    } catch (apiError) {
      console.error('Anthropic API call failed. Reverting to templated fallback:', apiError);
      const fallback = generateFallbackSummary(auditResult, teamSize, primaryUseCase);
      return NextResponse.json({ summary: fallback });
    }

  } catch (err) {
    console.error('API Summary endpoint crashed:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

interface FallbackAuditInput {
  monthlySavings: number;
  annualSavings: number;
  recommendations: Array<{
    toolId: string;
    savings: number;
    reason: string;
  }>;
}

// Graceful, mathematically aligned fallback summary generator function
function generateFallbackSummary(audit: FallbackAuditInput, teamSize: number, useCase: string): string {
  const topSaving = [...audit.recommendations].sort((a, b) => b.savings - a.savings)[0];

  if (audit.monthlySavings === 0) {
    return `Your AI software stack is fully optimized for your team of ${teamSize} focusing on ${useCase}. Our audit confirms your configurations align with current 2026 retail price minimums. We suggest maintaining your current setup and subscribing to our alerts below to be notified as soon as new optimization rules are released.`;
  }

  return `We analyzed your AI spend and discovered an estimated $${audit.monthlySavings}/month ($${audit.annualSavings}/year) in potential savings. The most immediate opportunity lies in your ${topSaving.toolId.toUpperCase()} configuration: ${topSaving.reason} Doing so will instantly eliminate $${topSaving.savings}/month of waste without disrupting your active team workflows.`;
}