import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';

import { AppScrollScreen } from '@/components/ui/app-screen';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { GlassCard } from '@/components/ui/glass-card';
import { palette, radius } from '@/constants/theme';
import { useWeeklyReferralLeaderboard } from '@/hooks/use-kurbada-data';
import { useAuth } from '@/hooks/use-auth';

function OfficialRulesModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: palette.background, padding: 20, gap: 14 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <AppText variant="screenTitle" style={{ fontSize: 22 }}>Official Rules</AppText>
          <Pressable onPress={onClose} hitSlop={12}>
            <Ionicons name="close" size={22} color={palette.textSecondary} />
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={{ gap: 14, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          <GlassCard style={{ padding: 16, gap: 8, borderRadius: radius.lg }}>
            <AppText variant="bodyBold">Weekly Referral Contest</AppText>
            <AppText variant="meta" style={{ color: palette.textSecondary }}>
              Eligibility: active Kurbada users in the Philippines, 18+, with a verified email and a valid referral code. Employees of Kurbada and their immediate families are not eligible.
            </AppText>
          </GlassCard>
          <GlassCard style={{ padding: 16, gap: 8, borderRadius: radius.lg }}>
            <AppText variant="bodyBold">Contest period</AppText>
            <AppText variant="meta" style={{ color: palette.textSecondary }}>
              Each contest week runs Monday 12:00 AM PHT through Sunday 11:59 PM PHT. Winners are determined within 48 hours of week close.
            </AppText>
          </GlassCard>
          <GlassCard style={{ padding: 16, gap: 8, borderRadius: radius.lg }}>
            <AppText variant="bodyBold">How to enter</AppText>
            <AppText variant="meta" style={{ color: palette.textSecondary }}>
              Share your unique referral code. A referral counts when the referred rider creates an account and either starts a free trial or activates any paid subscription during the contest week. Each account may be referred only once.
            </AppText>
          </GlassCard>
          <GlassCard style={{ padding: 16, gap: 8, borderRadius: radius.lg }}>
            <AppText variant="bodyBold">Prize</AppText>
            <AppText variant="meta" style={{ color: palette.textSecondary }}>
              The top three referrers each week receive three (3) months of Kurbada Premium, granted as a promotional entitlement at no charge. Approximate retail value: ₱177. The entitlement applies to the winner&apos;s Kurbada account only and cannot be transferred, exchanged, or redeemed for cash.
            </AppText>
          </GlassCard>
          <GlassCard style={{ padding: 16, gap: 8, borderRadius: radius.lg }}>
            <AppText variant="bodyBold">Selection and ties</AppText>
            <AppText variant="meta" style={{ color: palette.textSecondary }}>
              Winners are the three accounts with the highest count of eligible referrals during the contest week. In the event of a tie, earliest referral timestamp wins. Winners are notified in-app and by email within 72 hours.
            </AppText>
          </GlassCard>
          <GlassCard style={{ padding: 16, gap: 8, borderRadius: radius.lg }}>
            <AppText variant="bodyBold">Disqualification</AppText>
            <AppText variant="meta" style={{ color: palette.textSecondary }}>
              Fraudulent referrals, duplicate accounts, bot traffic, or any attempt to manipulate results will void all entries from the offending account. Kurbada may disqualify, suspend, or ban at its sole discretion.
            </AppText>
          </GlassCard>
          <GlassCard style={{ padding: 16, gap: 8, borderRadius: radius.lg }}>
            <AppText variant="bodyBold">No purchase necessary</AppText>
            <AppText variant="meta" style={{ color: palette.textSecondary }}>
              No purchase is required to enter or win. Void where prohibited by law. By entering, participants agree to the Kurbada Terms of Service and Privacy Policy.
            </AppText>
          </GlassCard>
          <GlassCard style={{ padding: 16, gap: 8, borderRadius: radius.lg }}>
            <AppText variant="bodyBold">Sponsor</AppText>
            <AppText variant="meta" style={{ color: palette.textSecondary }}>
              Kurbada (kurbada.samueluy.com). This promotion is not sponsored, endorsed, administered by, or associated with Apple, Google, Meta, or any other platform.
            </AppText>
          </GlassCard>
        </ScrollView>
      </View>
    </Modal>
  );
}

