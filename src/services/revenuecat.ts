import { Platform } from 'react-native';

import { env } from '@/lib/env';

let configured = false;

function getPurchases() {
  if (Platform.OS === 'web') {
    return null;
  }

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('react-native-purchases') as typeof import('react-native-purchases');
}

export async function configureRevenueCat() {
  if (!env.revenueCatEnabled || Platform.OS === 'web' || configured) {
    return;
  }

  const apiKey = Platform.OS === 'ios' ? env.revenueCatIosKey : env.revenueCatAndroidKey;

  if (!apiKey) {
    return;
  }

  const purchases = getPurchases();
  if (!purchases) {
    return;
  }

  purchases.default.setLogLevel(purchases.LOG_LEVEL.WARN);
  await purchases.default.configure({ apiKey });
  configured = true;
}

export async function getRevenueCatPremiumStatus() {
  if (!env.revenueCatEnabled || Platform.OS === 'web') {
    return false;
  }

  const purchases = getPurchases();
  if (!purchases) {
    return false;
  }

  const info = await purchases.default.getCustomerInfo();
  return Boolean(info.entitlements.active.premium);
}

export async function purchasePremium() {
  if (!env.revenueCatEnabled || Platform.OS === 'web') {
    return { success: false, reason: 'RevenueCat disabled for this build.' };
  }

  const purchases = getPurchases();
  if (!purchases) {
    return { success: false, reason: 'RevenueCat is not available on this platform.' };
  }

  const offerings = await purchases.default.getOfferings();
  const pkg = offerings.current?.availablePackages[0];

  if (!pkg) {
    return { success: false, reason: 'No purchase package is currently available.' };
  }

  await purchases.default.purchasePackage(pkg);
  return { success: true };
}

export async function restorePremiumPurchases() {
  if (!env.revenueCatEnabled || Platform.OS === 'web') {
    return false;
  }

  const purchases = getPurchases();
  if (!purchases) {
    return false;
  }

  const info = await purchases.default.restorePurchases();
  return Boolean(info.entitlements.active.premium);
}
