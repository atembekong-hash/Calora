import React, { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BRAND } from '@/lib/brand';
import { storageKeyForAccount } from '@/lib/accountStorage';
import {
  ENCRYPTED_PREFIX,
  EncryptedStorageAdapter,
  EncryptedStorageError,
} from '@/lib/encryptedStorage';
import { secureStoreKeyAdapter } from '@/lib/secureStoreKeyAdapter';
import { PersistenceManager } from '@/lib/persistenceManager';
import { handleParseErrorExport } from '@/lib/parseErrorExportHandler';

const ACCOUNT_A = 'native-recovery-smoke-a';
const ACCOUNT_B = 'native-recovery-smoke-b';
const ACCOUNT_A_KEY = storageKeyForAccount(ACCOUNT_A);
const ACCOUNT_B_KEY = storageKeyForAccount(ACCOUNT_B);
const LEGACY_MARKER = 'native-recovery-legacy-marker';
const ACCOUNT_A_MARKER = 'native-recovery-account-a';
const ACCOUNT_B_MARKER = 'native-recovery-account-b';

type SmokeStep = {
  label: string;
  passed: boolean;
};

type SmokeResult = {
  steps: SmokeStep[];
  error: string | null;
};

function tamperEnvelope(raw: string): string {
  if (!raw.startsWith(ENCRYPTED_PREFIX)) {
    throw new Error('The migrated snapshot is not an encrypted envelope.');
  }

  const envelope = JSON.parse(raw.slice(ENCRYPTED_PREFIX.length)) as {
    nonce?: string;
    ciphertext?: string;
  };
  if (typeof envelope.ciphertext !== 'string' || envelope.ciphertext.length < 2) {
    throw new Error('The encrypted envelope has no ciphertext to tamper with.');
  }

  const last = envelope.ciphertext.at(-1);
  envelope.ciphertext = `${envelope.ciphertext.slice(0, -1)}${last === '0' ? '1' : '0'}`;
  return `${ENCRYPTED_PREFIX}${JSON.stringify(envelope)}`;
}

async function runEncryptedRecoverySmoke(): Promise<SmokeResult> {
  const steps: SmokeStep[] = [];
  const backing = AsyncStorage;
  const accountA = new EncryptedStorageAdapter(backing, secureStoreKeyAdapter);
  const accountB = new EncryptedStorageAdapter(backing, secureStoreKeyAdapter);

  await backing.multiRemove([ACCOUNT_A_KEY, ACCOUNT_B_KEY]);

  const legacy = JSON.stringify({
    schemaVersion: 1,
    profile: { name: LEGACY_MARKER },
    logs: [{ id: LEGACY_MARKER, name: 'Legacy smoke meal' }],
  });
  await backing.setItem(ACCOUNT_A_KEY, legacy);
  const migrated = await accountA.getItem(ACCOUNT_A_KEY);
  const migratedRaw = await backing.getItem(ACCOUNT_A_KEY);

  if (migrated !== legacy || !migratedRaw?.startsWith(ENCRYPTED_PREFIX)) {
    throw new Error('Legacy snapshot did not migrate to an encrypted envelope.');
  }
  if (migratedRaw.includes(LEGACY_MARKER)) {
    throw new Error('Migrated AsyncStorage still contains plaintext legacy data.');
  }
  steps.push({ label: 'Legacy migration passed', passed: true });

  const tampered = tamperEnvelope(migratedRaw);
  await backing.setItem(ACCOUNT_A_KEY, tampered);
  let tamperRejected = false;
  try {
    await accountA.getItem(ACCOUNT_A_KEY);
  } catch (error) {
    tamperRejected = error instanceof EncryptedStorageError;
  }
  const preservedTamperedEnvelope = await accountA.getRawItem(ACCOUNT_A_KEY);
  if (!tamperRejected || preservedTamperedEnvelope !== tampered) {
    throw new Error('Tampering was not rejected while preserving recovery bytes.');
  }
  steps.push({ label: 'Tamper recovery passed', passed: true });

  const sharedExport = await new Promise<{ message: string; title: string }>((resolve, reject) => {
    void handleParseErrorExport({
      exportRawStorageData: () => accountA.getRawItem(ACCOUNT_A_KEY),
      share: async ({ message, title }) => {
        resolve({ message, title });
      },
      alert: (_title, message) => {
        reject(new Error(message));
      },
    }).catch(reject);
  });
  if (
    sharedExport.message !== tampered
    || !sharedExport.message.startsWith(ENCRYPTED_PREFIX)
    || sharedExport.message.includes(LEGACY_MARKER)
    || sharedExport.title !== `${BRAND.name} encrypted recovery data`
  ) {
    throw new Error('Encrypted recovery export did not preserve the envelope.');
  }
  steps.push({ label: 'Encrypted envelope export passed', passed: true });

  await accountA.setItem(ACCOUNT_A_KEY, JSON.stringify({ owner: ACCOUNT_A_MARKER }));
  await accountB.setItem(ACCOUNT_B_KEY, JSON.stringify({ owner: ACCOUNT_B_MARKER }));
  const accountAState = await accountA.getItem(ACCOUNT_A_KEY);
  const accountBState = await accountB.getItem(ACCOUNT_B_KEY);
  if (
    accountAState !== JSON.stringify({ owner: ACCOUNT_A_MARKER })
    || accountBState !== JSON.stringify({ owner: ACCOUNT_B_MARKER })
    || accountAState.includes(ACCOUNT_B_MARKER)
    || accountBState.includes(ACCOUNT_A_MARKER)
  ) {
    throw new Error('Account-scoped encrypted state crossed account boundaries.');
  }
  steps.push({ label: 'Account switching passed', passed: true });

  await new PersistenceManager(accountA, ACCOUNT_A_KEY).clear();
  const clearedAccountA = await accountA.getItem(ACCOUNT_A_KEY);
  const retainedAccountB = await accountB.getItem(ACCOUNT_B_KEY);
  if (clearedAccountA !== null || retainedAccountB !== JSON.stringify({ owner: ACCOUNT_B_MARKER })) {
    throw new Error('Clear-all removed the wrong account or retained cleared data.');
  }
  steps.push({ label: 'Clear-all isolation passed', passed: true });

  return { steps, error: null };
}

