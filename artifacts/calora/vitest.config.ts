import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    // vitest.setup.ts defines __DEV__ as a runtime global so expo-modules-core
    // (which reads it at module-load time) does not throw in the test environment.
    setupFiles: ['./vitest.setup.ts'],
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
      // expo-file-system/legacy is upgraded and now imports expo-modules-core,
      // which reads native globals at module-load time (TurboModuleRegistry,
      // globalThis.expo.*) that are unavailable in node/jsdom environments.
      // This stub satisfies all CaloraContext / profilePhotoStorage import sites
      // without touching native code.
      'expo-file-system/legacy': path.resolve(__dirname, 'lib/__mocks__/expo-file-system-legacy.ts'),
    },
  },
});
