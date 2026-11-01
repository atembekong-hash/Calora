/** @vitest-environment jsdom */
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const harness = vi.hoisted(() => ({
  list: vi.fn(),
  submit: vi.fn(),
}));

vi.mock("@/context/CaloraContext", () => ({
  useCalora: () => ({
    colors: {
      background: "#fff",
      foreground: "#111",
      card: "#fff",
      border: "#ddd",
      primary: "#1769aa",
      primaryForeground: "#fff",
      muted: "#eee",
      mutedForeground: "#666",
      accent: "#e5f1ff",
      input: "#fafafa",
      destructive: "#c33",
    },
  }),
}));
vi.mock("@/components/BottomSheet", () => ({
  BottomSheet: ({
    visible,
    children,
  }: {
    visible: boolean;
    children: React.ReactNode;
  }) => (visible ? <div role="dialog">{children}</div> : null),
}));
vi.mock("@/components/SettingRowPressable", () => ({
  SettingRowPressable: ({
    children,
    onPress,
    testID,
  }: {
    children: React.ReactNode;
    onPress: () => void;
    testID?: string;
  }) => (
    <button data-testid={testID} onClick={onPress}>
      {children}
    </button>
  ),
}));
vi.mock("@workspace/api-client-react", () => ({
  getListPrivacyRightsRequestsQueryKey: () => ["/api/v1/privacy/requests"],
  useListPrivacyRightsRequests: () => harness.list(),
  useCreatePrivacyRightsRequest: () => harness.submit(),
}));

import { PrivacyRightsSection } from "@/components/PrivacyRightsSection";

function renderSection() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <PrivacyRightsSection fontScale={1} />
    </QueryClientProvider>,
  );
}

describe("PrivacyRightsSection", () => {
  beforeEach(() => {
    harness.list.mockReturnValue({
      isLoading: false,
      isError: false,
      data: { requests: [] },
    });
    harness.submit.mockReturnValue({
      isPending: false,
      mutateAsync: vi.fn(async () => ({ request: { id: "r1" } })),
    });
  });

  it("exposes the six supported request types and submits the selected request", async () => {
    const mutateAsync = vi.fn(async () => ({ request: { id: "r1" } }));
    harness.submit.mockReturnValue({ isPending: false, mutateAsync });
    renderSection();

    fireEvent.click(screen.getByTestId("privacy-rights-row"));
    expect(screen.getByText("Access my data")).toBeTruthy();
    expect(screen.getByText("Correct my data")).toBeTruthy();
    expect(screen.getByText("Data portability")).toBeTruthy();
    expect(screen.getByText("Restrict processing")).toBeTruthy();
    expect(screen.getByText("Withdraw consent")).toBeTruthy();
    expect(screen.getByText("Request account data deletion")).toBeTruthy();

    fireEvent.click(screen.getByText("Data portability"));
    fireEvent.click(screen.getByLabelText("Submit privacy request"));
    await waitFor(() =>
      expect(mutateAsync).toHaveBeenCalledWith({
        data: { requestType: "portability" },
      }),
    );
  });
});
