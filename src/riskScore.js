import { verifyNumber, checkSimSwap, checkDeviceStatus, checkLocation, checkCallForwarding, checkKYCMatch } from './nokia.js';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const RECOMMENDATIONS = {
  LOW: 'Transaction approved. No suspicious activity detected.',
  MEDIUM: 'Proceed with caution. Request additional merchant verification.',
  HIGH: 'Transaction blocked. Suspicious network activity detected. Merchant alert triggered.',
};

export async function calculateRiskScore(phoneNumber, latitude, longitude, name) {
  try {
    const verification = await verifyNumber(phoneNumber).catch(err => {
      console.error('[riskScore] verifyNumber error:', { message: err.message, status: err.status, response: err.response, stack: err.stack });
      return { error: err.message, phoneNumber };
    });
    await sleep(1000);
    const simSwap = await checkSimSwap(phoneNumber).catch(err => {
      console.error('[riskScore] checkSimSwap error:', { message: err.message, status: err.status, response: err.response, stack: err.stack });
      return { error: err.message, phoneNumber };
    });
    await sleep(1000);
    const callForwarding = await checkCallForwarding(phoneNumber).catch(err => {
      console.error('[riskScore] checkCallForwarding error:', { message: err.message, status: err.status, response: err.response, stack: err.stack });
      return { error: err.message, phoneNumber };
    });
    await sleep(1000);
    const kycMatch = await checkKYCMatch(phoneNumber, name).catch(err => {
      console.error('[riskScore] checkKYCMatch error:', { message: err.message, status: err.status, response: err.response, stack: err.stack });
      return { error: err.message, phoneNumber };
    });
    await sleep(1000);
    const location = await checkLocation(phoneNumber, latitude, longitude).catch(err => {
      console.error('[riskScore] checkLocation error:', { message: err.message, status: err.status, response: err.response, stack: err.stack });
      return { error: err.message, phoneNumber };
    });
    await sleep(1000);
    const deviceStatus = await checkDeviceStatus(phoneNumber).catch(err => {
      console.error('[riskScore] checkDeviceStatus error:', { message: err.message, status: err.status, response: err.response, stack: err.stack });
      return { error: err.message, phoneNumber };
    });

    console.log('[riskScore] signal results:', { verification, simSwap, callForwarding, kycMatch, location, deviceStatus });

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
  } catch (err) {
    console.error('[riskScore] calculateRiskScore top-level error:', { message: err.message, status: err.status, response: err.response, stack: err.stack });
    throw err;
  }
}
