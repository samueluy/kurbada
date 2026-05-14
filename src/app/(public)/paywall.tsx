import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Animated, Pressable, ScrollView, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { KeyboardSheet } from "@/components/ui/keyboard-sheet";
import { Colors, palette, radius } from "@/constants/theme";
import { useAuth } from "@/hooks/use-auth";
import { useReferralMutations } from "@/hooks/use-kurbada-data";
import { useRevenueCatStatus } from "@/hooks/use-revenuecat-status";
import { useUserAccess, useUserProfile } from "@/hooks/use-user-access";
import { triggerLightHaptic, triggerSuccessHaptic } from "@/lib/haptics";
import { env } from "@/lib/env";
import { normalizeReferralCode, validateReferralCode } from "@/lib/referrals";
import {
  canMakeRevenueCatPurchases,
  getCurrentOffering,
  getCurrentOfferingPackage,
  purchasePremium,
  restorePremiumPurchases,
  type RevenueCatPackage,
} from "@/services/revenuecat";
import { useAppStore } from "@/store/app-store";
import { LinearGradient } from "expo-linear-gradient";

const features = [
  ["Honest Ride Tracking", "Route, speed, duration, fuel cost per run."],
  [
    "Emergency QR Lockscreen",
    "Your blood type and contacts, scannable in seconds.",
  ],
  ["Shareable Ride Cards", "Export polished ride graphics for TikTok and IG."],
  ["Maintenance Tracker", "Service intervals and reminders, odometer-linked."],
  [
    "Lobby — Group Rides",
    "Join or post group rides. Coordinate via Messenger.",
  ],
];

