import { describe, expect, it } from 'vitest';
import { buildCatalogRecipeSuggestionRows } from '../recipeSuggestions';

type Candidate = {
  id: string;
  name: string;
  category: string;
  area: string;
  mealType: string;
  tags: string[];
};

function recipe(id: string, source: 'plus' | 'discover'): Candidate {
  return {
    id,
    name: `${source} recipe ${id}`,
    category: 'Dinner',
    area: 'Mediterranean',
    mealType: 'dinner',
    tags: ['balanced'],
  };
}

describe('catalog recipe suggestions', () => {
  it('builds up to 20 existing Plus and Discover recipes without generation', () => {
    const current = recipe('current', 'discover');
    const plus = Array.from({ length: 24 }, (_, index) => recipe(`plus-${index}`, 'plus'));
    const discover = Array.from({ length: 24 }, (_, index) => recipe(`discover-${index}`, 'discover'));

    const rows = buildCatalogRecipeSuggestionRows({ plus, discover, current, perRow: 20 });

    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveLength(20);
    expect(rows[1]).toHaveLength(20);
    expect(rows.flat().every((item) => !item.id.startsWith('generated-'))).toBe(true);
  });

  it('excludes the selected recipe and prevents overlap between catalog rows', () => {
    const current = recipe('current', 'discover');
    const shared = recipe('shared', 'plus');
    const plus = [shared, recipe('plus-1', 'plus')];
    const discover = [shared, current, recipe('discover-1', 'discover')];

    const rows = buildCatalogRecipeSuggestionRows({ plus, discover, current, perRow: 20 });
    const ids = rows.flat().map((item) => item.id);

    expect(ids).toHaveLength(3);
    expect(new Set(ids)).toEqual(new Set(['shared', 'plus-1', 'discover-1']));
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).not.toContain(current.id);
  });

  it('returns no rows until a recipe is selected', () => {
    expect(buildCatalogRecipeSuggestionRows({ plus: [recipe('plus-1', 'plus')], discover: [recipe('discover-1', 'discover')], current: null })).toEqual([]);
  });
});
