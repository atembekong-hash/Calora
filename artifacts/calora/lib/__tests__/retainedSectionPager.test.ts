import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const pagerSource = readFileSync(resolve(__dirname, '../../components/SwipeableTabList.tsx'), 'utf8');
const profileSource = readFileSync(resolve(__dirname, '../../app/(tabs)/profile.tsx'), 'utf8');
const insightsSource = readFileSync(resolve(__dirname, '../../app/(tabs)/insights.tsx'), 'utf8');
const recipesSource = readFileSync(resolve(__dirname, '../../app/(tabs)/recipes.tsx'), 'utf8');
const plannerSource = readFileSync(resolve(__dirname, '../../app/(tabs)/planner.tsx'), 'utf8');

describe('retained section pager contracts', () => {
  it('uses native paging with the active and adjacent pages retained', () => {
    expect(pagerSource).toContain('pagingEnabled');
    expect(pagerSource).toContain('nestedScrollEnabled');
    expect(pagerSource).toContain('disableScrollViewPanResponder');
    expect(pagerSource).toContain('Math.abs(index - activeIndex) <= safeWindow');
    expect(pagerSource).toContain('onMomentumScrollEnd={commitNativePagerPosition}');
    expect(pagerSource).toContain('onScrollEndDrag={commitNativePagerPosition}');
  });

  it('uses the translated retained track for web tab changes', () => {
    expect(pagerSource).toContain("const useNativePaging = nativePaging && Platform.OS !== 'web';");
    expect(pagerSource).toContain('if (useNativePaging && hasAdjacentPages && renderItem)');
    expect(pagerSource).toContain('if (!useNativePaging || surfaceWidth <= 0) return;');
    expect(pagerSource).toContain('onPreviewChange?: (item: T | null) => void;');
    expect(pagerSource).toContain('const nativePagerScrollHandler = useAnimatedScrollHandler');
    expect(pagerSource).toContain('onScroll={nativePagerScrollHandler}');
    expect(pagerSource).toContain('runOnJS(previewIndex)');
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

  it('uses a non-obscuring lower rail instead of an orange fill during direct-manipulation swipes', () => {
    expect(pagerSource).toContain('export function SwipeMenuHighlightProvider');
    expect(pagerSource).toContain('export function SwipeMenuHighlight');
    expect(pagerSource).toContain('pointerEvents="none"');
    expect(pagerSource).toContain('menuHighlightRail');
    expect(pagerSource).toContain('menuVisualIndex.value = clampSwipeMenuIndex');

    expect(profileSource).not.toContain('SwipeMenuHighlightProvider items={PROFILE_TABS}');
    expect(profileSource).toContain('testID="profile-membership-entry"');
    expect(profileSource).not.toContain('previewSelected ? colors.primary');
    expect(insightsSource).toContain('SwipeMenuHighlightProvider items={PROGRESS_VIEWS}');
    expect(insightsSource).toContain('testID="progress-section-swipe-indicator"');
    expect(insightsSource).not.toContain('previewSelected ? colors.primary');
    expect(recipesSource).toContain('SwipeMenuHighlightProvider items={RECIPE_SECTIONS}');
    expect(recipesSource).toContain('testID="recipes-section-swipe-indicator"');
    expect(recipesSource).not.toContain('previewSelected ? colors.primary');
    expect(plannerSource).toContain('SwipeMenuHighlightProvider items={weekDays}');
    expect(plannerSource).toContain('testID="planner-day-swipe-indicator"');
    expect(plannerSource).not.toContain('previewActive ? colors.primary');
  });

  it('previews the destination immediately while retaining release-only page commits', () => {
    expect(pagerSource).toContain('getWorkspaceSwipePreviewIndex');
    expect(pagerSource).not.toContain('Math.abs(offset) / width < 0.2');
    expect(pagerSource).toContain('onPanResponderMove');
    expect(pagerSource).toContain('onPanResponderTerminate');
    expect(pagerSource).toContain('menuHighlightRef.current?.setTabStripPreview(index);');
    expect(pagerSource).toContain('menuVisualIndex.value = nextVisualIndex;');
    expect(pagerSource).toContain('runOnJS(previewIndex)(null);');
    expect(pagerSource).toContain('onScrollEndDrag={commitNativePagerPosition}');
    expect(pagerSource).toContain('onMomentumScrollEnd={commitNativePagerPosition}');
  });

  it('shares one UI-thread indicator state between every menu strip and page surface', () => {
    const progressTabList = insightsSource.slice(
      insightsSource.indexOf('<SwipeableTabList'),
      insightsSource.indexOf('</SwipeableTabList>'),
    );

    expect(progressTabList).toContain('onChange={setProgressView}');
    expect(recipesSource).toContain('onChange={changeSection}');
    expect(plannerSource).toContain('onChange={setSelectedDay}');
    expect(profileSource).not.toContain('<SwipeMenuHighlightProvider');
    expect(insightsSource).toContain('<SwipeMenuHighlightProvider');
    expect(recipesSource).toContain('<SwipeMenuHighlightProvider');
    expect(plannerSource).toContain('<SwipeMenuHighlightProvider');
  });
});
