import { describe, expect, it } from "vitest";
import { isStaleAssetLoadError } from "../staleAssetRecovery";

describe("stale PWA asset recovery", () => {
  it("recognizes stale dynamic-import and chunk failures", () => {
    expect(isStaleAssetLoadError(new TypeError("Failed to fetch dynamically imported module: /assets/notifications-old.js"))).toBe(true);
    expect(isStaleAssetLoadError(new Error("Importing a module script failed."))).toBe(true);
    expect(isStaleAssetLoadError(new Error("ChunkLoadError: Loading chunk 42 failed"))).toBe(true);
    expect(isStaleAssetLoadError(new TypeError("'text/html' is not a valid JavaScript MIME type for module script 'https://bixbo.z8drwn9rpn.workers.dev/assets/routes-old.js'."))).toBe(true);
  });

  it("does not reload for ordinary application errors", () => {
    expect(isStaleAssetLoadError(new Error("Cannot read properties of undefined"))).toBe(false);
    expect(isStaleAssetLoadError(new Error("Network request failed"))).toBe(false);
  });
});
