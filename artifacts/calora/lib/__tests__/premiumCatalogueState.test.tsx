// @vitest-environment jsdom
import React, { useCallback, useEffect, useState } from 'react';
import { render, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { PremiumRecipe } from '@workspace/api-client-react';
import { applyPremiumDetailDenial, canApplyPremiumPage, clearPremiumAccountBoundary, clearPremiumCatalogueState, mergePremiumCataloguePage, restorePremiumCatalogueSession, samePremiumCatalogueSession, samePremiumCatalogueState, utcFreshnessDay, type PremiumCatalogueState } from '../premiumCatalogueState';

const recipes = [{ id: 'premium:provider:1', image: null }] as PremiumRecipe[];

function CatalogueChild({ onLoaded }: { onLoaded: (userId: string | null, rows: PremiumRecipe[]) => void }) {
  useEffect(() => { onLoaded('member-a', recipes); }, [onLoaded]);
  return null;
}

function MountedCatalogueLifecycle({ writes }: { writes: number[] }) {
  const [state, setState] = useState<PremiumCatalogueState>({ userId: null, recipes: [] });
  const onLoaded = useCallback((userId: string | null, rows: PremiumRecipe[]) => {
    setState((current) => {
      if (samePremiumCatalogueState(current, userId, rows)) return current;
      writes.push(1);
      return { userId, recipes: rows };
    });
  }, [writes]);
  return <CatalogueChild onLoaded={onLoaded} />;
}

describe('Premium catalogue mounted cache lifecycle', () => {
  it('retains the exact same-day account-owned browsing session and distinguishes another account', () => {
    const session: PremiumCatalogueState = {
      userId: 'member-a',
      recipes,
      freshnessDay: '2026-08-27',
      search: '',
      category: '',
      offset: 18,
      nextOffset: 36,
      terminalReason: null,
      scrollY: 640,
    };

    expect(samePremiumCatalogueSession(session, { ...session, recipes: [...recipes] })).toBe(true);
    expect(samePremiumCatalogueSession(session, { ...session, userId: 'member-b' })).toBe(false);
    expect(session.recipes).toBe(recipes);
    expect(session.scrollY).toBe(640);
  });

  it('derives a strict UTC freshness day independently of local timezone', () => {
    expect(utcFreshnessDay(new Date('2026-08-28T00:00:00.000Z'))).toBe('2026-08-28');
    expect(utcFreshnessDay(new Date('2026-08-27T23:59:59.999Z'))).toBe('2026-08-27');
  });

  it('resets only a new-day unfiltered session while retaining cards pending page zero', () => {
    const yesterday: PremiumCatalogueState = {
      userId: 'member-a', recipes, freshnessDay: '2026-08-27', offset: 36,
      nextOffset: 54, terminalReason: 'end', scrollY: 480,
    };
    expect(restorePremiumCatalogueSession(yesterday, 'member-a', '2026-08-28')).toMatchObject({
      recipes, freshnessDay: '2026-08-28', offset: 0, nextOffset: null, terminalReason: null, scrollY: 0,
    });
    const filtered = { ...yesterday, search: 'miso' };
    expect(restorePremiumCatalogueSession(filtered, 'member-a', '2026-08-28')).toEqual(filtered);
  });

  it('atomically replaces page zero and appends later real pages without duplicates', () => {
    const refreshed = [{ id: 'fresh-1' }, { id: 'fresh-2' }] as PremiumRecipe[];
    const later = [{ id: 'fresh-2' }, { id: 'fresh-3' }] as PremiumRecipe[];
    expect(mergePremiumCataloguePage(recipes, refreshed, 0)).toEqual(refreshed);
    expect(mergePremiumCataloguePage(refreshed, later, 18).map((recipe) => recipe.id)).toEqual(['fresh-1', 'fresh-2', 'fresh-3']);
    expect(clearPremiumCatalogueState()).toEqual({ userId: null, recipes: [] });
  });

  it('routes a 403 Premium detail denial through the account-wide protected-data boundary', () => {
    const calls: string[] = [];
    const clearBoundary = () => clearPremiumAccountBoundary({
      removeListQueries: () => calls.push('lists'),
      removeDetailQueries: () => calls.push('details'),
      clearSaved: () => calls.push('saved'),
      clearCatalogue: () => calls.push('catalogue'),
      closePremiumDetail: () => calls.push('detail'),
    });

    expect(applyPremiumDetailDenial(403, clearBoundary)).toBe(true);
    expect(calls).toEqual(['lists', 'details', 'saved', 'catalogue', 'detail']);
    expect(applyPremiumDetailDenial(502, clearBoundary)).toBe(false);
    expect(calls).toHaveLength(5);
  });

  it('does not loop parent writes when a mounted child republishes unchanged loaded rows', async () => {
    const writes: number[] = [];
    const view = render(<MountedCatalogueLifecycle writes={writes} />);
    await waitFor(() => expect(writes).toHaveLength(1));
    view.rerender(<MountedCatalogueLifecycle writes={writes} />);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(writes).toHaveLength(1);
  });

  it('waits for real delayed pages two and three before appending or terminating', async () => {
    const applied: string[] = [];
    function DelayedPages() {
      const [page, setPage] = useState({ id: 'page-1', placeholder: false });
      useEffect(() => {
        if (canApplyPremiumPage(page.placeholder)) applied.push(page.id);
      }, [page]);
      useEffect(() => {
        setPage({ id: 'page-1-placeholder-for-page-2', placeholder: true });
        const second = setTimeout(() => {
          setPage({ id: 'page-2', placeholder: false });
          setTimeout(() => setPage({ id: 'page-3', placeholder: false }), 0);
        }, 0);
        return () => clearTimeout(second);
      }, []);
      return null;
    }
    render(<DelayedPages />);
    await waitFor(() => expect(applied).toEqual(['page-1', 'page-2', 'page-3']));
    expect(applied).not.toContain('page-1-placeholder-for-page-2');
  });
});