const medals = ['🥇', '🥈', '🥉'];

export default function ReferralLeaderboardScreen() {
  const { session } = useAuth();
  const leaderboard = useWeeklyReferralLeaderboard();
  const [showRules, setShowRules] = useState(false);

  const data = leaderboard.data ?? [];
  const top3 = data.slice(0, 3);
  const rest = data.slice(3);

  return (
    <AppScrollScreen showWordmark={false}>
      <View style={{ gap: 8 }}>
        <AppText variant="eyebrow">Weekly Referral Contest</AppText>
        <AppText variant="screenTitle" style={{ fontSize: 28 }}>
          Top referrers this week
        </AppText>
        <AppText variant="body" style={{ color: palette.textSecondary }}>
          Top 3 riders with the most successful referrals this week win 3 months of Premium.
        </AppText>
      </View>

      <Pressable
        onPress={() => setShowRules(true)}
        style={{ alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.06)' }}>
        <AppText variant="meta" style={{ color: palette.textSecondary, textDecorationLine: 'underline' }}>
          View Official Rules
        </AppText>
      </Pressable>

      {data.length === 0 ? (
        <GlassCard style={{ padding: 18 }}>
          <EmptyState icon="trophy-outline" title="Nothing yet this week" body="Be the first! Share your referral code from the Profile tab." />
        </GlassCard>
      ) : (
        <>
          <View style={{ gap: 10 }}>
            {top3.map((entry, i) => {
              const isMe = entry.referrer_user_id === session?.user.id;
              return (
                <GlassCard
                  key={entry.referrer_user_id}
                  style={{ padding: 18, flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: radius.lg, borderWidth: isMe ? 1 : 0.5, borderColor: isMe ? palette.danger : palette.border }}>
                  <AppText variant="heroMetric" style={{ fontSize: 32 }}>{medals[i]}</AppText>
                  <View style={{ flex: 1 }}>
                    <AppText variant="bodyBold" numberOfLines={1}>
                      {entry.display_name}
                      {entry.is_verified_host ? ' ⭐' : ''}
                      {isMe ? ' (you)' : ''}
                    </AppText>
                    <AppText variant="meta" style={{ color: palette.textSecondary }}>
                      {entry.referral_count} referral{entry.referral_count === 1 ? '' : 's'}
                    </AppText>
                  </View>
                  <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: 'rgba(46,204,113,0.12)' }}>
                    <AppText variant="label" style={{ color: palette.success }}>+3 MOS</AppText>
                  </View>
                </GlassCard>
              );
            })}
          </View>

          {rest.length ? (
            <View style={{ gap: 8 }}>
              <AppText variant="label" style={{ color: palette.textTertiary }}>OTHERS</AppText>
              {rest.map((entry, i) => {
                const isMe = entry.referrer_user_id === session?.user.id;
                return (
                  <View
                    key={entry.referrer_user_id}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 12, borderRadius: radius.md, backgroundColor: isMe ? 'rgba(198,69,55,0.08)' : 'transparent' }}>
                    <AppText variant="meta" style={{ color: palette.textTertiary, width: 30 }}>
                      #{i + 4}
                    </AppText>
                    <View style={{ flex: 1 }}>
                      <AppText variant="body" numberOfLines={1}>
                        {entry.display_name}
                        {entry.is_verified_host ? ' ⭐' : ''}
                        {isMe ? ' (you)' : ''}
                      </AppText>
                    </View>
                    <AppText variant="meta" style={{ color: palette.textSecondary }}>
                      {entry.referral_count}
                    </AppText>
                  </View>
                );
              })}
            </View>
          ) : null}
        </>
      )}

      <Button title="Back" variant="ghost" onPress={() => router.back()} />

      <OfficialRulesModal visible={showRules} onClose={() => setShowRules(false)} />
    </AppScrollScreen>
  );
}
