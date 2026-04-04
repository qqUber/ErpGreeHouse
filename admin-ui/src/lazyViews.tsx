/**
 * Lazy-loaded Views for Code Splitting
 * Phase 5: Performance optimization with React.lazy()
 */

import { lazy, Suspense } from 'react';
import { PageTransition, SkeletonCard } from './components/ui/Animations';

// Lazy load heavy views with named export wrapping
export const AnalyticsView = lazy(() =>
  import('./AnalyticsView').then((m) => ({ default: m.AnalyticsView }))
);
export const MarketingView = lazy(() =>
  import('./MarketingView').then((m) => ({ default: m.MarketingView }))
);
export const ComplianceView = lazy(() =>
  import('./ComplianceView').then((m) => ({ default: m.ComplianceView }))
);
export const LoyaltyTmaView = lazy(() =>
  import('./LoyaltyTmaView').then((m) => ({ default: m.LoyaltyTmaView }))
);

// Loading fallback component
function ViewSkeleton() {
  return (
    <div style={{ padding: '2rem' }}>
      <PageTransition>
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </PageTransition>
    </div>
  );
}

// Suspense wrapper with fallback
export function LazyAnalyticsView() {
  return (
    <Suspense fallback={<ViewSkeleton />}>
      <AnalyticsView />
    </Suspense>
  );
}

export function LazyMarketingView() {
  return (
    <Suspense fallback={<ViewSkeleton />}>
      <MarketingView />
    </Suspense>
  );
}

export function LazyComplianceView() {
  return (
    <Suspense fallback={<ViewSkeleton />}>
      <ComplianceView />
    </Suspense>
  );
}

export function LazyLoyaltyTmaView() {
  return (
    <Suspense fallback={<ViewSkeleton />}>
      <LoyaltyTmaView />
    </Suspense>
  );
}
