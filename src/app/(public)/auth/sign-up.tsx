import * as Linking from "expo-linking";
import { Link, Redirect, router } from "expo-router";
import { useState } from "react";
import { Alert, TextInput, View } from "react-native";

import { AppScrollScreen } from "@/components/ui/app-screen";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { palette, radius, typography } from "@/constants/theme";
import { useAuth } from "@/hooks/use-auth";
import { getRideModeLabel } from "@/lib/onboarding";
import { useAppStore } from "@/store/app-store";

function Field({
  value,
  onChangeText,
  placeholder,
  secureTextEntry = false,
  keyboardType = "default",
  autoCapitalize = "sentences",
}: {
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  secureTextEntry?: boolean;
  keyboardType?: TextInput["props"]["keyboardType"];
  autoCapitalize?: TextInput["props"]["autoCapitalize"];
}) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={palette.textTertiary}
      secureTextEntry={secureTextEntry}
      keyboardType={keyboardType}
      autoCapitalize={autoCapitalize}
      autoCorrect={false}
      textContentType={
        secureTextEntry
          ? "password"
          : keyboardType === "email-address"
            ? "emailAddress"
            : undefined
      }
      selectionColor={palette.danger}
      style={{
        minHeight: 52,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: palette.border,
        paddingHorizontal: 16,
        backgroundColor: palette.surface,
        color: palette.text,
        fontFamily: typography.body,
        fontSize: 15,
      }}
    />
  );
}

export default function SignUpScreen() {
  const { session, signUp } = useAuth();
  const onboardingData = useAppStore((state) => state.onboardingData);
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  if (session) {
    return <Redirect href="/" />;
  }

  return (
    <AppScrollScreen
      contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}
    >
      <GlassCard style={{ gap: 18, padding: 22, overflow: 'visible' }}>
        <View style={{ gap: 6 }}>
          <AppText variant="screenTitle" style={{ fontSize: 30 }}>
            Create account
          </AppText>
          <AppText variant="meta" style={{ color: palette.textSecondary }}>
            Your onboarding data is saved. Create your account and verify your
            email to finish setup cleanly.
          </AppText>
        </View>

        {onboardingData.bikeBrand ? (
          <View
            style={{
              padding: 12,
              borderRadius: radius.md,
              backgroundColor: "rgba(255,255,255,0.04)",
              gap: 4,
            }}
          >
            <AppText
              variant="label"
              style={{ color: palette.textTertiary, fontSize: 11 }}
            >
              Your setup
            </AppText>
            <AppText variant="meta" style={{ color: palette.textSecondary }}>
              {onboardingData.bikeBrand}{" "}
              {onboardingData.bikeModel ? `· ${onboardingData.bikeModel}` : ""}
              {onboardingData.bikeEngineCc
                ? ` · ${onboardingData.bikeEngineCc}cc`
                : ""}
              {` · ${getRideModeLabel(onboardingData.ridingStyle)}`}
            </AppText>
          </View>
        ) : null}

        <Field
          value={displayName}
          onChangeText={setDisplayName}
          placeholder="Display name"
        />
        <Field
          value={email}
          onChangeText={setEmail}
          placeholder="Email"
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <Field
          value={password}
          onChangeText={setPassword}
          placeholder="Password"
          secureTextEntry
        />
        <AppText
          variant="meta"
          style={{ color: palette.textSecondary, lineHeight: 19 }}
        >
          By registering, you agree to the{" "}
          <AppText
            variant="meta"
            onPress={() =>
              Linking.openURL("https://kurbada.samueluy.com/terms").catch(
                () => undefined,
              )
            }
            style={{ color: palette.text, textDecorationLine: "underline" }}
          >
            Terms & Conditions
          </AppText>{" "}
          and{" "}
          <AppText
            variant="meta"
            onPress={() =>
              Linking.openURL("https://kurbada.samueluy.com/policy").catch(
                () => undefined,
              )
            }
            style={{ color: palette.text, textDecorationLine: "underline" }}
          >
            Privacy Policy
          </AppText>
          .
        </AppText>

        <Button
          title={busy ? "Creating..." : "Create Account"}
          disabled={busy}
          onPress={async () => {
            try {
              setBusy(true);
              const result = await signUp(
                email.trim(),
                password,
                displayName.trim() ||
                  onboardingData.fullName ||
                  "Kurbada Rider",
              );
              if (result.requiresEmailVerification) {
                router.replace("/(public)/auth/confirmed?mode=pending");
                return;
              }
              router.replace("/");
            } catch (error) {
              Alert.alert(
                "Sign up failed",
                error instanceof Error ? error.message : "Please try again.",
              );
            } finally {
              setBusy(false);
            }
          }}
        />
        <Link href="/(public)/auth/sign-in" asChild>
          <Button title="Back to Sign In" variant="secondary" />
        </Link>
      </GlassCard>
    </AppScrollScreen>
  );
}
