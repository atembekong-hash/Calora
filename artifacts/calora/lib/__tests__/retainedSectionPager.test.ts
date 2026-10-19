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
    expect(pagerSource).toContain('onScroll={(event) => {');
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

  it('highlights the destination menu item during direct-manipulation swipes', () => {
    expect(profileSource).toContain('const [profilePreview, setProfilePreview]');
    expect(profileSource).toContain('previewSelected ? colors.primary : colors.card');
    expect(profileSource).toContain('previewSelected\n                          ? colors.primaryForeground');
    expect(insightsSource).toContain('const [progressPreview, setProgressPreview]');
    expect(insightsSource).toContain('previewSelected ? colors.primary : colors.card');
    expect(insightsSource).toContain('previewSelected ? colors.primaryForeground');
    expect(recipesSource).toContain('const [sectionPreview, setSectionPreview]');
    expect(recipesSource).toContain('previewSelected ? colors.primary : colors.card');
    expect(recipesSource).toContain('previewSelected ? colors.primaryForeground');
    expect(plannerSource).toContain('const [selectedDayPreview, setSelectedDayPreview]');
    expect(plannerSource).toContain('onPreviewChange={setSelectedDayPreview}');
    expect(plannerSource).toContain('previewActive ? colors.primary : colors.accent');
  });

  it('previews the destination immediately while retaining release-only page commits', () => {
    expect(pagerSource).toContain('getWorkspaceSwipePreviewIndex');
    expect(pagerSource).not.toContain('Math.abs(offset) / width < 0.2');
    expect(pagerSource).toContain('onPanResponderMove');
    expect(pagerSource).toContain('onPanResponderTerminate');
    expect(pagerSource).toContain('runOnJS(previewIndex)(null);');
    expect(pagerSource).toContain('onScrollEndDrag={commitNativePagerPosition}');
    expect(pagerSource).toContain('onMomentumScrollEnd={commitNativePagerPosition}');
  });

  it('shares preview state between every swipeable menu strip and its page surface', () => {
    const profileTabList = profileSource.slice(
      profileSource.indexOf('<SwipeableTabList'),
      profileSource.indexOf('</SwipeableTabList>'),
    );
    const progressTabList = insightsSource.slice(
      insightsSource.indexOf('<SwipeableTabList'),
      insightsSource.indexOf('</SwipeableTabList>'),
    );

    expect(profileTabList).toContain('onPreviewChange={setProfilePreview}');
    expect(progressTabList).toContain('onPreviewChange={setProgressPreview}');
    expect(recipesSource).toContain('onPreviewChange={setSectionPreview}');
    expect(plannerSource).toContain('onPreviewChange={setSelectedDayPreview}');
  });
});
