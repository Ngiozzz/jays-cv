import { describe, expect, it } from "vitest";
import { KENYA_COUNTIES, cleanCounties, inCounty, locationText, matchPlace } from "./counties";

describe("KENYA_COUNTIES", () => {
  it("has all 47 counties, once each", () => {
    expect(KENYA_COUNTIES).toHaveLength(47);
    expect(new Set(KENYA_COUNTIES).size).toBe(47);
  });
});

describe("matchPlace", () => {
  it("matches county names however they're written", () => {
    expect(matchPlace("machakos")).toBe("Machakos");
    expect(matchPlace("Machakos County")).toBe("Machakos");
    expect(matchPlace("Nairobi City County")).toBe("Nairobi");
    expect(matchPlace("Muranga")).toBe("Murang'a");
    expect(matchPlace("Taita Taveta")).toBe("Taita-Taveta");
    expect(matchPlace("Homabay")).toBe("Homa Bay");
  });

  it("knows the stand-alone choices and their usual wording", () => {
    expect(matchPlace("Nationwide")).toBe("All counties");
    expect(matchPlace("abroad")).toBe("Outside Kenya");
    expect(matchPlace("N/A")).toBe("Not specified");
    expect(matchPlace("Kenya")).toBe("Not specified");
  });

  it("refuses towns and made-up places", () => {
    expect(matchPlace("Tala")).toBeNull();
    expect(matchPlace("Westlands")).toBeNull();
    expect(matchPlace("")).toBeNull();
  });
});

describe("cleanCounties", () => {
  it("keeps official names once, and never mixes counties with a stand-alone choice", () => {
    expect(cleanCounties(["nairobi", "Nairobi County", "Kisumu"])).toEqual(["Nairobi", "Kisumu"]);
    expect(cleanCounties(["Nairobi", "Not specified"])).toEqual(["Nairobi"]);
    expect(cleanCounties(["Outside Kenya", "All counties"])).toEqual(["Outside Kenya"]);
    expect(cleanCounties(["Tala"])).toEqual([]);
  });
});

describe("locationText", () => {
  const place = (counties: string[], town = "", country = "") => locationText({ counties, town, country });

  it("reads town first, then county", () => {
    expect(place(["Machakos"], "Tala")).toBe("Tala, Machakos County");
    expect(place(["Machakos"])).toBe("Machakos County");
    // A town with the county's own name isn't repeated
    expect(place(["Nakuru"], "Nakuru")).toBe("Nakuru County");
  });

  it("joins several counties", () => {
    expect(place(["Nairobi", "Kisumu"])).toBe("Nairobi & Kisumu Counties");
    expect(place(["Nairobi", "Kisumu", "Nakuru"])).toBe("Nairobi, Kisumu & Nakuru Counties");
    expect(place(["Mombasa", "Kilifi"], "Malindi")).toBe("Mombasa & Kilifi Counties (Malindi)");
    expect(place(["Nairobi", "Kisumu", "Nakuru", "Kiambu", "Meru"])).toBe("Nairobi, Kisumu, Nakuru + 2 more Counties");
  });

  it("covers nationwide, abroad and unknown places", () => {
    expect(place(["All counties"])).toBe("All counties");
    expect(place(["Outside Kenya"], "Dubai", "United Arab Emirates")).toBe("Dubai, United Arab Emirates");
    expect(place(["Not specified"])).toBe("Not specified");
    expect(place([])).toBe("");
  });
});

describe("inCounty", () => {
  it("puts nationwide jobs under every county", () => {
    expect(inCounty(["Machakos"], "Machakos")).toBe(true);
    expect(inCounty(["Machakos"], "Kitui")).toBe(false);
    expect(inCounty(["All counties"], "Kitui")).toBe(true);
    expect(inCounty(["All counties"], "Outside Kenya")).toBe(false);
  });
});
