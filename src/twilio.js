import dotenv from 'dotenv';
dotenv.config();

import twilio from 'twilio';

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

function buildBreakdownLines(breakdown) {
  const lines = [];
  if (breakdown.verification?.verified === false) {
    lines.push('• Phone number verification failed');
  }
  if (breakdown.simSwap?.swapDetected === true) {
    lines.push('• SIM swap detected for this number');
  }
  if (breakdown.deviceStatus?.status && breakdown.deviceStatus.status !== 'CONNECTED') {
    lines.push(`• Device connectivity issue: ${breakdown.deviceStatus.status}`);
  }
  return lines.length > 0 ? lines.join('\n') : '• Suspicious pattern detected';
}

function buildMessage(phoneNumber, riskData) {
  const { riskLevel, breakdown } = riskData;

  if (riskLevel === 'HIGH') {
    return `⚠️ TRUSTVERIFY ALERT ⚠️

Madam/Oga, e get suspicious activity on top your VendEx account.

Phone number: ${phoneNumber}
Risk Level: HIGH 🔴

Wetin we see:
${buildBreakdownLines(breakdown)}

We don pause this transaction for your protection.

If na you do am, reply YES.
If you no do am, reply NO sharp sharp.

TrustVerify by TechWithoutChaos`;
  }

  if (riskLevel === 'MEDIUM') {
    return `⚠️ TRUSTVERIFY NOTICE

Oga/Madam, we see something small on your account wey need your attention.

Phone number: ${phoneNumber}
Risk Level: MEDIUM 🟡

Abeg verify say na you do this transaction before e complete.

TrustVerify by TechWithoutChaos`;
  }

  return `✅ TRUSTVERIFY CLEAR

Your transaction don verify. Everything clean.
Risk Level: LOW 🟢

TrustVerify by TechWithoutChaos`;
}

export async function sendWhatsAppAlert(phoneNumber, riskData) {
  try {
    const body = riskData._overrideBody ?? buildMessage(phoneNumber, riskData);

    const message = await twilioClient.messages.create({
      from: process.env.TWILIO_WHATSAPP_FROM,
      to: process.env.TWILIO_WHATSAPP_TO,
      body,
    });

    return { sent: true, messageSid: message.sid, timestamp: new Date().toISOString() };
  } catch (err) {
    return { error: err.message, sent: false, timestamp: new Date().toISOString() };
  }
}
