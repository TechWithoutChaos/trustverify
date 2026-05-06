import dotenv from 'dotenv';
dotenv.config();

import twilio from 'twilio';

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

function buildFlaggedSignals(breakdown) {
  const lines = [];
  if (breakdown.verification?.verified === false)
    lines.push('❌ Your phone number no verify');
  if (breakdown.simSwap?.swapDetected === true)
    lines.push('❌ SIM card recently swapped');
  if (breakdown.callForwarding?.callForwarding === true)
    lines.push('❌ Call forwarding active on your line');
  if (breakdown.kycMatch?.kycMatch === false)
    lines.push('❌ Your details no match network records');
  if (breakdown.location?.locationMatch === false)
    lines.push('❌ Your location no match registered area');
  if (breakdown.deviceStatus?.status === 'NOT_CONNECTED')
    lines.push('❌ Your device show as offline');
  return lines;
}

function buildMessage(phoneNumber, riskData) {
  const { riskLevel, score, breakdown } = riskData;
  const flags = buildFlaggedSignals(breakdown);
  const flagList = flags.length > 0 ? flags.join('\n') : '❌ Suspicious pattern detected';

  if (riskLevel === 'HIGH') {
    return `🚨 TRUSTVERIFY ALERT 🚨

Madam/Oga, we don block this transaction. E get serious wahala for your account.

Risk Level: HIGH 🔴
Score: ${score}/100

Wetin we see:
${flagList}

We don pause everything for your protection.
If na you do am, reply YES.
If you no do am, reply NO sharp sharp.

Your account don escalate to our security team.

TrustVerify by TechWithoutChaos`;
  }

  if (riskLevel === 'MEDIUM') {
    return `⚠️ TRUSTVERIFY NOTICE

Oga/Madam, we see something wey need your attention.

Risk Level: MEDIUM 🟡
Score: ${score}/100

Wetin we see:
${flagList}

Abeg verify say na you do this transaction before e complete.
Reply YES to confirm or NO to cancel.

TrustVerify by TechWithoutChaos`;
  }

  return `✅ TRUSTVERIFY CLEAR

Oga/Madam, everything don check out. Your account clean.

Risk Level: LOW 🟢
Score: ${score}/100

No suspicious activity detected. Your transaction don approve.

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
