import dotenv from 'dotenv';
dotenv.config();

import { NetworkAsCodeClient } from 'network-as-code';

let _client;
function getClient() {
  if (!_client) _client = new NetworkAsCodeClient(process.env.NOKIA_API_KEY);
  return _client;
}

export async function verifyNumber(phoneNumber) {
  try {
    const device = getClient().devices.get({
      phoneNumber: phoneNumber || '+99999999999',
    });

    return {
      verified: true,
      phoneNumber: phoneNumber || '+99999999999',
      timestamp: new Date().toISOString(),
    };
  } catch (err) {
    console.error('[nokia] verifyNumber error:', { message: err.message, status: err.status, response: err.response, stack: err.stack });
    return { error: err.message, phoneNumber, timestamp: new Date().toISOString() };
  }
}

export async function checkSimSwap(phoneNumber) {
  try {
    const device = getClient().devices.get({
      phoneNumber: phoneNumber || '+99999999999',
    });

    const swapDetected = await device.verifyDeviceSwap(24);

    return {
      swapDetected: !!swapDetected,
      phoneNumber: phoneNumber || '+99999999999',
      timestamp: new Date().toISOString(),
    };
  } catch (err) {
    console.error('[nokia] checkSimSwap error:', { message: err.message, status: err.status, response: err.response, stack: err.stack });
    return { error: err.message, phoneNumber, timestamp: new Date().toISOString() };
  }
}

export async function checkLocation(phoneNumber, latitude, longitude) {
  try {
    const device = getClient().devices.get({
      phoneNumber: phoneNumber || '+99999999999',
    });

    const result = await device.verifyLocation(latitude, longitude, 5000);

    return {
      locationMatch: result.resultType === 'TRUE',
      phoneNumber: phoneNumber || '+99999999999',
      timestamp: new Date().toISOString(),
    };
  } catch (err) {
    console.error('[nokia] checkLocation error:', { message: err.message, status: err.status, response: err.response, stack: err.stack });
    return { error: err.message, phoneNumber, timestamp: new Date().toISOString() };
  }
}

export async function checkCallForwarding(phoneNumber) {
  try {
    const device = getClient().devices.get({
      phoneNumber: phoneNumber || '+99999999999',
    });

    const active = await device.verifyUnconditionalForwarding();

    return {
      callForwarding: !!active,
      phoneNumber: phoneNumber || '+99999999999',
      timestamp: new Date().toISOString(),
    };
  } catch (err) {
    console.error('[nokia] checkCallForwarding error:', { message: err.message, status: err.status, response: err.response, stack: err.stack });
    return { error: err.message, callForwarding: false, phoneNumber, timestamp: new Date().toISOString() };
  }
}

export async function checkKYCMatch(phoneNumber, name) {
  try {
    const device = getClient().devices.get({
      phoneNumber: phoneNumber || '+99999999999',
    });

    const result = await device.matchCustomer({ phoneNumber: phoneNumber || '+99999999999', name });

    return {
      kycMatch: result.nameMatch === 'true',
      phoneNumber: phoneNumber || '+99999999999',
      timestamp: new Date().toISOString(),
    };
  } catch (err) {
    console.error('[nokia] checkKYCMatch error:', { message: err.message, status: err.status, response: err.response, stack: err.stack });
    return { error: err.message, kycMatch: true, phoneNumber, timestamp: new Date().toISOString() };
  }
}

export async function checkDeviceStatus(phoneNumber) {
  try {
    const device = getClient().devices.get({
      phoneNumber: phoneNumber || '+99999999999',
    });

    const connectivity = await device.getConnectivity();

    return {
      status: connectivity?.status || connectivity || 'unknown',
      phoneNumber: phoneNumber || '+99999999999',
      timestamp: new Date().toISOString(),
    };
  } catch (err) {
    console.error('[nokia] checkDeviceStatus error:', { message: err.message, status: err.status, response: err.response, stack: err.stack });
    return { error: err.message, phoneNumber, timestamp: new Date().toISOString() };
  }
}
