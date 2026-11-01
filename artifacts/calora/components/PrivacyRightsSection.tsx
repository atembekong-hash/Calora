import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import {
  getListPrivacyRightsRequestsQueryKey,
  useCreatePrivacyRightsRequest,
  useListPrivacyRightsRequests,
  type PrivacyRightsRequest,
} from "@workspace/api-client-react";
import { useCalora } from "@/context/CaloraContext";
import { BottomSheet } from "@/components/BottomSheet";
import { SettingRowPressable } from "@/components/SettingRowPressable";

const REQUEST_TYPES = [
  {
    value: "access",
    title: "Access my data",
    body: "Request a copy of the personal data Calora holds.",
  },
  {
    value: "correct",
    title: "Correct my data",
    body: "Ask Calora to review and correct inaccurate data.",
  },
  {
    value: "portability",
    title: "Data portability",
    body: "Request your data in a portable format.",
  },
  {
    value: "restrict",
    title: "Restrict processing",
    body: "Ask Calora to limit how your data is processed.",
  },
  {
    value: "withdraw_consent",
    title: "Withdraw consent",
    body: "Request withdrawal of applicable consent.",
  },
  {
    value: "delete",
    title: "Request account data deletion",
    body: "Start a privacy-rights deletion request. This is separate from immediate account deletion.",
  },
] as const;

type RequestType = (typeof REQUEST_TYPES)[number]["value"];

type Props = {
  fontScale: number;
};

