import { describe, it, expect } from "vitest";
import { optimisticWrite } from "../src/lib/firebase/services";

describe("optimisticWrite", () => {
  it("resolves quickly when the underlying write completes fast", async () => {
    const fastPromise = new Promise<void>((resolve) => setTimeout(resolve, 10));
    const start = Date.now();
    await optimisticWrite(fastPromise, 200);
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(100);
  });

  it("unblocks UI immediately when backend cloud network is slow, without hanging", async () => {
    // Simulating a hanging cloud roundtrip of 5000ms
    const slowCloudPromise = new Promise<void>((resolve) => setTimeout(resolve, 5000));
    const start = Date.now();
    await optimisticWrite(slowCloudPromise, 50); // 50ms optimistic window
    const duration = Date.now() - start;
    // Should resolve around 50ms instead of 5000ms
    expect(duration).toBeLessThan(200);
  });

  it("propagates immediate rejection if write fails before timeout", async () => {
    const errorPromise = Promise.reject(new Error("Permission denied or validation failed"));
    await expect(optimisticWrite(errorPromise, 200)).rejects.toThrow("Permission denied");
  });
});
