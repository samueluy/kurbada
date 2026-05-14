import Constants from 'expo-constants';
import * as Linking from 'expo-linking';
import { Platform } from 'react-native';
import Purchases, {
  type CustomerInfo,
  type CustomerInfoUpdateListener,
  type PurchasesOffering,
  type PurchasesOfferings,
  type PurchasesPackage,
} from 'react-native-purchases';

import { env } from '@/lib/env';

let configured = false;
let customerInfoListenerRegistered = false;
let currentAppUserId: string | null = null;
let cachedCustomerInfo: CustomerInfo | null = null;
let cachedOffering: PurchasesOffering | null = null;
const customerInfoSubscribers = new Set<(customerInfo: CustomerInfo) => void>();

function isRevenueCatSupported() {
  return env.revenueCatEnabled && Platform.OS !== 'web';
}

function getRevenueCatApiKey() {
  if (Platform.OS === 'ios') {
    return env.revenueCatIosKey;
  }

  if (Platform.OS === 'android') {
    return env.revenueCatAndroidKey;
  }

  return '';
}

function handleCustomerInfoUpdate(customerInfo: CustomerInfo) {
  cachedCustomerInfo = customerInfo;

  for (const subscriber of customerInfoSubscribers) {
    subscriber(customerInfo);
  }
}

function ensureCustomerInfoListener() {
  if (customerInfoListenerRegistered) {
    return;
  }

  const listener: CustomerInfoUpdateListener = (customerInfo) => {
    handleCustomerInfoUpdate(customerInfo);
  };

  Purchases.addCustomerInfoUpdateListener(listener);
  customerInfoListenerRegistered = true;
}

function normalizeOffering(offerings: PurchasesOfferings) {
  cachedOffering = offerings.current ?? null;
  return cachedOffering;
}

function selectDefaultPackage(offering: PurchasesOffering | null) {
  if (!offering) {
    return null;
  }

  const monthlyPackage = offering.availablePackages.find(
    (pkg) => pkg.packageType === Purchases.PACKAGE_TYPE.MONTHLY,
  );

  return monthlyPackage ?? offering.availablePackages[0] ?? null;
}

export async function configureRevenueCat() {
  if (!isRevenueCatSupported() || configured) {
    return;
  }

  const apiKey = getRevenueCatApiKey();
  if (!apiKey) {
    return;
  }

  Purchases.setLogLevel(Purchases.LOG_LEVEL.WARN);
  Purchases.setLogHandler((level, message) => {
    if (message.includes('BILLING_UNAVAILABLE') || message.includes('Billing service unavailable on device')) {
      console.warn(`[RevenueCat] ${message}`);
      return;
    }

    switch (level) {
      case Purchases.LOG_LEVEL.ERROR:
        console.error(`[RevenueCat] ${message}`);
        break;
      case Purchases.LOG_LEVEL.WARN:
        console.warn(`[RevenueCat] ${message}`);
        break;
      case Purchases.LOG_LEVEL.INFO:
        console.info(`[RevenueCat] ${message}`);
        break;
      case Purchases.LOG_LEVEL.DEBUG:
        console.debug(`[RevenueCat] ${message}`);
        break;
      default:
        console.log(`[RevenueCat] ${message}`);
    }
  });
  Purchases.configure({ apiKey });
  ensureCustomerInfoListener();
  configured = true;
}

export async function canMakeRevenueCatPurchases() {
  if (!isRevenueCatSupported()) {
    return false;
  }

  await configureRevenueCat();
  const canMakePayments = await Purchases.canMakePayments();
  console.info(`[bootstrap] revenuecat_can_make_payments available=${canMakePayments}`);
  return canMakePayments;
}

export async function syncRevenueCatIdentity(userId: string | null) {
  if (!isRevenueCatSupported()) {
    return;
  }

  await configureRevenueCat();
  console.info(`[bootstrap] revenuecat_identity_sync_start user=${userId ?? 'none'}`);

  if (!userId) {
    if (currentAppUserId === null) {
      return;
    }

    const customerInfo = await Purchases.logOut();
    currentAppUserId = null;
    handleCustomerInfoUpdate(customerInfo);
    console.info('[bootstrap] revenuecat_identity_sync_complete user=none');
    return;
  }

  if (currentAppUserId === userId) {
    console.info(`[bootstrap] revenuecat_identity_sync_skipped user=${userId}`);
    return;
  }

  const { customerInfo } = await Purchases.logIn(userId);
  currentAppUserId = userId;
  handleCustomerInfoUpdate(customerInfo);
  console.info(`[bootstrap] revenuecat_identity_sync_complete user=${userId}`);
}

export function subscribeToCustomerInfo(listener: (customerInfo: CustomerInfo) => void) {
  customerInfoSubscribers.add(listener);

  if (cachedCustomerInfo) {
    listener(cachedCustomerInfo);
  }

  return () => {
    customerInfoSubscribers.delete(listener);
  };
}

