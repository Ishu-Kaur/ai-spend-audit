'use client';

import React, { useState, useEffect } from 'react';
import { runAudit, AuditInput, ToolInput, AuditResult } from '../lib/auditEngine';

const AVAILABLE_TOOLS = [
  { id: 'cursor', name: 'Cursor', plans: ['Hobby', 'Pro', 'Business'] },
  { id: 'copilot', name: 'GitHub Copilot', plans: ['Individual', 'Business', 'Enterprise'] },
  { id: 'claude', name: 'Claude', plans: ['Free', 'Pro', 'Max', 'Team'] },
  { id: 'chatgpt', name: 'ChatGPT', plans: ['Plus', 'Team'] },
  { id: 'windsurf', name: 'Windsurf', plans: ['Free', 'Pro', 'Teams'] }
];

export default function Home() {
  // --- HYDRATION GUARD ---
  const [isMounted, setIsMounted] = useState<boolean>(false);

 useEffect(() => {
  const timer = setTimeout(() => {
    setIsMounted(true);
  }, 0);
  return () => clearTimeout(timer);
}, []);

  // --- STATE MANAGEMENT (With Lazy LocalStorage Initialization) ---
  const [teamSize, setTeamSize] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('audit_teamSize');
      return saved ? parseInt(saved) : 1;
    }
    return 1;
  });

  const [useCase, setUseCase] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('audit_useCase') || 'mixed';
    }
    return 'mixed';
  });

  const [selectedTools, setSelectedTools] = useState<{ [key: string]: { plan: string; seats: number; monthlySpend: number } }>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('audit_selectedTools');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          console.error('Failed to parse local storage tools:', e);
        }
      }
    }
    return {};
  });

  const [auditResult, setAuditResult] = useState<AuditResult | null>(null);
  const [isAudited, setIsAudited] = useState<boolean>(false);
  
  // AI Summary States
  const [aiSummary, setAiSummary] = useState<string>('');
  const [isLoadingSummary, setIsLoadingSummary] = useState<boolean>(false);

  // Lead capture states
  const [email, setEmail] = useState<string>('');
  const [companyName, setCompanyName] = useState<string>('');
  const [role, setRole] = useState<string>('');
  const [honeypot, setHoneypot] = useState<string>(''); // Spam protection
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // --- LOCAL STORAGE WRITER ---
  useEffect(() => {
    localStorage.setItem('audit_teamSize', teamSize.toString());
    localStorage.setItem('audit_useCase', useCase);
    localStorage.setItem('audit_selectedTools', JSON.stringify(selectedTools));
  }, [teamSize, useCase, selectedTools]);

  // --- INTERACTION HANDLERS ---
  const handleToolToggle = (toolId: string) => {
    const updated = { ...selectedTools };
    if (updated[toolId]) {
      delete updated[toolId];
    } else {
      const toolDef = AVAILABLE_TOOLS.find(t => t.id === toolId);
      updated[toolId] = {
        plan: toolDef ? toolDef.plans[0] : 'Pro',
        seats: 1,
        monthlySpend: 20
      };
    }
    setSelectedTools(updated);
  };

  const handleToolChange = (toolId: string, field: 'plan' | 'seats' | 'monthlySpend', value: string | number) => {
    const updated = { ...selectedTools };
    if (updated[toolId]) {
      updated[toolId] = {
        ...updated[toolId],
        [field]: value
      };
      setSelectedTools(updated);
    }
  };

  const triggerAudit = async () => {
    const toolList: ToolInput[] = Object.keys(selectedTools).map(key => ({
      toolId: key,
      plan: selectedTools[key].plan,
      seats: selectedTools[key].seats,
      monthlySpend: selectedTools[key].monthlySpend
    }));

    const auditInput: AuditInput = {
      teamSize,
      primaryUseCase: useCase as 'coding' | 'writing' | 'data' | 'research' | 'mixed',
      tools: toolList
    };

    const results = runAudit(auditInput);
    setAuditResult(results);
    setIsAudited(true);

    // Fetch the AI-Generated Summary from our secure endpoint
    setIsLoadingSummary(true);
    setAiSummary('');
    try {
      const res = await fetch('/api/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          auditResult: results,
          teamSize,
          primaryUseCase: useCase
        })
      });
      if (res.ok) {
        const data = (await res.json()) as { summary?: string } | null;
        if (data && data.summary) {
          setAiSummary(data.summary);
        }
      } else {
        console.warn('API returned non-ok status. Fallback should trigger.');
      }
    } catch (err) {
      console.error('Failed to load AI summary:', err);
    } finally {
      setIsLoadingSummary(false);
    }
  };
  
  const submitLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !auditResult) return;

    setIsSubmitting(true);
    setSubmitStatus('idle');

    try {
      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          companyName,
          role,
          teamSize,
          isHighSavings: auditResult.isHighSavings,
          auditData: auditResult,
          honeypot // Bot-trap field
        })
      });

      if (response.ok) {
        setSubmitStatus('success');
      } else {
        setSubmitStatus('error');
      }
    } catch (err) {
      console.error('Lead submission failed:', err);
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- RENDERING PROTECTION ---
  // If the page has not mounted on the client, render a themed loading spinner.
  // This completely eliminates any Next.js hydration mismatches!
  if (!isMounted) {
    return (
      <main className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-emerald-500 border-t-transparent rounded-full"></div>
      </main>
    );
  }

  // --- RENDERING UI ---
  return (
    <main className="min-h-screen bg-slate-900 text-slate-100 p-6 md:p-12">
      <div className="max-w-4xl mx-auto space-y-12">
        
        {/* HERO HEADER */}
        <header className="text-center space-y-4">
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
            Stop Overpaying for AI. Audit Your Team{"'"}s Tool Spend.
          </h1>
          <p className="text-slate-400 max-w-xl mx-auto">
            Startups lose thousands on idle AI seats and overlapping plans. Get an instant, mathematically defensible audit of your actual software spend in 60 seconds.
          </p>
        </header>

        {/* STEP 1: SPEND INPUT FORM */}
        {!isAudited ? (
          <section className="bg-slate-800 border border-slate-700 rounded-xl p-6 md:p-8 space-y-8">
            <h2 className="text-xl font-semibold">1. Select and Configure Your AI Tools</h2>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-400">Total Team Size</label>
                <input 
                  type="number" 
                  min="1" 
                  value={teamSize}
                  onChange={(e) => setTeamSize(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-400">Primary Use Case</label>
                <select 
                  value={useCase}
                  onChange={(e) => setUseCase(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-slate-100 focus:outline-none focus:border-emerald-500"
                >
                  <option value="coding">Coding / Engineering</option>
                  <option value="writing">Content Writing / Marketing</option>
                  <option value="data">Data Analysis</option>
                  <option value="research">Academic / Market Research</option>
                  <option value="mixed">Mixed Corporate Stack</option>
                </select>
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-sm font-medium text-slate-400">Select Paid Tools In Your Stack</label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {AVAILABLE_TOOLS.map(tool => {
                  const active = !!selectedTools[tool.id];
                  return (
                    <button
                      key={tool.id}
                      type="button"
                      onClick={() => handleToolToggle(tool.id)}
                      className={`p-4 rounded-lg border text-left transition-all ${
                        active 
                          ? 'bg-emerald-950/40 border-emerald-500 text-emerald-400' 
                          : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-500'
                      }`}
                    >
                      <div className="font-semibold">{tool.name}</div>
                      <div className="text-xs text-slate-400 mt-1">{active ? 'Selected' : 'Click to select'}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Config inputs for selected tools */}
            {Object.keys(selectedTools).map(toolId => {
              const toolDef = AVAILABLE_TOOLS.find(t => t.id === toolId);
              const config = selectedTools[toolId];
              if (!toolDef) return null;

              return (
                <div key={toolId} className="bg-slate-900 border border-slate-700 rounded-lg p-4 space-y-4">
                  <h3 className="font-semibold text-emerald-400">{toolDef.name} Settings</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs text-slate-400">Tier / Plan</label>
                      <select
                        value={config.plan}
                        onChange={(e) => handleToolChange(toolId, 'plan', e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm"
                      >
                        {toolDef.plans.map(p => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs text-slate-400">Paid Seats</label>
                      <input
                        type="number"
                        min="1"
                        value={config.seats}
                        onChange={(e) => handleToolChange(toolId, 'seats', Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs text-slate-400">Monthly Cost ($)</label>
                      <input
                        type="number"
                        min="0"
                        value={config.monthlySpend}
                        onChange={(e) => handleToolChange(toolId, 'monthlySpend', Math.max(0, parseFloat(e.target.value) || 0))}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm"
                      />
                    </div>
                  </div>
                </div>
              );
            })}

            <button
              type="button"
              onClick={triggerAudit}
              disabled={Object.keys(selectedTools).length === 0}
              className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-700 disabled:text-slate-400 text-slate-900 font-bold p-4 rounded-lg transition-all"
            >
              Audit My AI Stack
            </button>
          </section>
        ) : (
          /* STEP 2: AUDIT RESULTS DASHBOARD */
          <section className="space-y-8 animate-fade-in">
            
            {/* HERO HERO SECTION */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-emerald-950/40 border border-emerald-500 rounded-xl p-6 text-center space-y-2">
                <div className="text-sm font-semibold tracking-wide uppercase text-emerald-400">Total Monthly Savings</div>
                <div className="text-4xl md:text-5xl font-extrabold">${auditResult?.monthlySavings}</div>
              </div>
              <div className="bg-cyan-950/40 border border-cyan-500 rounded-xl p-6 text-center space-y-2">
                <div className="text-sm font-semibold tracking-wide uppercase text-cyan-400">Total Annual Savings</div>
                <div className="text-4xl md:text-5xl font-extrabold">${auditResult?.annualSavings}</div>
              </div>
            </div>

            {/* AI-GENERATED PERSONALIZED SUMMARY */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 md:p-8 space-y-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <span>🤖</span> AI-Generated Personalized Summary
              </h2>
              {isLoadingSummary ? (
                <div className="flex items-center gap-3 text-slate-400">
                  <div className="animate-spin h-5 w-5 border-2 border-emerald-500 border-t-transparent rounded-full"></div>
                  <span>Claude is analyzing your software spend...</span>
                </div>
              ) : (
                <p className="text-slate-300 leading-relaxed italic">
                  {aiSummary || "No summary available for this configuration."}
                </p>
              )}
            </div>

            {/* PER-TOOL BREAKDOWN */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 md:p-8 space-y-6">
              <h2 className="text-xl font-semibold">Audit Recommendations</h2>
              <div className="space-y-4">
                {auditResult?.recommendations.map(rec => {
                  const toolDef = AVAILABLE_TOOLS.find(t => t.id === rec.toolId);
                  return (
                    <div key={rec.toolId} className="bg-slate-900 border border-slate-700 rounded-lg p-4 grid md:grid-cols-4 gap-4 items-center">
                      <div>
                        <div className="font-bold text-lg text-slate-100">{toolDef?.name}</div>
                        <div className="text-xs text-slate-400">Plan: {rec.currentPlan}</div>
                      </div>
                      <div className="text-slate-300">
                        <div>Spend: <span className="line-through">${rec.currentSpend}/mo</span></div>
                        <div className="text-emerald-400 font-semibold">New: ${rec.recommendedSpend}/mo ({rec.recommendedPlan})</div>
                      </div>
                      <div className="text-emerald-400 font-extrabold text-lg">
                        Saved: ${rec.savings}/mo
                      </div>
                      <div className="text-sm text-slate-400 md:border-l md:border-slate-700 md:pl-4">
                        {rec.reason}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* CONDITIONAL CALL-TO-ACTION BLOCKS */}
            {auditResult && auditResult.isHighSavings ? (
              <div className="bg-gradient-to-r from-emerald-950/60 to-cyan-950/60 border-2 border-emerald-500 rounded-xl p-6 md:p-8 space-y-4">
                <h2 className="text-2xl font-bold text-emerald-400">🔥 High-Savings Alert Detected</h2>
                <p className="text-slate-300 max-w-xl">
                  Your startup qualifies for extensive enterprise savings through Credex. We source bulk discounts from teams that over-committed, saving you up to 50% off standard retail rates without shifting your daily workflows.
                </p>
                <div className="pt-2">
                  <a 
                    href="https://credex.rocks" 
                    target="_blank" 
                    rel="noreferrer"
                    className="inline-block bg-emerald-400 hover:bg-emerald-500 text-slate-900 font-bold px-6 py-3 rounded-lg transition-all"
                  >
                    Schedule Free Consultation With Credex
                  </a>
                </div>
              </div>
            ) : (
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 text-center space-y-2">
                <h3 className="font-semibold text-slate-200">Your AI Spend is Optimized!</h3>
                <p className="text-sm text-slate-400 max-w-lg mx-auto">
                  You are spending well. No major over-allocation patterns were found in your active accounts. Fill out the lead details below to receive updates when new pricing optimization rules are released.
                </p>
              </div>
            )}

            {/* LEAD CAPTURE FORM (POST-VALUE SHOWN) */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 md:p-8 space-y-6">
              <h2 className="text-xl font-semibold text-center">Save, Send, or Share This Report</h2>
              
              {submitStatus === 'success' ? (
                <div className="text-center p-6 bg-emerald-950/30 border border-emerald-500 rounded-lg text-emerald-400">
                  <h3 className="font-bold text-lg">Report Saved Successfully!</h3>
                  <p className="text-sm text-slate-300 mt-1">A confirmation summary email has been triggered to {email}.</p>
                </div>
              ) : (
                <form onSubmit={submitLead} className="space-y-4 max-w-md mx-auto">
                  {/* Honeypot anti-spam trap */}
                  <div className="hidden">
                    <input 
                      type="text" 
                      value={honeypot} 
                      onChange={(e) => setHoneypot(e.target.value)} 
                      tabIndex={-1} 
                      autoComplete="off" 
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-400">Email Address (Required)</label>
                    <input 
                      type="email" 
                      required 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@company.com"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-400">Company Name (Optional)</label>
                      <input 
                        type="text" 
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        placeholder="Acme Inc"
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-400">Job Title / Role (Optional)</label>
                      <input 
                        type="text" 
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                        placeholder="CTO"
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  {submitStatus === 'error' && (
                    <p className="text-sm text-red-400 text-center">Submission failed. Please try again.</p>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-cyan-500 hover:bg-cyan-600 disabled:bg-slate-700 text-slate-900 font-bold p-3 rounded-lg transition-all"
                  >
                    {isSubmitting ? 'Saving...' : 'Email My Audit Report'}
                  </button>
                </form>
              )}

              <div className="pt-4 border-t border-slate-700 flex justify-between items-center text-sm text-slate-400">
                <span>Want to start over?</span>
                <button 
                  type="button" 
                  onClick={() => setIsAudited(false)} 
                  className="text-emerald-400 hover:underline font-semibold"
                >
                  Configure New Audit
                </button>
              </div>
            </div>

          </section>
        )}
      </div>
    </main>
  );
}