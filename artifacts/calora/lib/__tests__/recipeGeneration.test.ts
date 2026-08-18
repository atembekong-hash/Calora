import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockGetSession = vi.fn();
const mockRefreshSession = vi.fn();

vi.mock('../supabase', () => ({
  supabase: {
    auth: {
      getSession: () => mockGetSession(),
      refreshSession: () => mockRefreshSession(),
    },
  },
  SUPABASE_STORAGE_KEY: 'test-key',
}));

vi.mock('../api-config', () => ({
  getApiBaseUrl: () => 'https://api.example.com',
}));

import {
  RecipeAuthError,
  SIGN_IN_MESSAGE,
  getFreshAccessToken,
  requestRecipeConcepts,
  requestGeneratedRecipe,
} from '../recipeGeneration';

const fetchMock = vi.fn();

function session(token: string, expiresInSeconds = 3600) {
  return { access_token: token, expires_at: Math.floor(Date.now() / 1000) + expiresInSeconds };
}

function jsonResponse(status: number, body: unknown) {
  return { ok: status >= 200 && status < 300, status, json: async () => body };
}

const CONCEPT_PAYLOAD = { ingredients: ['chicken'], mealType: 'Dinner', servings: 2, maxMinutes: 30, preferences: [], request: 'high-protein lemon herb chicken bowl' };

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockReset();
  mockGetSession.mockReset();
  mockRefreshSession.mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('getFreshAccessToken', () => {
  it('returns the stored token while it is still valid', async () => {
    mockGetSession.mockResolvedValue({ data: { session: session('valid-token') } });
    await expect(getFreshAccessToken()).resolves.toBe('valid-token');
    expect(mockRefreshSession).not.toHaveBeenCalled();
  });

  it('refreshes when the stored access token is expired', async () => {
    mockGetSession.mockResolvedValue({ data: { session: session('stale-token', -60) } });
    mockRefreshSession.mockResolvedValue({ data: { session: session('fresh-token') } });
    await expect(getFreshAccessToken()).resolves.toBe('fresh-token');
    expect(mockRefreshSession).toHaveBeenCalledTimes(1);
  });

  it('returns null when signed out', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });
    await expect(getFreshAccessToken()).resolves.toBeNull();
    expect(mockRefreshSession).not.toHaveBeenCalled();
  });
});

describe('requestRecipeConcepts (authenticated generation path)', () => {
  it('attaches the Bearer token and returns concepts for a signed-in user', async () => {
    mockGetSession.mockResolvedValue({ data: { session: session('valid-token') } });
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { concepts: [{ title: 'Lemon herb chicken bowl' }] }));

    const result = await requestRecipeConcepts<{ concepts: { title: string }[] }>(CONCEPT_PAYLOAD);

    expect(result.concepts[0].title).toBe('Lemon herb chicken bowl');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.example.com/api/v1/recipes/concepts');
    expect(init.headers.Authorization).toBe('Bearer valid-token');
    expect(JSON.parse(init.body).request).toBe('high-protein lemon herb chicken bowl');
  });

  it('never hits the network when signed out and surfaces the sign-in prompt', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });

    await expect(requestRecipeConcepts(CONCEPT_PAYLOAD)).rejects.toMatchObject({
      name: 'RecipeAuthError',
      message: SIGN_IN_MESSAGE,
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('recovers from a 401 by forcing a session refresh and retrying once', async () => {
    // getSession hands back a token that looks valid but the server rejects it.
    mockGetSession.mockResolvedValue({ data: { session: session('stale-but-unexpired') } });
    mockRefreshSession.mockResolvedValue({ data: { session: session('refreshed-token') } });
    fetchMock
      .mockResolvedValueOnce(jsonResponse(401, { message: SIGN_IN_MESSAGE }))
      .mockResolvedValueOnce(jsonResponse(200, { concepts: [{ title: 'Recovered idea' }] }));

    const result = await requestRecipeConcepts<{ concepts: { title: string }[] }>(CONCEPT_PAYLOAD);

    expect(result.concepts[0].title).toBe('Recovered idea');
    expect(mockRefreshSession).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1][1].headers.Authorization).toBe('Bearer refreshed-token');
  });

  it('shows the sign-in prompt when the retry still returns 401', async () => {
    mockGetSession.mockResolvedValue({ data: { session: session('rejected-token') } });
    mockRefreshSession.mockResolvedValue({ data: { session: session('still-rejected') } });
    fetchMock.mockResolvedValue(jsonResponse(401, { message: SIGN_IN_MESSAGE }));

    await expect(requestRecipeConcepts(CONCEPT_PAYLOAD)).rejects.toBeInstanceOf(RecipeAuthError);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('shows the sign-in prompt when the forced refresh fails outright', async () => {
    mockGetSession.mockResolvedValue({ data: { session: session('rejected-token') } });
    mockRefreshSession.mockResolvedValue({ data: { session: null } });
    fetchMock.mockResolvedValueOnce(jsonResponse(401, { message: SIGN_IN_MESSAGE }));

    await expect(requestRecipeConcepts(CONCEPT_PAYLOAD)).rejects.toMatchObject({ message: SIGN_IN_MESSAGE });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('surfaces server error messages for non-auth failures without retrying', async () => {
    mockGetSession.mockResolvedValue({ data: { session: session('valid-token') } });
    fetchMock.mockResolvedValueOnce(jsonResponse(502, { message: 'Calora couldn’t generate ideas right now.' }));

    await expect(requestRecipeConcepts(CONCEPT_PAYLOAD)).rejects.toThrow('Calora couldn’t generate ideas right now.');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(mockRefreshSession).not.toHaveBeenCalled();
  });
});

describe('requestGeneratedRecipe', () => {
  it('posts the concept to the generated endpoint with auth', async () => {
    mockGetSession.mockResolvedValue({ data: { session: session('valid-token') } });
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { name: 'Lemon herb chicken bowl', servings: 2 }));

    const result = await requestGeneratedRecipe<{ name: string }>({ title: 'Lemon herb chicken bowl', summary: 'Bright dinner', servings: 2 });

    expect(result.name).toBe('Lemon herb chicken bowl');
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.example.com/api/v1/recipes/generated');
    expect(init.headers.Authorization).toBe('Bearer valid-token');
  });

  it('uses the finish-recipe sign-in message when signed out', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });
    await expect(requestGeneratedRecipe({ title: 'X', summary: 'Y', servings: 2 })).rejects.toMatchObject({
      message: 'Please sign in to finish a recipe.',
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
