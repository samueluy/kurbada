import * as Haptics from 'expo-haptics';

function fire(promise: Promise<unknown>) {
  promise.catch(() => undefined);
}

export function triggerSelectionHaptic() {
  fire(Haptics.selectionAsync());
}

export function triggerLightHaptic() {
  fire(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
}

export function triggerMediumHaptic() {
  fire(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));
}

export function triggerSuccessHaptic() {
  fire(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
}

export function triggerWarningHaptic() {
  fire(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning));
}

export function triggerErrorHaptic() {
  fire(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error));
}
