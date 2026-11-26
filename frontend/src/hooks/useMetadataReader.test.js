import { act, renderHook, screen } from "@testing-library/react";
import { NotificationProvider } from "../components/Notifications";
import { readAudioMetadata } from "../services/readAudioMetadata";
import { useMetadataReader } from "./useMetadataReader";

jest.mock("../services/readAudioMetadata", () => ({ readAudioMetadata: jest.fn() }));

beforeEach(() => {
    readAudioMetadata.mockReset();
});

test("keeps the initial state when no file is selected", async () => {
    const { result } = renderHook(useMetadataReader, { wrapper: NotificationProvider });
    await act(async () => { await result.current.handleFileUpload(null); });
    expect(result.current.fileName).toBe("");
    expect(result.current.metadata).toBeNull();
    expect(readAudioMetadata).not.toHaveBeenCalled();
});

test("clears the previous result before reading and keeps edits separate from the original", async () => {
    const first = {
        status: "success",
        originalMetadata: { common: { title: "Original" } },
        trackMetadata: { tracks: [{ title: "Original" }] },
        cleanData: { title: "Original" },
        albumArt: "data:image/png;base64,QQ=="
    };
    readAudioMetadata.mockResolvedValueOnce(first);
    const { result } = renderHook(useMetadataReader, { wrapper: NotificationProvider });
    const file = new File([], "first.m4a");
    await act(async () => { await result.current.handleFileUpload(file); });
    expect(result.current.fileName).toBe("first.m4a");
    expect(result.current.metadata).toBe(first);
    expect(readAudioMetadata).toHaveBeenCalledWith(file);

    act(() => {
        result.current.setTrackMetadata({ tracks: [{ title: "Edited" }] });
    });
    act(() => {
        result.current.setTrackMetadata((current) => ({
            tracks: [{ ...current.tracks[0], isrc: "US1234567890" }]
        }));
    });
    expect(result.current.metadata.trackMetadata.tracks[0])
        .toEqual({ title: "Edited", isrc: "US1234567890" });
    expect(result.current.metadata.originalMetadata).toBe(first.originalMetadata);
    expect(result.current.metadata.originalMetadata.common.title).toBe("Original");
    expect(result.current.metadata.cleanData).toBe(first.cleanData);

    let finish;
    readAudioMetadata.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
    let pending;
    act(() => { pending = result.current.handleFileUpload(new File([], "next.m4a")); });
    expect(result.current.fileName).toBe("next.m4a");
    expect(result.current.metadata).toBeNull();
    await act(async () => {
        finish({ status: "unrecognized" });
        await pending;
    });
    expect(result.current.metadata).toBeNull();
    expect(screen.getByRole("alert")).toHaveTextContent(
        "Tiedostosta ei löytynyt iTunes-lataukseen viittaavia metatietoja."
    );
});

test("logs read failures and notifies without restoring an old result", async () => {
    const error = new Error("Broken audio");
    readAudioMetadata.mockRejectedValue(error);
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
    try {
        const { result } = renderHook(useMetadataReader, { wrapper: NotificationProvider });
        await act(async () => {
            await result.current.handleFileUpload(new File([], "broken.mp3"));
        });
        expect(result.current.fileName).toBe("broken.mp3");
        expect(result.current.metadata).toBeNull();
        expect(consoleError).toHaveBeenCalledWith("Error reading metadata:", error);
        expect(screen.getByRole("alert")).toHaveTextContent(
            "Tiedoston metatietoja ei voitu lukea. Tarkista tiedosto ja yritä uudelleen."
        );
    } finally {
        consoleError.mockRestore();
    }
});
