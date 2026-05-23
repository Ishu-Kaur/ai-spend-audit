import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY || 're_mock_key');

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const { 
      email, 
      companyName, 
      role, 
      teamSize, 
      auditData, 
      isHighSavings,
      honeypot // Our anti-abuse bot field
    } = body;

    // 1. Abuse Protection: Check Honeypot
    // If a bot fills this hidden field, silently reject the request as a success
    if (honeypot) {
      console.warn('Spam submission detected via honeypot.');
      return NextResponse.json({ success: true, message: 'Audit saved' });
    }

    // 2. Validate essential fields
    if (!email || !auditData) {
      return NextResponse.json(
        { error: 'Missing required parameters: email and auditData are required.' },
        { status: 400 }
      );
    }

    // 3. Save lead data to Supabase
    const { data, error } = await supabase
      .from('leads')
      .insert([
        {
          email,
          company_name: companyName || null,
          role: role || null,
          team_size: teamSize ? parseInt(teamSize) : null,
          is_high_savings: !!isHighSavings,
          audit_data: auditData,
        }
      ])
      .select();

    if (error) {
      console.error('Database Error:', error);
      throw error;
    }

    // 4. Send Transactional Email via Resend
    // We wrap this in a try-catch so that even if the email fails, the API call succeeds.
    try {
      if (process.env.RESEND_API_KEY && process.env.RESEND_API_KEY !== 're_mock_key') {
        await resend.emails.send({
          from: 'onboarding@resend.dev', // Default testing address for Resend free accounts
          to: email,
          subject: 'Your AI Spend Audit Report',
          text: `Hi there,\n\nThank you for auditing your AI stack with us. Your estimated savings are calculated. We have logged your audit in our database.\n\n${
            isHighSavings 
              ? 'Our team at Credex has flagged your audit as high-savings eligible. One of our experts will reach out shortly to assist you with capturing these discounts.' 
              : 'Our team will notify you as soon as new optimization rules are released that apply directly to your software stack.'
          }\n\nBest regards,\nThe AI Spend Audit Team`,
        });
      }
    } catch (emailErr) {
      console.error('Email Delivery Failed (Continuing anyway):', emailErr);
    }

    return NextResponse.json({ success: true, lead: data[0] });

  } catch (err) {
    console.error('Internal Server Error:', err);
    return NextResponse.json(
      { error: 'Internal Server Error. Please try again later.' },
      { status: 500 }
    );
  }
}