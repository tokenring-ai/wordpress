import { BlogPostListItemSchema, BlogPostSchema } from "@tokenring-ai/blog/BlogProvider";
import { describe, expect, it } from "bun:test";
import type { WPPost } from "wordpress-api-client/dist/types.ts";
import WordPressBlogProvider, { WPPostListItemToBlogPostListItem, WPPostToBlogPost, wordPressPostEdits, wordPressSearchQueries } from "./WordPressBlogProvider.ts";

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
    expect(query?.get("_fields")).toContain("tags");
    expect(query?.get("_fields")).toContain("link");
    expect(query?.get("context")).toBe("edit");
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

const embedded = {
  author: [],
  "wp:featuredmedia": [
    {
      id: 9,
      link: "https://example.com/?attachment_id=9",
      source_url: "https://example.com/wp-content/uploads/pic.jpg",
    },
  ],
  "wp:term": [
    [{ id: 1, name: "Uncategorized", taxonomy: "category" }],
    [
      { id: 4, name: "News", taxonomy: "post_tag" },
      { id: 5, name: "Launch", taxonomy: "post_tag" },
    ],
  ],
};

function wpPost(overrides: Record<string, unknown> = {}): Partial<WPPost> {
  return {
    id: 12,
    title: { rendered: "Hello" },
    status: "draft",
    date_gmt: "2024-05-01T12:00:00",
    modified_gmt: "2024-05-02T12:00:00",
    link: "https://example.com/hello/",
    tags: [4, 5],
    content: { rendered: "<p>Hello</p>", protected: false },
    _embedded: embedded,
    ...overrides,
  } as Partial<WPPost>;
}

describe("WordPress post mapping", () => {
  it("returns tag names, the public url, and the image file rather than the attachment page", () => {
    const item = WPPostListItemToBlogPostListItem(wpPost());
    expect(item.tags).toEqual(["News", "Launch"]);
    expect(item.url).toBe("https://example.com/hello/");
    expect(item.feature_image).toEqual({ id: "9", url: "https://example.com/wp-content/uploads/pic.jpg" });
    expect(item.feature_image?.url).not.toContain("attachment_id");
    expect(BlogPostListItemSchema.parse(item).tags).toEqual(["News", "Launch"]);
  });

  it("does not use the attachment page when the media file url is missing", () => {
    const item = WPPostListItemToBlogPostListItem(
      wpPost({
        _embedded: { author: [], "wp:featuredmedia": [{ id: 9, link: "https://example.com/?attachment_id=9" }] },
      }),
    );
    expect(item.feature_image).toBeUndefined();
  });

  it("sets published_at only for published and scheduled posts", () => {
    const when = Date.parse("2024-05-01T12:00:00");
    expect(WPPostListItemToBlogPostListItem(wpPost({ status: "draft" })).published_at).toBeUndefined();
    expect(WPPostListItemToBlogPostListItem(wpPost({ status: "pending" })).published_at).toBeUndefined();
    expect(WPPostListItemToBlogPostListItem(wpPost({ status: "private" })).published_at).toBeUndefined();
    expect(WPPostListItemToBlogPostListItem(wpPost({ status: "publish" })).published_at).toBe(when);
    expect(WPPostListItemToBlogPostListItem(wpPost({ status: "future" }))).toMatchObject({ status: "scheduled", published_at: when });
  });

  it("uses the stored title and content rather than the display rendering", () => {
    const post = WPPostToBlogPost(
      wpPost({
        title: { raw: "A & B", rendered: "A &amp; B" },
        content: {
          raw: "<!-- wp:paragraph --><p>Hi</p><!-- /wp:paragraph -->",
          rendered: "<p>Hi</p>",
          protected: false,
        },
      }),
    );
    expect(post.title).toBe("A & B");
    expect(post.html).toContain("wp:paragraph");
    expect(BlogPostSchema.parse(post).title).toBe("A & B");
  });

  it("falls back to the display rendering when the stored text was not returned", () => {
    expect(WPPostToBlogPost(wpPost()).html).toBe("<p>Hello</p>");
  });

  it("keeps the tag names just written when the response has ids and no embed", () => {
    const post = WPPostToBlogPost(wpPost({ _embedded: undefined, tags: [4, 5] }), ["News", "Launch"]);
    expect(BlogPostSchema.parse(post).tags).toEqual(["News", "Launch"]);
  });
});

describe("WordPress post updates", () => {
  const provider = new WordPressBlogProvider({
    url: "https://example.com",
    username: "editor",
    password: "secret",
    cdn: "wordpress",
    description: "WordPress",
  });

  it("clears content when html is an empty string and leaves it when html is omitted", () => {
    expect(wordPressPostEdits({ html: "" }).content).toEqual({ rendered: "", protected: false });
    expect(wordPressPostEdits({ title: "Hello" })).not.toHaveProperty("content");
  });

  it("rejects a schedule with no publish date and never sends future alone", async () => {
    expect(() => wordPressPostEdits({ status: "scheduled" })).toThrow(/publish date/);
    expect(() => wordPressPostEdits({ status: "scheduled", html: "" })).toThrow(/publish date/);
    await expect(provider.updatePost("15", { status: "scheduled" })).rejects.toThrow(/publish date/);
  });

  it("sends status future together with the publish date", () => {
    const publishedAt = Date.parse("2026-12-01T09:30:00.000Z");
    expect(wordPressPostEdits({ status: "scheduled", published_at: publishedAt })).toEqual({
      status: "future",
      date_gmt: "2026-12-01T09:30:00.000Z",
    });
  });
});
