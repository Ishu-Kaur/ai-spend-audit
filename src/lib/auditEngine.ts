export interface ToolInput {
  toolId: string; // e.g., 'cursor', 'chatgpt', 'claude', 'copilot', 'windsurf'
  plan: string;   // e.g., 'pro', 'business', 'team', 'enterprise'
  monthlySpend: number;
  seats: number;
}

export interface AuditInput {
  teamSize: number;
  primaryUseCase: 'coding' | 'writing' | 'data' | 'research' | 'mixed';
  tools: ToolInput[];
}

export interface ToolRecommendation {
  toolId: string;
  currentPlan: string;
  currentSpend: number;
  recommendedPlan: string;
  recommendedSpend: number;
  savings: number;
  reason: string;
}

export interface AuditResult {
  totalCurrentSpend: number;
  totalRecommendedSpend: number;
  monthlySavings: number;
  annualSavings: number;
  recommendations: ToolRecommendation[];
  isHighSavings: boolean; // Savings > $500/month triggers Credex consultation CTA
}

export function runAudit(input: AuditInput): AuditResult {
  let totalCurrentSpend = 0;
  let totalRecommendedSpend = 0;
  const recommendations: ToolRecommendation[] = [];

  for (const tool of input.tools) {
    totalCurrentSpend += tool.monthlySpend;

    let recPlan = tool.plan;
    let recSpend = tool.monthlySpend;
    let reason = "Your current plan is highly optimized for your stated team size and usage.";

    const normalizedTool = tool.toolId.toLowerCase();
    const normalizedPlan = tool.plan.toLowerCase();

    // RULE 1: Cursor Optimization
    if (normalizedTool === 'cursor') {
      if (normalizedPlan === 'business' && tool.seats < 3) {
        recPlan = 'Pro';
        recSpend = 20 * tool.seats; // Pro is $20, Business is $40
        reason = `Cursor Pro ($20/seat) is sufficient for workspaces with fewer than 3 users, avoiding the premium Business tier markup.`;
      }
    }

    // RULE 2: ChatGPT Over-Allocation
    else if (normalizedTool === 'chatgpt') {
      if (normalizedPlan === 'team' && tool.seats === 1) {
        recPlan = 'Plus';
        recSpend = 20; // Plus is $20, Team is $30
        reason = `ChatGPT Plus ($20/mo) is recommended over ChatGPT Team ($30/mo) for single-user workspaces to avoid multi-seat minimum fees.`;
      }
    }

    // RULE 3: Claude Team Seat Minimums
    else if (normalizedTool === 'claude') {
      if (normalizedPlan === 'team' && tool.seats < 5) {
        // Claude Team has a 5-seat minimum ($125/mo)
        const expectedTeamCost = 125;
        if (tool.monthlySpend >= expectedTeamCost) {
          recPlan = 'Pro';
          recSpend = 20 * tool.seats;
          reason = `Claude Team has a strict 5-seat minimum ($125/mo). Downgrading active members to Claude Pro ($20/seat) eliminates paying for idle, unused seats.`;
        }
      }
    }

    // RULE 4: GitHub Copilot Plan Downgrades
    else if (normalizedTool === 'copilot') {
      if (normalizedPlan === 'enterprise') {
        recPlan = 'Business';
        recSpend = 19 * tool.seats; // Business is $19, Enterprise is $39
        reason = `Downgrading from Copilot Enterprise to Copilot Business saves $20/seat/month while maintaining standard autocomplete capabilities.`;
      }
    }

    // RULE 5: Windsurf Plan Downgrades
    else if (normalizedTool === 'windsurf') {
      if (normalizedPlan === 'teams' && tool.seats < 3) {
        recPlan = 'Pro';
        recSpend = 15 * tool.seats; // Pro is $15, Teams is $30
        reason = `Windsurf Pro ($15/seat) is highly suitable for teams under 3 users, avoiding the premium Teams markup.`;
      }
    }

    const savings = Math.max(0, tool.monthlySpend - recSpend);
    totalRecommendedSpend += recSpend;

    recommendations.push({
      toolId: tool.toolId,
      currentPlan: tool.plan,
      currentSpend: tool.monthlySpend,
      recommendedPlan: recPlan,
      recommendedSpend: recSpend,
      savings,
      reason,
    });
  }

  const monthlySavings = Math.max(0, totalCurrentSpend - totalRecommendedSpend);
  const annualSavings = monthlySavings * 12;
  const isHighSavings = monthlySavings >= 500;

  return {
    totalCurrentSpend,
    totalRecommendedSpend,
    monthlySavings,
    annualSavings,
    recommendations,
    isHighSavings,
  };
}