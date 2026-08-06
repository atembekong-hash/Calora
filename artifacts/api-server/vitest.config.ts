import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['src/__tests__/**/*.test.ts'],
  },
  resolve: {
    alias: {
      // Resolve workspace packages to their source
      '@workspace/integrations-openai-ai-server': path.resolve(
        __dirname,
        '../../lib/integrations-openai-ai-server/src/index.ts',
      ),
      '@workspace/api-zod': path.resolve(__dirname, '../../lib/api-zod/src/index.ts'),
    },
  },
});
