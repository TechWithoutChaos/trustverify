import dotenv from 'dotenv';
dotenv.config();

import Anthropic from '@anthropic-ai/sdk';
import { getSupabase } from './supabase.js';
import { sendWhatsAppAlert } from './twilio.js';

let _anthropic;
function getAnthropic() {
  if (!_anthropic) _anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return _anthropic;
}

const SYSTEM_PROMPT = `You are TrustVerify, an AI fraud detection agent for African SME merchants. You analyze network signals and make autonomous decisions to protect merchants from fraud. You are decisive, clear, and always explain your reasoning in simple terms that a Nigerian market trader would understand.`;

function buildUserMessage(phoneNumber, riskData) {
  const { score, breakdown } = riskData;
  const v = breakdown.verification;
  const s = breakdown.simSwap;
  const cf = breakdown.callForwarding;
  const k = breakdown.kycMatch;
  const l = breakdown.location;
  const d = breakdown.deviceStatus;

  return `A merchant transaction has been flagged HIGH risk. Here is the signal breakdown:
- Phone number: ${phoneNumber}
- Risk score: ${score}/100
- Number verified: ${v?.verified ?? 'unknown'}
- SIM swap detected: ${s?.swapDetected ?? 'unknown'}
- Call forwarding active: ${cf?.callForwarding ?? 'unknown'}
- KYC match: ${k?.kycMatch ?? 'unknown'}
- Location match: ${l?.locationMatch ?? 'unknown'}
- Device status: ${d?.status ?? 'unknown'}

Your job:
1. Explain in 2-3 sentences why this transaction is HIGH risk in plain English
2. State your decision: BLOCK or ESCALATE TO HUMAN
3. Write a follow-up WhatsApp message in Nigerian Pidgin English to send to the merchant explaining what happened and what they should do next
4. Assess the likelihood this is fraud vs a false positive on a scale of 1-10

Respond in this exact JSON format:
{
  "reasoning": "string",
  "decision": "BLOCK or ESCALATE",
  "pidginMessage": "string",
  "fraudLikelihood": number
}`;
}

export async function runAgentEscalation(phoneNumber, riskData) {
  if (riskData.riskLevel !== 'HIGH') {
    return { escalated: false, reason: 'Risk level below threshold' };
  }

  let agentResponse;

  try {
    const response = await getAnthropic().messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [
        { role: 'user', content: buildUserMessage(phoneNumber, riskData) },
      ],
    });

    const rawText = response.content.find(b => b.type === 'text')?.text ?? '';

    // Strip markdown code fences if Claude wraps the JSON
    const jsonText = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
    agentResponse = JSON.parse(jsonText);
  } catch (err) {
    return { escalated: false, error: `Claude API or parse error: ${err.message}` };
  }

  // Log to Supabase
  try {
    await getSupabase().from('agent_escalations').insert([{
      phone_number: phoneNumber,
      risk_score: riskData.score,
      reasoning: agentResponse.reasoning,
      decision: agentResponse.decision,
      pidgin_message: agentResponse.pidginMessage,
      fraud_likelihood: agentResponse.fraudLikelihood,
      created_at: new Date().toISOString(),
    }]);
  } catch (err) {
    // Non-fatal — log but don't block the response
    console.error('agent_escalations log error:', err.message);
  }

  // If BLOCK, fire a second WhatsApp alert with the pidgin message
  if (agentResponse.decision === 'BLOCK') {
    try {
      await sendWhatsAppAlert(phoneNumber, {
        ...riskData,
        _overrideBody: agentResponse.pidginMessage,
      });
    } catch (err) {
      console.error('WhatsApp pidgin alert error:', err.message);
    }
  }

  return {
    escalated: true,
    reasoning: agentResponse.reasoning,
    decision: agentResponse.decision,
    pidginMessage: agentResponse.pidginMessage,
    fraudLikelihood: agentResponse.fraudLikelihood,
  };
}
