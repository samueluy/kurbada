import { useAuth } from '@/hooks/use-auth';
import { useOnboardingSync } from '@/hooks/use-kurbada-data';

export function OnboardingSyncBridge() {
  const { session } = useAuth();
  useOnboardingSync(session?.user.id);
  return null;
}
