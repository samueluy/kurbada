import { Ionicons } from '@expo/vector-icons';
import { useMemo, useRef } from 'react';
import { Pressable, TextInput, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { PickerSheet, type PickerSheetRef } from '@/components/ui/picker-sheet';
import { palette, radius, typography } from '@/constants/theme';
import { bikeBrands, getModelsForBrand } from '@/lib/bike-models';
import type { RideMode } from '@/types/domain';

export type BikeIdentityDraft = {
  nickname: string;
  brand: string;
  brandCustom: string;
  model: string;
  modelCustom: string;
  year: string;
  engineCc: string;
  odometerKm: string;
  ridingStyle: RideMode;
};

export type BikeIdentityFormProps = {
  value: BikeIdentityDraft;
  onChange: (partial: Partial<BikeIdentityDraft>) => void;
  showRidingStyle?: boolean;
  showNickname?: boolean;
};

export const BIKE_IDENTITY_EMPTY: BikeIdentityDraft = {
  nickname: '',
  brand: '',
  brandCustom: '',
  model: '',
  modelCustom: '',
  year: '',
  engineCc: '',
  odometerKm: '',
  ridingStyle: 'weekend',
};

export function resolveBikeIdentity(draft: BikeIdentityDraft) {
  const finalNickname = draft.nickname.trim();
  const finalBrand = draft.brand === 'Other' ? draft.brandCustom.trim() : draft.brand.trim();
  const finalModel = draft.model === 'Other' ? draft.modelCustom.trim() : draft.model.trim();
  const finalYear = draft.year.trim();
  const finalCc = draft.engineCc.trim();
  const finalOdometer = draft.odometerKm.trim();
  const isValid = Boolean(finalBrand && finalModel && finalYear && finalCc && finalOdometer);
  return { finalNickname, finalBrand, finalModel, finalYear, finalCc, finalOdometer, isValid };
}

const inputStyle = {
  minHeight: 48,
  borderRadius: radius.md,
  borderWidth: 0.5,
  borderColor: palette.border,
  paddingHorizontal: 16,
  backgroundColor: 'rgba(255,255,255,0.04)',
  color: palette.text,
  fontFamily: typography.body,
  fontSize: 15,
} as const;

const ridingStyles: { mode: RideMode; label: string; subtitle: string; icon: string }[] = [
  { mode: 'weekend', label: 'Weekend Twisties', subtitle: 'Cinematic telemetry, curves, max lean', icon: 'speedometer-outline' },
  { mode: 'hustle', label: 'Daily Ride', subtitle: 'Traffic efficiency, fuel tracking, battery smart', icon: 'timer-outline' },
];

function PickerTrigger({ label, value, placeholder, onPress }: { label: string; value: string; placeholder: string; onPress: () => void }) {
  return (
    <View style={{ gap: 6 }}>
      <AppText variant="label" style={{ color: palette.textSecondary, fontSize: 12 }}>
        {label}
      </AppText>
      <Pressable
        onPress={onPress}
        style={{ paddingVertical: 14, paddingHorizontal: 16, borderRadius: radius.md, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 0.5, borderColor: palette.border }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <AppText variant="body" style={{ color: value ? palette.text : palette.textTertiary }} numberOfLines={1} ellipsizeMode="tail">
            {value || placeholder}
          </AppText>
          <Ionicons name="chevron-down" size={20} color={palette.textSecondary} />
        </View>
      </Pressable>
    </View>
  );
}

export function BikeIdentityForm({ value, onChange, showRidingStyle = false, showNickname = false }: BikeIdentityFormProps) {
  const brandSheetRef = useRef<PickerSheetRef>(null);
  const modelSheetRef = useRef<PickerSheetRef>(null);

  const brandModels = useMemo(() => (value.brand && value.brand !== 'Other' ? getModelsForBrand(value.brand) : []), [value.brand]);

  const brandOptions = useMemo(() => bikeBrands.map((b) => ({ label: b, value: b })), []);
  const modelOptions = useMemo(
    () => [...brandModels.map((m) => ({ label: m.name, value: m.name })), { label: 'Other', value: 'Other' }],
    [brandModels],
  );

  const handleBrandSelect = (nextBrand: string) => {
    onChange({
      brand: nextBrand,
      brandCustom: nextBrand === 'Other' ? value.brandCustom : '',
      model: '',
      modelCustom: '',
      engineCc: '',
    });
  };

  const handleModelSelect = (nextModel: string) => {
    if (nextModel === 'Other') {
      onChange({ model: 'Other', modelCustom: '', engineCc: '' });
      return;
    }
    const found = brandModels.find((m) => m.name === nextModel);
    const nextCc = found ? found.cc.toString() : value.engineCc;
    onChange({ model: nextModel, modelCustom: '', engineCc: nextCc });
  };

  const brandDisplay = value.brand === 'Other' && value.brandCustom ? value.brandCustom : value.brand;

  return (
    <>
      {showNickname ? (
        <TextInput
          value={value.nickname}
          onChangeText={(next) => onChange({ nickname: next })}
          placeholder="Bike Nickname (optional)"
          placeholderTextColor={palette.textTertiary}
          selectionColor={palette.danger}
          style={inputStyle}
        />
      ) : null}

      <PickerTrigger label="Brand" value={brandDisplay} placeholder="Select brand" onPress={() => brandSheetRef.current?.present()} />

      {value.brand === 'Other' ? (
        <TextInput
          value={value.brandCustom}
          onChangeText={(next) => onChange({ brandCustom: next })}
          placeholder="Enter brand name"
          placeholderTextColor={palette.textTertiary}
          selectionColor={palette.danger}
          style={inputStyle}
        />
      ) : null}

      {value.brand && value.brand !== 'Other' ? (
        <PickerTrigger label="Model" value={value.model} placeholder="Select model" onPress={() => modelSheetRef.current?.present()} />
      ) : null}

      {(value.brand === 'Other' || value.model === 'Other') ? (
        <TextInput
          value={value.brand === 'Other' ? value.modelCustom : value.modelCustom}
          onChangeText={(next) => onChange({ modelCustom: next })}
          placeholder="Model"
          placeholderTextColor={palette.textTertiary}
          selectionColor={palette.danger}
          style={inputStyle}
        />
      ) : null}

      <TextInput
        value={value.year}
        onChangeText={(next) => onChange({ year: next })}
        placeholder="Year (e.g. 2023)"
        placeholderTextColor={palette.textTertiary}
        keyboardType="number-pad"
        maxLength={4}
        selectionColor={palette.danger}
        style={inputStyle}
      />

      <TextInput
        value={value.engineCc}
        onChangeText={(next) => onChange({ engineCc: next })}
        placeholder="Engine CC"
        placeholderTextColor={palette.textTertiary}
        keyboardType="number-pad"
        selectionColor={palette.danger}
        style={inputStyle}
      />

      <TextInput
        value={value.odometerKm}
        onChangeText={(next) => onChange({ odometerKm: next })}
        placeholder="Current Odometer (km)"
        placeholderTextColor={palette.textTertiary}
        keyboardType="number-pad"
        selectionColor={palette.danger}
        style={inputStyle}
      />

      {showRidingStyle ? (
        <View style={{ gap: 8 }}>
          <AppText variant="label" style={{ color: palette.textSecondary, fontSize: 12 }}>Riding Style</AppText>
          {ridingStyles.map((style) => (
            <Pressable
              key={style.mode}
              onPress={() => onChange({ ridingStyle: style.mode })}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: radius.md, borderWidth: value.ridingStyle === style.mode ? 0 : 1.5, borderColor: palette.border, backgroundColor: value.ridingStyle === style.mode ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.04)', paddingHorizontal: 16, paddingVertical: 14 }}>
              <Ionicons name={style.icon as any} size={22} color={value.ridingStyle === style.mode ? palette.text : palette.textSecondary} />
              <View style={{ flex: 1, gap: 2, minWidth: 0 }}>
                <AppText variant="bodyBold" numberOfLines={1} ellipsizeMode="tail" style={{ color: value.ridingStyle === style.mode ? palette.text : palette.textSecondary }}>{style.label}</AppText>
                <AppText variant="meta" numberOfLines={2} ellipsizeMode="tail" style={{ fontSize: 12, color: palette.textTertiary }}>{style.subtitle}</AppText>
              </View>
            </Pressable>
          ))}
        </View>
      ) : null}

      <PickerSheet
        ref={brandSheetRef}
        title="Select brand"
        options={brandOptions}
        selectedValue={value.brand}
        onSelect={handleBrandSelect}
      />
      <PickerSheet
        ref={modelSheetRef}
        title="Select model"
        options={modelOptions}
        selectedValue={value.model}
        onSelect={handleModelSelect}
      />
    </>
  );
}
