import { beforeEach, describe, expect, it, vi } from "vitest";

import { PreferenceRepository } from "../../../../src/modules/preferences/preference.repository.js";

describe("PreferenceRepository", () => {
  const limit = vi.fn();
  const where = vi.fn(() => ({ limit }));
  const from = vi.fn(() => ({ where }));
  const select = vi.fn(() => ({ from }));

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("defaults to enabled when no preference exists", async () => {
    limit.mockResolvedValueOnce([]);

    const repository = new PreferenceRepository({
      select,
    } as never);

    await expect(
      repository.isChannelEnabled(
        "550e8400-e29b-41d4-a716-446655440000",
        "email",
      ),
    ).resolves.toBe(true);
  });

  it("returns the stored channel preference", async () => {
    limit.mockResolvedValueOnce([{ enabled: false }]);

    const repository = new PreferenceRepository({
      select,
    } as never);

    await expect(
      repository.isChannelEnabled(
        "550e8400-e29b-41d4-a716-446655440000",
        "sms",
      ),
    ).resolves.toBe(false);
  });
});
