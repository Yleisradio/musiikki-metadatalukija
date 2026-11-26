import { act, renderHook, screen } from "@testing-library/react";
import { NotificationProvider } from "../components/Notifications";
import { useSendMetadata } from "./useSendMetadata";

const originalFetch = global.fetch;
const trackMetadata = { tracks: [{ title: "Test" }] };

beforeEach(() => {
    global.fetch = jest.fn();
});

afterEach(() => {
    global.fetch = originalFetch;
});

test("does not send without track metadata", async () => {
    const { result } = renderHook(() => useSendMetadata(null), { wrapper: NotificationProvider });
    await act(async () => { await result.current.handleSendMetadata(); });
    expect(global.fetch).not.toHaveBeenCalled();
    expect(result.current.isSending).toBe(false);
});

test("uses the current edited payload and prevents another send while pending", async () => {
    let finish;
    global.fetch.mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
    const { result, rerender } = renderHook((metadata) => useSendMetadata(metadata), {
        initialProps: trackMetadata,
        wrapper: NotificationProvider
    });
    const edited = { tracks: [{ title: "Edited" }] };
    rerender(edited);

    let pending;
    act(() => { pending = result.current.handleSendMetadata(); });
    expect(result.current.isSending).toBe(true);
    expect(global.fetch).toHaveBeenCalledWith("/api/tracks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(edited)
    });
    await act(async () => { await result.current.handleSendMetadata(); });
    expect(global.fetch).toHaveBeenCalledTimes(1);

    await act(async () => {
        finish({ ok: true, status: 201 });
        await pending;
    });
    expect(result.current.isSending).toBe(false);
    expect(screen.getByRole("status")).toHaveTextContent("Metadata lähetetty onnistuneesti.");
});

test("distinguishes a logged-only response from persistent delivery", async () => {
    global.fetch.mockResolvedValue({ ok: true, status: 202 });
    const { result } = renderHook(() => useSendMetadata(trackMetadata), { wrapper: NotificationProvider });
    await act(async () => { await result.current.handleSendMetadata(); });
    expect(result.current.isSending).toBe(false);
    expect(screen.getByRole("status")).toHaveTextContent(
        "Metadata vastaanotettiin ja kirjattiin backendin lokiin, mutta sitä ei tallenneta pysyvästi."
    );
});

test.each([
    ["HTTP error", () => Promise.resolve({ ok: false, status: 502 }), "Metadatan lähetys epäonnistui (HTTP 502)."],
    ["network error", () => Promise.reject(new Error("Network unavailable")), "Network unavailable"],
    ["non-Error rejection", () => Promise.reject("Failed"), "Metadatan lähetys epäonnistui."]
])("logs and notifies a %s and restores the sending state", async (name, respond, message) => {
    global.fetch.mockImplementationOnce(respond);
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
    try {
        const { result } = renderHook(() => useSendMetadata(trackMetadata), { wrapper: NotificationProvider });
        await act(async () => { await result.current.handleSendMetadata(); });
        expect(result.current.isSending).toBe(false);
        expect(screen.getByRole("alert")).toHaveTextContent(message);
        expect(consoleError).toHaveBeenCalledWith("Error sending metadata:", expect.anything());
    } finally {
        consoleError.mockRestore();
    }
});
