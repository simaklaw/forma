import { StyleSheet } from 'react-native';
import { fonts, radius, spacing } from '@/core/theme/tokens';

export const workoutScreenStyles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    borderBottomWidth: 1
  },
  eyebrow: { fontFamily: fonts.mono, fontSize: 11, letterSpacing: 1, marginBottom: 4 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontFamily: fonts.mono, fontSize: 28 },
  catalogButton: {
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 8
  },
  catalogButtonText: { fontFamily: fonts.bodySemi, fontSize: 13 },
  modeTabs: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm
  },
  modeTab: {
    flex: 1,
    borderWidth: 1,
    borderRadius: radius.pill,
    alignItems: 'center',
    paddingVertical: 10
  },
  modeTabText: { fontFamily: fonts.bodySemi, fontSize: 14 },
  dayTabs: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, gap: 8 },
  dayTab: {
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 8
  },
  dayTabText: { fontFamily: fonts.bodySemi, fontSize: 13 },
  body: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: 40 },
  ticket: {
    borderWidth: 1,
    borderRadius: radius.card,
    overflow: 'hidden',
    marginBottom: spacing.md
  },
  ticketMain: { flexDirection: 'row', padding: spacing.md },
  ticketLabel: { fontFamily: fonts.body, fontSize: 11, marginBottom: 4 },
  ticketName: { fontFamily: fonts.bodySemi, fontSize: 18, marginBottom: 4 },
  ticketMeta: { fontFamily: fonts.body, fontSize: 12, marginBottom: 12 },
  resumeBlock: { gap: 8 },
  resumeHint: { fontFamily: fonts.body, fontSize: 12 },
  resumeActions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  startPill: {
    alignSelf: 'flex-start',
    borderRadius: radius.pill,
    paddingHorizontal: 16,
    paddingVertical: 10
  },
  startPillText: { fontFamily: fonts.bodySemi, fontSize: 14 },
  restartPill: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 9
  },
  restartPillText: { fontFamily: fonts.body, fontSize: 13 },
  sessionProgress: { marginTop: 10, marginBottom: 4 },
  sessionProgressTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
  sessionProgressFill: { height: 6, borderRadius: 3 },
  sessionProgressLbl: { marginTop: 4, fontSize: 11, fontFamily: fonts.body },
  ticketPerf: { flexDirection: 'row', borderTopWidth: 1 },
  perfCell: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRightWidth: 1,
    alignItems: 'center'
  },
  perfVal: { fontFamily: fonts.mono, fontSize: 18 },
  perfLbl: { fontFamily: fonts.body, fontSize: 10, marginTop: 2 },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: radius.card,
    padding: spacing.md,
    marginBottom: spacing.md
  },
  streakText: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18 },
  ticks: { flexDirection: 'row', gap: 4, marginTop: 8 },
  tick: { width: 18, height: 6, borderRadius: 3 },
  sectionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
    marginTop: spacing.sm
  },
  sectionTitle: { fontFamily: fonts.bodySemi, fontSize: 13, letterSpacing: 0.5 },
  sectionCount: { fontFamily: fonts.mono, fontSize: 12 },
  resetOverride: {
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center'
  },
  resetOverrideText: { fontFamily: fonts.body, fontSize: 12 },
  logRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: spacing.md,
    borderRadius: radius.card,
    borderWidth: 1,
    marginBottom: spacing.sm
  },
  logIndex: { fontFamily: fonts.mono, fontSize: 14, width: 28 },
  logNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logName: { fontSize: 15, fontFamily: fonts.bodySemi, flexShrink: 1 },
  nowBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.pill },
  nowBadgeText: { fontSize: 10, fontFamily: fonts.bodySemi },
  logSpec: { fontSize: 12, fontFamily: fonts.body, marginTop: 2 },
  logPr: { fontFamily: fonts.mono, fontSize: 14 },
  logPrLbl: { fontSize: 10, marginTop: 2 }
});
