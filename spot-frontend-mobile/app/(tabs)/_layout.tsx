import { Tabs } from 'expo-router';
import { AppTabBar } from '@/components/navigation/AppTabBar';

/**
 * The 5 bottom-nav tabs (Home, Booking, Matches, Schedule, Settings) as an
 * expo-router `Tabs` group — this is what keeps each tab's screen mounted
 * in the background across switches instead of the previous `Stack` +
 * `router.replace()` fully unmounting/remounting on every tap (see
 * specs/002-tab-navigation-performance/research.md §1). `unmountOnBlur`
 * must NOT be set on any screen here — that option would reintroduce the
 * exact bug this group fixes.
 *
 * `tabBar` fully replaces the default tab bar with `AppTabBar`, which wraps
 * the existing `SlidingBottomNav` UI (research.md §2) — no visual change,
 * only how navigation is triggered.
 */
export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <AppTabBar {...props} />}>
      <Tabs.Screen name="home" />
      <Tabs.Screen name="booking" />
      <Tabs.Screen name="matches" />
      <Tabs.Screen name="schedule" />
      <Tabs.Screen name="settings" />
    </Tabs>
  );
}
