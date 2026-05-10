import { Ionicons } from '@expo/vector-icons';
import { BottomSheetBackdrop, BottomSheetFlatList, BottomSheetModal, type BottomSheetBackdropProps } from '@gorhom/bottom-sheet';
import { forwardRef, useCallback, useImperativeHandle, useMemo, useRef } from 'react';
import { Pressable, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { palette, radius } from '@/constants/theme';

export type PickerOption = {
  label: string;
  value: string;
};

export type PickerSheetRef = {
  present: () => void;
  dismiss: () => void;
};

type PickerSheetProps = {
  title?: string;
  options: PickerOption[];
  selectedValue?: string;
  onSelect: (value: string) => void;
  footer?: React.ReactNode;
};

export const PickerSheet = forwardRef<PickerSheetRef, PickerSheetProps>(function PickerSheet(
  { title, options, selectedValue, onSelect, footer },
  ref,
) {
  const sheetRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ['60%', '85%'], []);

  useImperativeHandle(
    ref,
    () => ({
      present: () => sheetRef.current?.present(),
      dismiss: () => sheetRef.current?.dismiss(),
    }),
    [],
  );

  const handleSelect = useCallback(
    (value: string) => {
      onSelect(value);
      sheetRef.current?.dismiss();
    },
    [onSelect],
  );

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} pressBehavior="close" opacity={0.6} />
    ),
    [],
  );

  return (
    <BottomSheetModal
      ref={sheetRef}
      snapPoints={snapPoints}
      enableDynamicSizing={false}
      backdropComponent={renderBackdrop}
      backgroundStyle={{
        backgroundColor: palette.surfaceStrong,
        borderTopLeftRadius: radius.xl,
        borderTopRightRadius: radius.xl,
        borderWidth: 0.5,
        borderColor: palette.border,
      }}
      handleIndicatorStyle={{ backgroundColor: palette.textTertiary }}>
      {title ? (
        <View style={{ paddingHorizontal: 20, paddingTop: 4, paddingBottom: 12, borderBottomWidth: 0.5, borderBottomColor: palette.border }}>
          <AppText variant="bodyBold" style={{ fontSize: 16 }}>
            {title}
          </AppText>
        </View>
      ) : null}
      <BottomSheetFlatList
        data={options}
        keyExtractor={(item) => item.value}
        contentContainerStyle={{ paddingBottom: 32 }}
        renderItem={({ item }) => {
          const active = item.value === selectedValue;
          return (
            <Pressable
              onPress={() => handleSelect(item.value)}
              style={{
                paddingVertical: 14,
                paddingHorizontal: 20,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: active ? 'rgba(255,255,255,0.08)' : 'transparent',
              }}>
              <AppText variant="body" style={{ color: active ? palette.text : palette.textSecondary }}>
                {item.label}
              </AppText>
              {active ? <Ionicons name="checkmark" size={18} color={palette.text} /> : null}
            </Pressable>
          );
        }}
        ListFooterComponent={footer ? <View>{footer}</View> : null}
      />
    </BottomSheetModal>
  );
});
