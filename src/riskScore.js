import { verifyNumber, checkSimSwap, checkDeviceStatus, checkLocation, checkCallForwarding, checkKYCMatch } from './nokia.js';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const RECOMMENDATIONS = {
  LOW: 'Transaction approved. No suspicious activity detected.',
  MEDIUM: 'Proceed with caution. Request additional merchant verification.',
  HIGH: 'Transaction blocked. Suspicious network activity detected. Merchant alert triggered.',
};

export async function calculateRiskScore(phoneNumber, latitude, longitude, name) {
  const verification = await verifyNumber(phoneNumber);
  await sleep(1000);
  const simSwap = await checkSimSwap(phoneNumber);
  await sleep(1000);
  const callForwarding = await checkCallForwarding(phoneNumber);
  await sleep(1000);
  const kycMatch = await checkKYCMatch(phoneNumber, name);
  await sleep(1000);
  const location = await checkLocation(phoneNumber, latitude, longitude);
  await sleep(1000);
  const deviceStatus = await checkDeviceStatus(phoneNumber);

  let score = 0;

  if (!verification.error && verification.verified === false)       score += 25;
  if (!simSwap.error && simSwap.swapDetected === true)              score += 25;
  if (!callForwarding.error && callForwarding.callForwarding === true) score += 20;
  if (!kycMatch.error && kycMatch.kycMatch === false)               score += 15;
  if (!location.error && location.locationMatch === false)          score += 10;
  if (!deviceStatus.error && deviceStatus.status === 'NOT_CONNECTED') score += 5;

  const riskLevel = score <= 30 ? 'LOW' : score <= 60 ? 'MEDIUM' : 'HIGH';

  return {
    phoneNumber,
    score,
    riskLevel,
    breakdown: {
      verification,
      simSwap,
      callForwarding,
      kycMatch,
      location,
      deviceStatus,
    },
    timestamp: new Date().toISOString(),
    recommendation: RECOMMENDATIONS[riskLevel],
  };
}
