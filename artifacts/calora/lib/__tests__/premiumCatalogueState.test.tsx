// @vitest-environment jsdom
import React, { useCallback, useEffect, useState } from 'react';
import { render, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { PremiumRecipe } from '@workspace/api-client-react';
import { canApplyPremiumPage, samePremiumCatalogueState, type PremiumCatalogueState } from '../premiumCatalogueState';

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