export default function EncryptedRecoveryPreviewScreen() {
  const insets = useSafeAreaInsets();
  const startedRef = useRef(false);
  const [result, setResult] = useState<SmokeResult>({ steps: [], error: null });

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    runEncryptedRecoverySmoke()
      .then(setResult)
      .catch((error: unknown) => {
        setResult({
          steps: [],
          error: error instanceof Error ? error.message : 'Unknown encrypted recovery failure.',
        });
      });
  }, []);

  const passed = !result.error && result.steps.length === 5;

  return (
    <ScrollView
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 },
      ]}
      testID="encrypted-recovery-preview"
    >
      <Text style={styles.eyebrow}>NATIVE QA SMOKE GATE</Text>
      <Text style={styles.title}>Encrypted recovery</Text>
      <Text style={styles.description}>
        This flow uses the native SecureStore bridge and the production encrypted storage path.
      </Text>

      <View style={styles.results}>
        {result.steps.map((step) => (
          <Text key={step.label} style={styles.passed} accessibilityLabel={step.label}>
            {step.label}
          </Text>
        ))}
        {result.error ? (
          <Text style={styles.failed} accessibilityLabel={`Encrypted recovery failed: ${result.error}`}>
            Encrypted recovery failed: {result.error}
          </Text>
        ) : null}
        {!result.error && result.steps.length < 5 ? (
          <Text style={styles.running}>Running native encrypted recovery checks…</Text>
        ) : null}
      </View>

      {passed ? (
        <Text style={styles.complete} accessibilityLabel="Native encrypted recovery smoke passed">
          NATIVE ENCRYPTED RECOVERY SMOKE PASSED
        </Text>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    backgroundColor: '#f7f8f4',
    flexGrow: 1,
    paddingHorizontal: 20,
  },
  eyebrow: {
    color: '#4caf7d',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  title: {
    color: '#17231f',
    fontSize: 28,
    fontWeight: '700',
    marginTop: 7,
  },
  description: {
    color: '#617068',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 10,
  },
  results: {
    gap: 12,
    marginTop: 28,
  },
  passed: {
    color: '#216d47',
    fontSize: 16,
    fontWeight: '600',
  },
  running: {
    color: '#617068',
    fontSize: 16,
  },
  failed: {
    color: '#a12525',
    fontSize: 16,
    fontWeight: '600',
  },
  complete: {
    backgroundColor: '#dff3e8',
    borderRadius: 12,
    color: '#216d47',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 28,
    padding: 16,
  },
});