import type {
  OnboardingDraftScope,
  OnboardingDraftTargetMode,
  OnboardingSyncStatus,
} from '@/store/app-store';

type OnboardingSyncUserArgs = {
  scope: OnboardingDraftScope;
  targetMode: OnboardingDraftTargetMode;
  targetEmail: string | null;
  status: OnboardingSyncStatus;
  userEmail?: string | null;
};

function matchesDraftTarget({
  scope,
  targetMode,
  targetEmail,
  userEmail,
}: Omit<OnboardingSyncUserArgs, 'status'>) {
  const normalizedUserEmail = userEmail?.trim().toLowerCase() ?? null;

  return Boolean(
    scope === 'anonymous-signup'
      && targetMode === 'new-account-only'
      && targetEmail
      && normalizedUserEmail
      && targetEmail === normalizedUserEmail,
  );
}

export function hasPendingOnboardingSyncForUser(args: OnboardingSyncUserArgs) {
  return matchesDraftTarget(args) && (args.status === 'pending' || args.status === 'syncing');
}

export function hasFailedOnboardingSyncForUser(args: OnboardingSyncUserArgs) {
  return matchesDraftTarget(args) && args.status === 'failed';
}
