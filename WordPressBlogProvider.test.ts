import { describe, expect, it } from "bun:test";
import { wordPressSearchQueries } from "./WordPressBlogProvider.ts";

describe("WordPress search queries", () => {
  it("asks for one post beyond the page so hasMore needs no count request", () => {
    const [query, ...rest] = wordPressSearchQueries({ keyword: " news ", status: "published", sort: "title", offset: 25, limit: 25 });
    expect(rest).toHaveLength(0);
    expect(query?.get("per_page")).toBe("26");
    expect(query?.get("offset")).toBe("25");
    expect(query?.get("status")).toBe("publish");
    expect(query?.get("orderby")).toBe("title");
    expect(query?.get("order")).toBe("asc");
    expect(query?.get("search")).toBe("news");
  });

  it("splits pages above the REST API's 100-post cap", () => {
    const queries = wordPressSearchQueries({ sort: "updated", offset: 0, limit: 100 });
    expect(queries.map(q => [q.get("offset"), q.get("per_page")])).toEqual([
      ["0", "100"],
      ["100", "1"],
    ]);
    expect(queries[0]?.get("orderby")).toBe("modified");
    expect(queries[0]?.get("status")).toBe("publish,future,draft,pending,private");
    expect(queries[0]?.has("search")).toBe(false);
  });
});
