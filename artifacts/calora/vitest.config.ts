import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['lib/__tests__/**/*.test.ts', 'lib/__tests__/**/*.test.tsx'],
  },
  resolve: {
    alias: {
      // Resolve the @workspace/api-client-react type import to its source
      '@workspace/api-client-react': path.resolve(__dirname, '../../lib/api-client-react/src/index.ts'),
      // Resolve the @ alias used in calora source
      '@': path.resolve(__dirname),
      // Map react-native to react-native-web for jsdom rendering tests.
      // Tests that vi.mock('react-native', ...) still use their own mock —
      // vi.mock takes precedence over alias resolution.
      'react-native': path.resolve(__dirname, 'node_modules/react-native-web'),
    },
  },
});