function formatStatus(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function RequestHistory({ requests }: { requests: PrivacyRightsRequest[] }) {
  const { colors } = useCalora();
  if (requests.length === 0) {
    return (
      <Text style={[styles.empty, { color: colors.mutedForeground }]}>
        No privacy requests submitted.
      </Text>
    );
  }
  return (
    <View style={styles.history}>
      {requests.map((request) => (
        <View
          key={request.id}
          style={[styles.historyRow, { borderColor: colors.border }]}
        >
          <View style={styles.historyCopy}>
            <Text style={[styles.historyTitle, { color: colors.foreground }]}>
              {formatStatus(request.requestType)}
            </Text>
            <Text
              style={[styles.historyDate, { color: colors.mutedForeground }]}
            >
              {new Date(request.createdAt).toLocaleDateString()}
            </Text>
          </View>
          <Text style={[styles.status, { color: colors.primary }]}>
            {formatStatus(request.status)}
          </Text>
        </View>
      ))}
    </View>
  );
}

export function PrivacyRightsSection({ fontScale }: Props) {
  const { colors } = useCalora();
  const queryClient = useQueryClient();
  const [visible, setVisible] = useState(false);
  const [selectedType, setSelectedType] = useState<RequestType>("access");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const requestsQuery = useListPrivacyRightsRequests({
    query: {
      queryKey: getListPrivacyRightsRequestsQueryKey(),
      enabled: visible,
    },
  });
  const createRequest = useCreatePrivacyRightsRequest();
  const selected = useMemo(
    () => REQUEST_TYPES.find((item) => item.value === selectedType)!,
    [selectedType],
  );

  const close = () => {
    if (!createRequest.isPending) {
      setVisible(false);
      setError(null);
    }
  };

  const submit = async () => {
    setError(null);
    try {
      await createRequest.mutateAsync({
        data: {
          requestType: selectedType,
          ...(note.trim() ? { note: note.trim() } : {}),
        },
      });
      setNote("");
      await queryClient.invalidateQueries({
        queryKey: ["/api/v1/privacy/requests"],
      });
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "Privacy request could not be submitted.",
      );
    }
  };

  return (
    <>
      <SettingRowPressable
        testID="privacy-rights-row"
        onPress={() => setVisible(true)}
        disabled={false}
        style={[
          styles.row,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <View style={[styles.icon, { backgroundColor: colors.muted }]}>
          <Text style={[styles.iconText, { color: colors.primary }]}>P</Text>
        </View>
        <View style={styles.copy}>
          <Text
            style={[
              styles.title,
              { color: colors.foreground, fontSize: 15 * fontScale },
            ]}
          >
            Privacy rights requests
          </Text>
          <Text
            style={[
              styles.body,
              { color: colors.mutedForeground, fontSize: 13 * fontScale },
            ]}
          >
            Access, correct, export, restrict, or delete your personal data
          </Text>
        </View>
        <Text style={[styles.chevron, { color: colors.mutedForeground }]}>
          ›
        </Text>
      </SettingRowPressable>

      <BottomSheet visible={visible} onRequestClose={close} maxHeight="92%">
        <ScrollView
          contentContainerStyle={styles.sheetContent}
          keyboardShouldPersistTaps="handled"
        >
          <Text
            style={[
              styles.sheetTitle,
              { color: colors.foreground, fontSize: 21 * fontScale },
            ]}
          >
            Privacy rights
          </Text>
          <Text
            style={[
              styles.sheetIntro,
              { color: colors.mutedForeground, fontSize: 13 * fontScale },
            ]}
          >
            Submit a request about your personal data. Calora will review it;
            this does not immediately delete your account.
          </Text>
          <Text
            style={[
              styles.subheading,
              { color: colors.foreground, fontSize: 14 * fontScale },
            ]}
          >
            Your requests
          </Text>
          {requestsQuery.isLoading ? (
            <ActivityIndicator color={colors.primary} />
          ) : requestsQuery.isError ? (
            <Text style={[styles.error, { color: colors.destructive }]}>
              Requests could not be loaded. You can still submit a new request.
            </Text>
          ) : (
            <RequestHistory requests={requestsQuery.data?.requests ?? []} />
          )}
          <Text
            style={[
              styles.subheading,
              { color: colors.foreground, fontSize: 14 * fontScale },
            ]}
          >
            New request
          </Text>
          {REQUEST_TYPES.map((item) => (
            <Pressable
              key={item.value}
              accessibilityRole="radio"
              accessibilityState={{ selected: selectedType === item.value }}
              onPress={() => setSelectedType(item.value)}
              style={[
                styles.option,
                {
                  borderColor:
                    selectedType === item.value
                      ? colors.primary
                      : colors.border,
                  backgroundColor:
                    selectedType === item.value ? colors.accent : colors.card,
                },
              ]}
            >
              <View
                style={[
                  styles.radio,
                  {
                    borderColor:
                      selectedType === item.value
                        ? colors.primary
                        : colors.mutedForeground,
                  },
                ]}
              >
                {selectedType === item.value ? (
                  <View
                    style={[
                      styles.radioDot,
                      { backgroundColor: colors.primary },
                    ]}
                  />
                ) : null}
              </View>
              <View style={styles.optionCopy}>
                <Text
                  style={[
                    styles.optionTitle,
                    { color: colors.foreground, fontSize: 14 * fontScale },
                  ]}
                >
                  {item.title}
                </Text>
                <Text
                  style={[
                    styles.optionBody,
                    { color: colors.mutedForeground, fontSize: 12 * fontScale },
                  ]}
                >
                  {item.body}
                </Text>
              </View>
            </Pressable>
          ))}
          <Text
            style={[
              styles.selectedDescription,
              { color: colors.mutedForeground, fontSize: 12 * fontScale },
            ]}
          >
            {selected.body}
          </Text>
          <TextInput
            accessibilityLabel="Optional privacy request note"
            placeholder="Optional note"
            placeholderTextColor={colors.mutedForeground}
            value={note}
            onChangeText={setNote}
            multiline
            maxLength={1000}
            style={[
              styles.input,
              {
                color: colors.foreground,
                borderColor: colors.border,
                backgroundColor: colors.input,
              },
            ]}
          />
          {error ? (
            <Text style={[styles.error, { color: colors.destructive }]}>
              {error}
            </Text>
          ) : null}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Submit privacy request"
            disabled={createRequest.isPending}
            onPress={() => void submit()}
            style={[
              styles.submit,
              {
                backgroundColor: colors.primary,
                opacity: createRequest.isPending ? 0.6 : 1,
              },
            ]}
          >
            {createRequest.isPending ? (
              <ActivityIndicator color={colors.primaryForeground} />
            ) : (
              <Text
                style={[
                  styles.submitText,
                  { color: colors.primaryForeground, fontSize: 14 * fontScale },
                ]}
              >
                Submit request
              </Text>
            )}
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close privacy rights"
            onPress={close}
            style={styles.cancel}
          >
            <Text
              style={[
                styles.cancelText,
                { color: colors.primary, fontSize: 14 * fontScale },
              ]}
            >
              Close
            </Text>
          </Pressable>
        </ScrollView>
      </BottomSheet>
    </>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    gap: 12,
  },
  icon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  iconText: { fontSize: 16, fontWeight: "800" },
  copy: { flex: 1 },
  title: { fontWeight: "700" },
  body: { lineHeight: 18, marginTop: 3 },
  chevron: { fontSize: 24, lineHeight: 24 },
  sheetContent: { paddingHorizontal: 20, paddingBottom: 16 },
  sheetTitle: { fontWeight: "800", marginBottom: 6 },
  sheetIntro: { lineHeight: 19, marginBottom: 16 },
  subheading: { fontWeight: "800", marginTop: 10, marginBottom: 9 },
  history: { gap: 8 },
  historyRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    padding: 10,
  },
  historyCopy: { flex: 1 },
  historyTitle: { fontWeight: "700", fontSize: 13 },
  historyDate: { fontSize: 12, marginTop: 2 },
  status: { fontSize: 12, fontWeight: "700" },
  empty: { fontSize: 13, marginBottom: 4 },
  option: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    padding: 11,
    marginBottom: 8,
    gap: 10,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  radioDot: { width: 10, height: 10, borderRadius: 5 },
  optionCopy: { flex: 1 },
  optionTitle: { fontWeight: "700" },
  optionBody: { lineHeight: 17, marginTop: 2 },
  selectedDescription: { lineHeight: 17, marginBottom: 8 },
  input: {
    minHeight: 74,
    borderWidth: 1,
    borderRadius: 12,
    padding: 11,
    textAlignVertical: "top",
    marginBottom: 8,
  },
  error: { lineHeight: 18, marginBottom: 8 },
  submit: {
    minHeight: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  submitText: { fontWeight: "800" },
  cancel: { alignItems: "center", padding: 14 },
  cancelText: { fontWeight: "700" },
});