export async function getCustomerInfo(forceRefresh = false) {
  if (!isRevenueCatSupported()) {
    return null;
  }

  await configureRevenueCat();

  if (cachedCustomerInfo && !forceRefresh) {
    return cachedCustomerInfo;
  }

  const customerInfo = await Purchases.getCustomerInfo();
  handleCustomerInfoUpdate(customerInfo);
  return customerInfo;
}

export async function getCurrentOffering(forceRefresh = false) {
  if (!isRevenueCatSupported()) {
    return null;
  }

  await configureRevenueCat();

  if (cachedOffering && !forceRefresh) {
    return cachedOffering;
  }

  const offerings = await Purchases.getOfferings();
  return normalizeOffering(offerings);
}

export async function getCurrentOfferingPackage(forceRefresh = false) {
  const offering = await getCurrentOffering(forceRefresh);
  return selectDefaultPackage(offering);
}

export async function getPremiumAccessState() {
  const customerInfo = await getCustomerInfo();
  const hasPremium = Boolean(customerInfo?.entitlements.active.premium);
  console.info(`[bootstrap] revenuecat_entitlement_active premium=${hasPremium}`);
  return hasPremium;
}

export async function getRevenueCatSubscriptionSummary() {
  const customerInfo = await getCustomerInfo(true);
  if (!customerInfo) {
    return {
      hasPremium: false,
      status: 'inactive' as const,
      periodType: null,
      expirationDate: null,
      willRenew: false,
      productIdentifier: null,
    };
  }

  const entitlement = customerInfo.entitlements.active.premium;
  if (!entitlement) {
    return {
      hasPremium: false,
      status: 'inactive' as const,
      periodType: null,
      expirationDate: null,
      willRenew: false,
      productIdentifier: null,
    };
  }

  const periodType = entitlement.periodType ?? null;
  const status =
    periodType === 'TRIAL'
      ? 'trialing'
      : entitlement.willRenew
        ? 'active'
        : 'canceled';

  return {
    hasPremium: true,
    status,
    periodType,
    expirationDate: entitlement.expirationDate ?? null,
    willRenew: Boolean(entitlement.willRenew),
    productIdentifier: entitlement.productIdentifier ?? null,
  };
}

export async function openNativeSubscriptionManagement() {
  const appId =
    Constants.expoConfig?.ios?.bundleIdentifier
    ?? Constants.expoConfig?.android?.package
    ?? 'com.sajedph.kurbada';

  const iosUrl = 'https://apps.apple.com/account/subscriptions';
  const androidUrl = `https://play.google.com/store/account/subscriptions?package=${appId}`;
  const fallbackUrl = 'https://play.google.com/store/account/subscriptions';
  const targetUrl = Platform.OS === 'ios' ? iosUrl : Platform.OS === 'android' ? androidUrl : fallbackUrl;

  await Linking.openURL(targetUrl);
}

export async function purchasePremium() {
  if (!isRevenueCatSupported()) {
    return { success: false as const, reason: 'RevenueCat disabled for this build.' };
  }

  const canMakePurchases = await canMakeRevenueCatPurchases();
  if (!canMakePurchases) {
    return {
      success: false as const,
      reason: 'Purchases are unavailable on this device. Use a Play-enabled Android device or App Store-capable iPhone to subscribe.',
    };
  }

  const selectedPackage = await getCurrentOfferingPackage(true);
  if (!selectedPackage) {
    return { success: false as const, reason: 'No monthly purchase package is currently available.' };
  }

  try {
    const result = await Purchases.purchasePackage(selectedPackage);
    handleCustomerInfoUpdate(result.customerInfo);
    return { success: true as const, customerInfo: result.customerInfo, packageId: selectedPackage.identifier };
  } catch (error: any) {
    if (error?.userCancelled) {
      return { success: false as const, cancelled: true as const, reason: 'Purchase was cancelled.' };
    }

    return {
      success: false as const,
      reason: error instanceof Error ? error.message : 'Purchase failed.',
    };
  }
}

export async function restorePremiumPurchases() {
  if (!isRevenueCatSupported()) {
    return { success: false as const, hasPremium: false, reason: 'RevenueCat disabled for this build.' };
  }

  const canMakePurchases = await canMakeRevenueCatPurchases();
  if (!canMakePurchases) {
    return {
      success: false as const,
      hasPremium: false,
      reason: 'Purchases are unavailable on this device, so restore is not available here.',
    };
  }

  try {
    const customerInfo = await Purchases.restorePurchases();
    handleCustomerInfoUpdate(customerInfo);
    return {
      success: true as const,
      hasPremium: Boolean(customerInfo.entitlements.active.premium),
      customerInfo,
    };
  } catch (error) {
    return {
      success: false as const,
      hasPremium: false,
      reason: error instanceof Error ? error.message : 'Restore failed.',
    };
  }
}

export type RevenueCatOffering = PurchasesOffering;
export type RevenueCatPackage = PurchasesPackage;
