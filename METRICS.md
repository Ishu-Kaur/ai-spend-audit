# Product Metrics & Telemetry

This document details the telemetry tracking, metrics dashboard, and key performance indicators of the AI Spend Audit tool.

## 1. The North Star Metric
Our single North Star metric is **"Qualified Audits Completed"** (QAC). 
- **Definition:** An audit is considered qualified if it identifies at least **$100/month** in potential savings and the user completes the final email capture form. 
- **Why?** This metric directly aligns product value (helping founders save money) with business value (generating warm, highly-qualified leads for Credex).

## 2. Input Metrics
To drive our North Star metric, we track three distinct input metrics:
1. **Unique Traffic Volume:** Total unique visitors landing on our landing page weekly.
2. **Form Progress Rate:** The percentage of landing page visitors who select at least one tool and click "Audit My AI Stack."
3. **Lead Capture Conversion Rate:** The percentage of audited users who fill out the final email capture form to save their results.

## 3. Initial Telemetry Instrumentation
On day one, we will integrate a lightweight analytics tool (such as PostHog or Plausible) to track:
- Form field engagement (identifying if users drop off when asked about specific seat counts).
- Click events on the "Audit My AI Stack" and "Schedule Free Consultation" buttons.
- Failures or timeouts on the AI summary `/api/summary` endpoint.

## 4. The Pivot Trigger
If after **200 completed audits**, our Lead Capture Conversion Rate is **under 10%**, this indicates that users are viewing their savings results but refusing to share their email addresses to save the report. 

This metric would trigger a **product pivot** to redesign our results dashboard—shifting from a purely on-screen view to an "Email me the full report PDF" delivery model to capture leads earlier in the user journey.