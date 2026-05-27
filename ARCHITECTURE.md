# System Architecture - AI Spend Audit Tool

This document outlines the technical design, data flow, stack justification, and scaling parameters of the AI Spend Audit application.

## 1. System Topology (Mermaid Diagram)

The system is designed as a serverless, decoupled, three-tier architecture utilizing Next.js, Supabase, and Resend.

```mermaid
graph TD
    User([Cold Visitor]) -->|1. Form Input| FE[Next.js Client UI]
    FE -->|2. Local Storage Persistence| LS[(Client LocalStorage)]
    FE -->|3. Run Local Math| ME[TypeScript Audit Engine]
    FE -->|4. Submit Audit & Lead| API_Lead[Next.js API Route: /api/leads]
    FE -->|5. Fetch AI Summary| API_Sum[Next.js API Route: /api/summary]
    
    API_Lead -->|6. Save Postgres Row| DB[(Supabase Cloud Database)]
    API_Lead -->|7. Send Email| Email[Resend API Engine]
    API_Sum -->|8. Fetch Summary| LLM[Anthropic Claude API]
    API_Sum -.->|9. Optional Fallback| Fallback[Local Fallback Generator]
    
    Email -->|10. Summary Email| Inbox([User Inbox])