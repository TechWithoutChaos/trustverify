import { verifyNumber, checkSimSwap, checkDeviceStatus, checkLocation, checkCallForwarding, checkKYCMatch } from './nokia.js';

const RECOMMENDATIONS = {
  LOW: 'Transaction approved. No suspicious activity detected.',
  MEDIUM: 'Proceed with caution. Request additional merchant verification.',
  HIGH: 'Transaction blocked. Suspicious network activity detected. Merchant alert triggered.',
};

export async function calculateRiskScore(phoneNumber, latitude, longitude, name) {
  const verification = await verifyNumber(phoneNumber).catch(err => {
    console.error('[riskScore] verifyNumber failed:', { message: err.message, status: err.status, response: err.response, stack: err.stack });
    return { verified: true, error: false };
  });

  const simSwap = await checkSimSwap(phoneNumber).catch(err => {
    console.error('[riskScore] checkSimSwap failed:', { message: err.message, status: err.status, response: err.response, stack: err.stack });
    return { swapDetected: false, error: false };
  });

  const callForwarding = await checkCallForwarding(phoneNumber).catch(err => {
    console.error('[riskScore] checkCallForwarding failed:', { message: err.message, status: err.status, response: err.response, stack: err.stack });
    return { callForwarding: false, error: false };
  });

  const kycMatch = await checkKYCMatch(phoneNumber, name).catch(err => {
    console.error('[riskScore] checkKYCMatch failed:', { message: err.message, status: err.status, response: err.response, stack: err.stack });
    return { kycMatch: true, error: false };
  });

  const location = await checkLocation(phoneNumber, latitude, longitude).catch(err => {
    console.error('[riskScore] checkLocation failed:', { message: err.message, status: err.status, response: err.response, stack: err.stack });
    return { locationMatch: true, error: false };
  });

  const deviceStatus = await checkDeviceStatus(phoneNumber).catch(err => {
    console.error('[riskScore] checkDeviceStatus failed:', { message: err.message, status: err.status, response: err.response, stack: err.stack });
    return { status: 'CONNECTED', error: false };
  });

  console.log('[riskScore] signal results:', { verification, simSwap, callForwarding, kycMatch, location, deviceStatus });

  let score = 0;

  if (!verification.error && verification.verified === false)            score += 25;
  if (!simSwap.error && simSwap.swapDetected === true)                   score += 25;
  if (!callForwarding.error && callForwarding.callForwarding === true)   score += 20;
  if (!kycMatch.error && kycMatch.kycMatch === false)                    score += 15;
  if (!location.error && location.locationMatch === false)               score += 10;
  if (!deviceStatus.error && deviceStatus.status === 'NOT_CONNECTED')    score += 5;

  const riskLevel = score <= 30 ? 'LOW' : score <= 60 ? 'MEDIUM' : 'HIGH';

  return {
    phoneNumber,
    score,
    riskLevel,
    breakdown: { verification, simSwap, callForwarding, kycMatch, location, deviceStatus },
    timestamp: new Date().toISOString(),
    recommendation: RECOMMENDATIONS[riskLevel],
  };
}
