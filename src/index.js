import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';

import { calculateRiskScore } from './riskScore.js';
import { sendWhatsAppAlert } from './twilio.js';
import { logTransaction, supabase } from './supabase.js';
import { runAgentEscalation } from './agent.js';

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// POST /api/verify
app.post('/api/verify', async (req, res) => {
  try {
    const { phoneNumber, latitude = 6.5244, longitude = 3.3792, name = 'Unknown' } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({ success: false, error: 'phoneNumber is required' });
    }

    const riskData = await calculateRiskScore(phoneNumber, latitude, longitude, name);

    let alertSent = false;
    if (riskData.riskLevel === 'HIGH' || riskData.riskLevel === 'MEDIUM') {
      const alertResult = await sendWhatsAppAlert(phoneNumber, riskData);
      alertSent = alertResult.sent === true;
    }

    const agentDecision = await runAgentEscalation(phoneNumber, riskData);

    await logTransaction(phoneNumber, riskData, alertSent);

    return res.json({
      success: true,
      phoneNumber,
      riskLevel: riskData.riskLevel,
      score: riskData.score,
      recommendation: riskData.recommendation,
      breakdown: riskData.breakdown,
      alertSent,
      agentDecision,
      timestamp: riskData.timestamp,
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/verify/demo — mock responses for presentation (no Nokia API calls)
const DEMO_SCENARIOS = {
  low: {
    phoneNumber: '+99999991001',
    riskLevel: 'LOW',
    score: 0,
    recommendation: 'Transaction approved. No suspicious activity detected.',
    breakdown: {
      verification: { verified: true,  phoneNumber: '+99999991001', timestamp: null },
      simSwap:      { swapDetected: false, phoneNumber: '+99999991001', timestamp: null },
      deviceStatus: { status: 'CONNECTED_DATA', phoneNumber: '+99999991001', timestamp: null },
    },
    alertSent: false,
  },
  medium: {
    phoneNumber: '+99999991000',
    riskLevel: 'MEDIUM',
    score: 40,
    recommendation: 'Proceed with caution. Request additional merchant verification.',
    breakdown: {
      verification: { verified: true,  phoneNumber: '+99999991000', timestamp: null },
      simSwap:      { swapDetected: true,  phoneNumber: '+99999991000', timestamp: null },
      deviceStatus: { status: 'CONNECTED_SMS', phoneNumber: '+99999991000', timestamp: null },
    },
    alertSent: true,
  },
  high: {
    phoneNumber: '+99999990001',
    riskLevel: 'HIGH',
    score: 80,
    recommendation: 'Transaction blocked. Suspicious network activity detected. Merchant alert triggered.',
    breakdown: {
      verification: { verified: false, phoneNumber: '+99999990001', timestamp: null },
      simSwap:      { swapDetected: true,  phoneNumber: '+99999990001', timestamp: null },
      deviceStatus: { status: 'CONNECTED_SMS', phoneNumber: '+99999990001', timestamp: null },
    },
    alertSent: true,
  },
};

app.post('/api/verify/demo', (req, res) => {
  const { phoneNumber, scenario } = req.body;
  const key = (scenario || '').toLowerCase();

  if (!DEMO_SCENARIOS[key]) {
    return res.status(400).json({
      success: false,
      error: `Invalid scenario "${scenario}". Must be one of: low, medium, high.`,
    });
  }

  const mock = DEMO_SCENARIOS[key];
  const ts = new Date().toISOString();

  return res.json({
    success: true,
    demo: true,
    phoneNumber: phoneNumber || mock.phoneNumber,
    riskLevel: mock.riskLevel,
    score: mock.score,
    recommendation: mock.recommendation,
    breakdown: {
      verification: { ...mock.breakdown.verification, timestamp: ts },
      simSwap:      { ...mock.breakdown.simSwap,      timestamp: ts },
      deviceStatus: { ...mock.breakdown.deviceStatus, timestamp: ts },
    },
    alertSent: mock.alertSent,
    timestamp: ts,
  });
});

// GET /api/health
app.get('/api/health', (req, res) => {
  res.json({ status: 'TrustVerify API is running', timestamp: new Date().toISOString() });
});

// GET /api/transactions
app.get('/api/transactions', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`TrustVerify API running on port ${PORT}`);
});
