import { describe, expect, it } from 'vitest';
import { getRecipeMethodCharacterCount, parseRecipeInstructionSteps } from '@/lib/recipe-instructions';

describe('recipe instruction parsing', () => {
  it('preserves cooking order for newline-separated multi-step methods', () => {
    expect(parseRecipeInstructionSteps('Chop the onion.\nHeat oil in a pan.\nAdd onion and cook.\nServe warm.')).toEqual([
      'Chop the onion.',
      'Heat oil in a pan.',
      'Add onion and cook.',
      'Serve warm.',
    ]);
  });

  it('splits numbered instructions into meaningful steps', () => {
    expect(parseRecipeInstructionSteps('1. Preheat the oven.\n2. Mix flour and eggs.\n3. Bake until set.\n4. Cool before serving.')).toEqual([
      'Preheat the oven.',
      'Mix flour and eggs.',
      'Bake until set.',
      'Cool before serving.',
    ]);
  });

  it('separates genuine cooking actions in one long paragraph without inventing content', () => {
    expect(parseRecipeInstructionSteps('Heat the oil in a pan. Add the vegetables and stir for five minutes. Pour in the stock and simmer until tender. Serve with herbs.')).toEqual([
      'Heat the oil in a pan.',
      'Add the vegetables and stir for five minutes.',
      'Pour in the stock and simmer until tender.',
      'Serve with herbs.',
    ]);
  });

  it('preserves a short legitimate method instead of padding it', () => {
    expect(parseRecipeInstructionSteps('Mix and serve.')).toEqual(['Mix and serve.']);
  });

  it('returns no steps for missing or malformed instructions and drops empty fragments', () => {
    expect(parseRecipeInstructionSteps(null)).toEqual([]);
    expect(parseRecipeInstructionSteps(' \n * \n - \n ')).toEqual([]);
  });

  it('normalizes markdown and CRLF without creating fake steps', () => {
    expect(parseRecipeInstructionSteps('**Ingredients**\r\nsalt\r\n* Heat the pan.\r\n* Add eggs.\r\n* Serve.')).toEqual([
      'Heat the pan.',
      'Add eggs.',
      'Serve.',
    ]);
  });

  it('calculates method characters from meaningful normalized instruction text', () => {
    const method = 'Heat the pan.\nAdd eggs.\nServe.';
    expect(getRecipeMethodCharacterCount(method)).toBe('Heat the pan. Add eggs. Serve.'.length);
  });
});