import dotenv from 'dotenv';
dotenv.config();

import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export async function logTransaction(phoneNumber, riskData, alertSent) {
  try {
    const { data, error } = await supabase
      .from('transactions')
      .insert([
        {
          phone_number: phoneNumber,
          risk_score: riskData.score,
          risk_level: riskData.riskLevel,
          recommendation: riskData.recommendation,
          sim_swap_detected: riskData.breakdown.simSwap?.swapDetected ?? null,
          number_verified: riskData.breakdown.verification?.verified ?? null,
          device_status: riskData.breakdown.deviceStatus?.status ?? null,
          alert_sent: alertSent,
          created_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (error) throw error;

    return data;
  } catch (err) {
    return { error: err.message };
  }
}
