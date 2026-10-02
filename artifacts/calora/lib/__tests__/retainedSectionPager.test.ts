import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const pagerSource = readFileSync(resolve(__dirname, '../../components/SwipeableTabList.tsx'), 'utf8');
const profileSource = readFileSync(resolve(__dirname, '../../app/(tabs)/profile.tsx'), 'utf8');
const insightsSource = readFileSync(resolve(__dirname, '../../app/(tabs)/insights.tsx'), 'utf8');
const recipesSource = readFileSync(resolve(__dirname, '../../app/(tabs)/recipes.tsx'), 'utf8');

describe('retained section pager contracts', () => {
  it('uses native paging with the active and adjacent pages retained', () => {
    expect(pagerSource).toContain('pagingEnabled');
    expect(pagerSource).toContain('nestedScrollEnabled');
    expect(pagerSource).toContain('disableScrollViewPanResponder');
    expect(pagerSource).toContain('Math.abs(index - activeIndex) <= safeWindow');
    expect(pagerSource).toContain('onMomentumScrollEnd={commitNativePagerPosition}');
    expect(pagerSource).toContain('onScrollEndDrag={commitNativePagerPosition}');
  });

  it.each([
    ['Profile', profileSource, 'profile-section-content', 'renderItem={(tab) => ('],
    ['Progress', insightsSource, 'progress-section-content', 'renderItem={(view) => ('],
    ['Recipes', recipesSource, 'recipes-section-content', 'renderItem={renderRecipeSection}'],
  ])('%s retains adjacent panes instead of conditionally replacing the page', (_label, source, testID, renderer) => {
    expect(source).toContain(`testID="${testID}"`);
    expect(source).toContain(renderer);
    expect(source).toContain('renderWindow={1}');
    expect(source).toContain('nativePaging');
    expect(source).toContain('fillViewport');
  });

  it('uses the render-item tab for Profile retained pane visibility', () => {
    const renderItemStart = profileSource.indexOf('renderItem={(tab) => (');
    const renderItemEnd = profileSource.indexOf('renderWindow={1}', renderItemStart);
    const profilePaneSource = profileSource.slice(renderItemStart, renderItemEnd);
    expect(profilePaneSource).toContain("tab === 'you'");
    expect(profilePaneSource).toContain("tab === 'membership'");
    expect(profilePaneSource).toContain("tab === 'account'");
    expect(profilePaneSource).not.toContain('profileTab ===');
  });
});
