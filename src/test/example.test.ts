import { describe, it, expect } from "vitest";

import { getDaysSinceLastContact, getLeadTemperature } from "@/lib/crm";

describe("crm helpers", () => {
  it("classifies hot, warm and cold leads based on last contact date", () => {
    const today = new Date().toISOString();
    const warmDate = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString();
    const coldDate = new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString();

    expect(getLeadTemperature(today).label).toBe("Hot");
    expect(getLeadTemperature(warmDate).label).toBe("Warm");
    expect(getLeadTemperature(coldDate).label).toBe("Cold");
  });

  it("returns null when there is no last contact and a number when it exists", () => {
    expect(getDaysSinceLastContact(null)).toBeNull();

    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
    expect(getDaysSinceLastContact(twoDaysAgo)).toBeGreaterThanOrEqual(2);
  });
});