export default function PaywallScreen() {
  const params = useLocalSearchParams<{ context?: string }>();
  const insets = useSafeAreaInsets();
  const { session, isFreshSignupSession } = useAuth();
  const profile = useUserProfile(session?.user.id);
  const access = useUserAccess(session?.user.id);
  const revenueCatStatus = useRevenueCatStatus();
  const { applyReferralCode } = useReferralMutations(session?.user.id);
  const setOnboardingStep = useAppStore((state) => state.setOnboardingStep);
  const setPurchaseCompleted = useAppStore(
    (state) => state.setPurchaseCompleted,
  );
  const completeOnboarding = useAppStore((state) => state.completeOnboarding);
  const hasCompletedOnboarding = useAppStore(
    (state) => state.hasCompletedOnboarding,
  );
  const pendingReferralCode = useAppStore((state) => state.pendingReferralCode);
  const setPendingReferralCode = useAppStore(
    (state) => state.setPendingReferralCode,
  );
  const [showReferralSheet, setShowReferralSheet] = useState(
    Boolean(pendingReferralCode),
  );
  const [referralCode, setReferralCode] = useState(pendingReferralCode);
  const [referralError, setReferralError] = useState("");
  const [referralSuccess, setReferralSuccess] = useState("");
  const [isValidatingReferral, setIsValidatingReferral] = useState(false);
  const [offeringPackage, setOfferingPackage] =
    useState<RevenueCatPackage | null>(null);
  const [isLoadingOffering, setIsLoadingOffering] = useState(
    env.revenueCatEnabled,
  );
  const [billingAvailable, setBillingAvailable] = useState(
    !env.revenueCatEnabled,
  );
  const [purchaseError, setPurchaseError] = useState("");
  const [purchaseSession, setPurchaseSession] = useState<
    "idle" | "launching_sheet" | "awaiting_entitlement" | "failed"
  >("idle");
  const isOnboardingPaywall = params.context === "onboarding";
  const isGraceStatusVisible =
    Boolean(session?.user.id)
    && isOnboardingPaywall
    && access.data.reason === "grace";
  const ctaScale = useRef(new Animated.Value(1)).current;
  const purchaseResolvedRef = useRef(false);
  const purchaseWatchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearPurchaseWatchdog = useCallback(() => {
    if (purchaseWatchdogRef.current) {
      clearTimeout(purchaseWatchdogRef.current);
      purchaseWatchdogRef.current = null;
    }
  }, []);

  const finalizePremiumUnlock = useCallback((source: string) => {
    if (purchaseResolvedRef.current) {
      return;
    }

    purchaseResolvedRef.current = true;
    clearPurchaseWatchdog();
    setPurchaseSession("idle");
    setPurchaseError("");
    console.info(`[bootstrap] paywall_premium_unlocked source=${source}`);
    triggerSuccessHaptic();
    setPurchaseCompleted(true);
    setOnboardingStep(7);
    router.replace("/(public)/success" as any);
  }, [clearPurchaseWatchdog, setOnboardingStep, setPurchaseCompleted]);

  useEffect(() => {
    if (session && !hasCompletedOnboarding && !isOnboardingPaywall) {
      completeOnboarding();
    }
  }, [
    session,
    hasCompletedOnboarding,
    isOnboardingPaywall,
    completeOnboarding,
  ]);

  useEffect(() => {
    if (pendingReferralCode) {
      setReferralCode(pendingReferralCode);
      setShowReferralSheet(true);
      setReferralSuccess("Referral code ready to apply.");
    }
  }, [pendingReferralCode]);

  useEffect(() => {
    if (!env.revenueCatEnabled) {
      setIsLoadingOffering(false);
      return;
    }

    let cancelled = false;

    const loadOffering = async () => {
      console.info(
        `[bootstrap] paywall_offering_load_started onboarding=${isOnboardingPaywall} fresh_signup=${isFreshSignupSession}`,
      );
      setIsLoadingOffering(true);
      setPurchaseError("");

      try {
        const canMakePurchases = await canMakeRevenueCatPurchases();
        if (cancelled) return;

        console.info(
          `[bootstrap] paywall_can_make_purchases available=${canMakePurchases} onboarding=${isOnboardingPaywall} fresh_signup=${isFreshSignupSession}`,
        );
        setBillingAvailable(canMakePurchases);
        if (!canMakePurchases) {
          setPurchaseError(
            "Purchases aren't available on this device right now. Use a Play-enabled Android device or an App Store-capable iPhone to start Premium.",
          );
          setOfferingPackage(null);
          return;
        }

        const [offering, selectedPackage] = await Promise.all([
          getCurrentOffering(true),
          getCurrentOfferingPackage(true),
        ]);
        if (cancelled) return;

        console.info(
          `[bootstrap] paywall_offering_load_finished has_offering=${Boolean(offering)} has_package=${Boolean(selectedPackage)} onboarding=${isOnboardingPaywall} fresh_signup=${isFreshSignupSession}`,
        );
        setOfferingPackage(selectedPackage);
        if (!offering || !selectedPackage) {
          setPurchaseError(
            "We couldn't load the Premium offer right now. Please try again in a moment.",
          );
        }
      } catch (error) {
        console.warn("[bootstrap] paywall_offering_load_failed", error);
        if (!cancelled) {
          setPurchaseError(
            error instanceof Error
              ? error.message
              : "Unable to load Premium offering right now.",
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoadingOffering(false);
        }
      }
    };

    void loadOffering();

    return () => {
      cancelled = true;
    };
  }, [isFreshSignupSession, isOnboardingPaywall]);

  useEffect(() => {
    if (purchaseSession === "idle") {
      purchaseResolvedRef.current = false;
      clearPurchaseWatchdog();
      return;
    }

    const hasPremiumFromStatus = revenueCatStatus.hasPremium;
    const hasPremiumFromAccess = access.data.reason === "premium";

    if (hasPremiumFromStatus || hasPremiumFromAccess) {
      console.info(
        `[bootstrap] paywall_premium_observed status=${hasPremiumFromStatus} access=${hasPremiumFromAccess}`,
      );
      finalizePremiumUnlock(
        hasPremiumFromStatus ? "customer_info_listener" : "access_query",
      );
    }
  }, [
    access.data.reason,
    clearPurchaseWatchdog,
    finalizePremiumUnlock,
    purchaseSession,
    revenueCatStatus.hasPremium,
  ]);

  useEffect(() => clearPurchaseWatchdog, [clearPurchaseWatchdog]);

  const runPurchaseFlow = async () => {
    setPurchaseError("");
    purchaseResolvedRef.current = false;
    clearPurchaseWatchdog();
    setPurchaseSession("launching_sheet");
    console.info("[bootstrap] paywall_purchase_session_entered state=launching_sheet");
    purchaseWatchdogRef.current = setTimeout(() => {
      if (purchaseResolvedRef.current) {
        return;
      }
      console.warn("[bootstrap] paywall_purchase_sheet_timeout");
      setPurchaseSession("failed");
      setPurchaseError(
        "We’re still checking your trial access. If billing already completed, tap Restore Purchase or try again in a moment.",
      );
    }, 12000);

    try {
      const purchasePromise = purchasePremium();
      setPurchaseSession("awaiting_entitlement");
      console.info("[bootstrap] paywall_purchase_session_entered state=awaiting_entitlement");
      const result = await purchasePromise;
      clearPurchaseWatchdog();

      if (purchaseResolvedRef.current) {
        return;
      }

      if (result.success) {
        finalizePremiumUnlock("purchase_result");
        return;
      }

      if (!result.cancelled) {
        setPurchaseSession("failed");
        setPurchaseError(result.reason);
      } else {
        setPurchaseSession("idle");
      }
    } finally {
      clearPurchaseWatchdog();
    }
  };

  const handleStartTrial = async () => {
    console.info(
      `[bootstrap] paywall_start_trial onboarding=${isOnboardingPaywall} fresh_signup=${isFreshSignupSession} signed_in=${Boolean(session?.user.id)}`,
    );
    setPurchaseError("");

    if (!session?.user.id && env.revenueCatEnabled) {
      if (referralCode.trim()) {
        setPendingReferralCode(normalizeReferralCode(referralCode));
      }
      router.push("/(public)/auth/sign-up");
      return;
    }

    if (!env.revenueCatEnabled) {
      finalizePremiumUnlock("dev_bypass");
      return;
    }

    void runPurchaseFlow();
  };

  const handleValidateReferral = async () => {
    setIsValidatingReferral(true);
    setReferralError("");
    setReferralSuccess("");

    try {
      const validation = await validateReferralCode(
        referralCode,
        session?.user.id,
      );

      if (!validation.valid) {
        setReferralError(validation.reason);
        return;
      }

      setPendingReferralCode(validation.normalizedCode);

      if (session?.user.id) {
        await applyReferralCode.mutateAsync({
          code: validation.normalizedCode,
          referredDisplayName: profile.data?.display_name,
        });
        setReferralSuccess(
          `${validation.referrer.display_name}'s code is locked in.`,
        );
      } else {
        setReferralSuccess(
          `${validation.referrer.display_name}'s code will be applied after you create your account.`,
        );
      }
    } catch (error) {
      setReferralError(
        error instanceof Error
          ? error.message
          : "Unable to validate that referral code.",
      );
    } finally {
      setIsValidatingReferral(false);
    }
  };

  const handleRestore = async () => {
    const result = await restorePremiumPurchases();
    if (result.success && result.hasPremium) {
      finalizePremiumUnlock("restore");
    } else if (!result.success) {
      setPurchaseError(result.reason);
    }
  };

  const isPurchasing =
    purchaseSession === "launching_sheet" || purchaseSession === "awaiting_entitlement";
  const buttonTitle = purchaseSession === "launching_sheet"
    ? "Opening payment sheet…"
    : purchaseSession === "awaiting_entitlement"
      ? "Waiting for trial access…"
    : env.revenueCatEnabled
      ? session?.user.id
        ? billingAvailable
          ? isGraceStatusVisible
            ? "Finishing setup…"
            : "Start 7-Day Free Trial"
          : "Purchases Unavailable"
        : "Create Account to Start Trial"
      : "Continue (Dev Build)";
  const paywallStatusMessage = isGraceStatusVisible
    ? "Checking your trial access and finishing setup in the background. You shouldn't need anyone to manually enable your account."
    : purchaseError;

  const priceValue = offeringPackage?.packageType === "ANNUAL" ? "₱590" : "₱59";

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ flexGrow: 1 }}
      >
        <View
          style={{
            flex: 1,
            justifyContent: "space-between",
            backgroundColor: Colors.bg,
          }}
        >
          <View>
            <View
              style={{
                paddingTop: insets.top + 20,
                paddingHorizontal: 24,
                paddingBottom: 24,
                backgroundColor: Colors.bg,
              }}
            >
              {isOnboardingPaywall ? (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 18,
                  }}
                >
                  <Pressable
                    onPress={() => {
                      triggerLightHaptic();
                      setOnboardingStep(5);
                      if (router.canGoBack()) {
                        router.back();
                        return;
                      }
                      router.replace("/(public)/permissions" as any);
                    }}
                    hitSlop={12}
                    style={{ padding: 4 }}
                  >
                    <Ionicons name="arrow-back" size={20} color={Colors.t2} />
                  </Pressable>
                  <AppText
                    variant="label"
                    style={{ color: Colors.t3, fontSize: 10, letterSpacing: 2 }}
                  >
                    STEP 6 OF 6
                  </AppText>
                  <View style={{ width: 28 }} />
                </View>
              ) : null}

              <AppText
                variant="label"
                style={{
                  color: Colors.t3,
                  fontSize: 10,
                  letterSpacing: 2,
                  marginBottom: 10,
                }}
              >
                KURBADA PREMIUM
              </AppText>

              <AppText
                variant="brand"
                style={{
                  fontSize: 52,
                  lineHeight: 50,
                  letterSpacing: 1,
                  color: Colors.t1,
                  marginBottom: 20,
                }}
              >
                UNLOCK THE{"\n"}FULL RIDE.
              </AppText>

              <View
                style={{
                  flexDirection: "row",
                  alignItems: "flex-end",
                  gap: 10,
                }}
              >
                <View
                  style={{
                    backgroundColor: Colors.red,
                    borderRadius: 10,
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    flexDirection: "row",
                    alignItems: "flex-end",
                    gap: 3,
                  }}
                >
                  <AppText
                    variant="bodyBold"
                    style={{ fontSize: 28, lineHeight: 30, color: "#FFFFFF" }}
                  >
                    {priceValue}
                  </AppText>
                  <AppText
                    variant="meta"
                    style={{
                      fontSize: 12,
                      lineHeight: 16,
                      color: "rgba(255,255,255,0.65)",
                    }}
                  >
                    /month
                  </AppText>
                </View>

                <View style={{ gap: 2, paddingBottom: 2 }}>
                  <AppText
                    variant="bodyBold"
                    style={{ fontSize: 12, color: Colors.t2 }}
                  >
                    7-day free trial
                  </AppText>
                  <AppText
                    variant="meta"
                    style={{ fontSize: 11, color: Colors.t3 }}
                  >
                    Cancel anytime
                  </AppText>
                </View>
              </View>

              <LinearGradient
                colors={[Colors.red, "rgba(192,57,43,0)"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{ width: 80, height: 1, marginTop: 20 }}
              />
            </View>

            <View
              style={{
                backgroundColor: Colors.s1,
                borderRadius: 20,
                marginHorizontal: 16,
                borderWidth: 0.5,
                borderColor: Colors.border,
                overflow: "hidden",
                marginBottom: 16,
              }}
            >
              {features.map(([title, subtitle], index) => (
                <View
                  key={title}
                  style={{
                    paddingVertical: 14,
                    paddingHorizontal: 18,
                    borderBottomWidth: index === features.length - 1 ? 0 : 0.5,
                    borderBottomColor: Colors.border,
                    flexDirection: "row",
                    alignItems: "flex-start",
                    gap: 12,
                  }}
                >
                  <View
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 10,
                      backgroundColor: Colors.redDim,
                      borderWidth: 0.5,
                      borderColor: Colors.redBorder,
                      alignItems: "center",
                      justifyContent: "center",
                      marginTop: 1,
                    }}
                  >
                    <Ionicons name="checkmark" size={10} color={Colors.red} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <AppText
                      variant="bodyBold"
                      style={{ fontSize: 14, color: Colors.t1 }}
                    >
                      {title}
                    </AppText>
                    <AppText
                      variant="meta"
                      style={{ fontSize: 12, color: Colors.t3, marginTop: 2 }}
                    >
                      {subtitle}
                    </AppText>
                  </View>
                </View>
              ))}
            </View>

            <Pressable
              onPress={() => setShowReferralSheet(true)}
              style={{
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "row",
                gap: 6,
                marginBottom: 20,
              }}
            >
              <Ionicons name="gift-outline" size={13} color={Colors.t3} />
              <AppText
                variant="meta"
                style={{ fontSize: 13, color: Colors.t3, textAlign: "center" }}
              >
                Have a referral code?
              </AppText>
            </Pressable>

            {paywallStatusMessage ? (
              <View style={{ paddingHorizontal: 20, marginBottom: 12 }}>
                <AppText
                  variant="meta"
                  style={{ color: isGraceStatusVisible ? Colors.t3 : palette.danger, textAlign: "center" }}
                >
                  {paywallStatusMessage}
                </AppText>
              </View>
            ) : null}
          </View>

          <View
            style={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 16 }}
          >
            <Animated.View style={{ transform: [{ scale: ctaScale }] }}>
              <Pressable
                disabled={
                  isGraceStatusVisible ||
                  isPurchasing ||
                  (env.revenueCatEnabled &&
                    Boolean(session?.user.id) &&
                    ((isLoadingOffering && !isGraceStatusVisible) || (!offeringPackage && !isGraceStatusVisible) || (!billingAvailable && !isGraceStatusVisible)))
                }
                onPress={() => {
                  triggerLightHaptic();
                  void handleStartTrial();
                }}
                onPressIn={() => {
                  Animated.timing(ctaScale, {
                    toValue: 0.97,
                    duration: 80,
                    useNativeDriver: true,
                  }).start();
                }}
                onPressOut={() => {
                  Animated.spring(ctaScale, {
                    toValue: 1,
                    tension: 400,
                    friction: 20,
                    useNativeDriver: true,
                  }).start();
                }}
                style={{
                  height: 56,
                  backgroundColor: Colors.red,
                  borderRadius: 16,
                  alignItems: "center",
                  justifyContent: "center",
                  opacity:
                    isGraceStatusVisible ||
                    isPurchasing ||
                    (env.revenueCatEnabled &&
                      Boolean(session?.user.id) &&
                      ((isLoadingOffering && !isGraceStatusVisible) || (!offeringPackage && !isGraceStatusVisible) || (!billingAvailable && !isGraceStatusVisible)))
                      ? 0.55
                      : 1,
                  shadowColor: Colors.red,
                  shadowOffset: { width: 0, height: 6 },
                  shadowOpacity: 0.35,
                  shadowRadius: 16,
                  elevation: 8,
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <AppText
                    variant="bodyBold"
                    style={{ fontSize: 16, color: "#FFFFFF" }}
                  >
                    {buttonTitle}
                  </AppText>
                  <Ionicons
                    name="arrow-forward"
                    size={16}
                    color="#FFFFFF"
                    style={{ marginLeft: 6 }}
                  />
                </View>
              </Pressable>
            </Animated.View>

            <View
              style={{
                marginTop: 14,
                marginBottom: insets.bottom + 16,
                alignItems: "center",
                gap: 10,
              }}
            >
              <Pressable
                onPress={() => {
                  triggerLightHaptic();
                  void handleRestore();
                }}
                style={{ paddingVertical: 8, paddingHorizontal: 12 }}
              >
                <AppText
                  variant="bodyBold"
                  style={{ fontSize: 13, color: Colors.t3 }}
                >
                  Restore Purchase
                </AppText>
              </Pressable>

              {!session?.user.id ? (
                <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 4, flexWrap: 'wrap', paddingVertical: 8 }}>
                  <AppText variant="meta" style={{ fontSize: 13, color: Colors.t3 }}>
                    Already have an account?
                  </AppText>
                  <Pressable
                    hitSlop={8}
                    onPress={() => {
                      triggerLightHaptic();
                      router.push('/(public)/auth/sign-in');
                    }}
                  >
                    <AppText variant="bodyBold" style={{ fontSize: 13, color: Colors.t2 }}>
                      Sign in
                    </AppText>
                  </Pressable>
                </View>
              ) : null}

              <AppText
                variant="meta"
                style={{
                  fontSize: 11,
                  color: Colors.t3,
                  textAlign: "center",
                  paddingHorizontal: 32,
                  opacity: 0.6,
                }}
              >
                By continuing you agree to the subscription and trial terms.
              </AppText>
            </View>
          </View>
        </View>
      </ScrollView>

      <KeyboardSheet
        visible={showReferralSheet}
        onClose={() => setShowReferralSheet(false)}
        title="Enter Referral Code"
        subtitle="Apply a valid code now, or carry it into sign up."
      >
        <TextInput
          value={referralCode}
          onChangeText={(value) => {
            setReferralCode(value.toUpperCase());
            setReferralError("");
            setReferralSuccess("");
          }}
          placeholder="MARK450SR"
          placeholderTextColor={palette.textSecondary}
          autoCapitalize="characters"
          autoCorrect={false}
          selectionColor={palette.danger}
          style={{
            minHeight: 50,
            borderRadius: radius.md,
            paddingHorizontal: 16,
            borderWidth: 0.5,
            borderColor: referralError ? palette.danger : palette.border,
            backgroundColor: "rgba(255,255,255,0.06)",
            color: palette.text,
            fontFamily: "DMSans_400Regular",
            fontSize: 15,
          }}
        />
        <Button
          title={isValidatingReferral ? "Checking..." : "Validate Referral"}
          variant="secondary"
          disabled={isValidatingReferral}
          onPress={handleValidateReferral}
        />
        {referralError ? (
          <AppText variant="meta" style={{ color: palette.danger }}>
            {referralError}
          </AppText>
        ) : null}
        {referralSuccess ? (
          <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
            <Ionicons
              name="checkmark-circle"
              size={16}
              color={palette.success}
            />
            <AppText variant="meta" style={{ color: palette.success, flex: 1 }}>
              {referralSuccess}
            </AppText>
          </View>
        ) : null}
      </KeyboardSheet>
    </View>
  );
}
