import type {
  BlogPost,
  BlogPostFilterOptions,
  BlogPostListItem,
  BlogPostSearchOptions,
  BlogPostSearchResult,
  BlogPostSort,
  BlogProvider,
  CreatePostData,
  UpdatePostData,
} from "@tokenring-ai/blog/BlogProvider";
import { stripUndefinedKeys } from "@tokenring-ai/utility/object/stripObject";
import WpApiClient from "wordpress-api-client";
import type { WPPost } from "wordpress-api-client/dist/types.ts";
import { z } from "zod";

export const WordPressBlogProviderOptionsSchema = z.object({
  url: z.string(),
  username: z.string(),
  password: z.string(),
  cdn: z.string(),
  description: z.string(),
});

export type WordPressBlogProviderOptions = z.infer<typeof WordPressBlogProviderOptionsSchema>;

const wpToBlogPostStatusMap = {
  publish: "published",
  future: "scheduled",
  draft: "draft",
  pending: "pending",
  private: "private",
} as const;

const blogPostToWpStatusMap = {
  published: "publish",
  scheduled: "future",
  draft: "draft",
  pending: "pending",
  private: "private",
} as const;

type WpFeaturedMedia = { id?: number; source_url?: string };
type WpTerm = { name?: unknown; taxonomy?: unknown };

/** Names of embedded `post_tag` terms. The post's `tags` field is a list of ids. */
function embeddedTagNames(embedded: WPPost["_embedded"] | undefined): string[] {
  const terms = embedded?.["wp:term"];
  if (!Array.isArray(terms)) return [];
  const names: string[] = [];
  const visit = (term: unknown) => {
    if (!term || typeof term !== "object") return;
    const record = term as WpTerm;
    if (record.taxonomy === "post_tag" && typeof record.name === "string" && record.name) names.push(record.name);
  };
  for (const group of terms) {
    if (Array.isArray(group)) {
      for (const term of group) visit(term);
    } else {
      visit(group);
    }
  }
  return names;
}

/** The stored text when `context=edit` sent it (`raw`); otherwise the display rendering. */
function storedText(field: { raw?: string | undefined; rendered?: string | undefined } | undefined): string {
  if (field && typeof field.raw === "string") return field.raw;
  return field?.rendered ?? "";
}

export function WPPostListItemToBlogPostListItem({ id, date_gmt, modified_gmt, title, status, link, _embedded }: Partial<WPPost>): BlogPostListItem {
  if (!id) throw new Error("Cannot convert WPPost to BlogPost: Missing required field: id");
  if (!title) throw new Error("Cannot convert WPPost to BlogPost: Missing required field: title");
  if (!status) throw new Error("Cannot convert WPPost to BlogPost: Missing required field: status");

  const featuredMedia = _embedded?.["wp:featuredmedia"]?.[0] as WpFeaturedMedia | undefined;
  const blogStatus = wpToBlogPostStatusMap[status as keyof typeof wpToBlogPostStatusMap];
  // date_gmt is set for drafts too. Only a published or scheduled post has a publish time.
  const publishedAt = date_gmt ? Date.parse(date_gmt) : Number.NaN;

  const now = Date.now();
  return stripUndefinedKeys({
    id: id.toString(),
    title: storedText(title),
    tags: embeddedTagNames(_embedded),
    url: link || undefined,
    feature_image: featuredMedia?.source_url
      ? stripUndefinedKeys({
          id: featuredMedia.id != null ? featuredMedia.id.toString() : undefined,
          url: featuredMedia.source_url,
        })
      : undefined,
    status: blogStatus satisfies BlogPost["status"],
    created_at: date_gmt ? Date.parse(date_gmt) : now,
    updated_at: modified_gmt ? Date.parse(modified_gmt) : now,
    published_at: (blogStatus === "published" || blogStatus === "scheduled") && Number.isFinite(publishedAt) ? publishedAt : undefined,
  });
}

/** `tagNames` is used when the response has no embedded terms (create/update omit `_embed`). */
export function WPPostToBlogPost(args: Partial<WPPost>, tagNames?: string[]): BlogPost {
  const post: BlogPost = {
    ...WPPostListItemToBlogPostListItem(args),
    html: storedText(args.content),
  };
  if (tagNames && !args._embedded?.["wp:term"]) return { ...post, tags: tagNames };
  return post;
}

function isPublishTime(value: number | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

/**
 * Scalar edits for a post update. An empty `html` clears the content; omitted `html` is left alone.
 * `scheduled` without `published_at` throws — status `future` is never sent on its own.
 */
export function wordPressPostEdits({ title, html, feature_image, status, published_at }: UpdatePostData): Partial<WPPost> {
  const update: Partial<WPPost> = {};
  if (title) update.title = { rendered: title };
  if (html !== undefined) update.content = { rendered: html, protected: false };
  if (feature_image) {
    if (feature_image.id) update.featured_media = parseInt(feature_image.id, 10);
    else throw new Error("Wordpress feature image must be an attachment id - is wordpress not set as the CDN?");
  }
  if (status === "scheduled") {
    if (!isPublishTime(published_at)) throw new Error("Scheduling a post requires a publish date");
    update.status = "future";
    update.date_gmt = new Date(published_at).toISOString();
  } else if (status) {
    update.status = blogPostToWpStatusMap[status];
  }
  return update;
}

/** WordPress `orderby`/`order` for each sort the blog UI offers. */
const WP_ORDER: Record<BlogPostSort, { orderby: string; order: "asc" | "desc" }> = {
  updated: { orderby: "modified", order: "desc" },
  newest: { orderby: "date", order: "desc" },
  oldest: { orderby: "date", order: "asc" },
  title: { orderby: "title", order: "asc" },
};

/** The REST API caps `per_page` at 100. */
const WP_MAX_PER_PAGE = 100;

/**
 * Query strings for one search, split into requests of at most 100 posts. One
 * extra post is requested beyond `limit` so the caller can tell whether more
 * match without a separate count request.
 */
export function wordPressSearchQueries(options: BlogPostSearchOptions): URLSearchParams[] {
  const { keyword, status, sort, offset, limit } = options;
  const queries: URLSearchParams[] = [];
  const wanted = limit + 1;
  for (let fetched = 0; fetched < wanted; fetched += WP_MAX_PER_PAGE) {
    const params = new URLSearchParams();
    params.append("status", status ? blogPostToWpStatusMap[status] : allStatuses);
    params.append("orderby", WP_ORDER[sort].orderby);
    params.append("order", WP_ORDER[sort].order);
    params.append("_fields", listItemFields);
    // `raw` title (and content, on a single post) is only returned in the edit context.
    params.append("context", "edit");
    params.append("offset", String(offset + fetched));
    params.append("per_page", String(Math.min(WP_MAX_PER_PAGE, wanted - fetched)));
    const trimmed = keyword?.trim();
    if (trimmed) params.append("search", trimmed);
    queries.push(params);
  }
  return queries;
}

const listItemFields = "id,title,status,date_gmt,modified_gmt,link,tags,featured_media,_links,_embedded";
const fullItemFields = `${listItemFields},content`;
const allStatuses = "publish,future,draft,pending,private";

export default class WordPressBlogProvider implements BlogProvider {
  description: string;
  cdnName: string;
  private readonly client: WpApiClient;

  constructor(options: WordPressBlogProviderOptions) {
    this.description = options.description;
    this.cdnName = options.cdn;

    this.client = new WpApiClient(options.url, {
      auth: {
        type: "basic",
        username: options.username,
        password: options.password,
      },
    });
  }

  async getAllPosts(): Promise<BlogPostListItem[]> {
    const params = new URLSearchParams();
    params.append("status", allStatuses);
    params.append("order", "desc");
    params.append("context", "edit");
    params.append("_fields", listItemFields);

    const posts = await this.client.post().find(params);
    //console.log(JSON.stringify(posts, null, 2));
    return (posts.filter(post => post) as WPPost[]).map(WPPostListItemToBlogPostListItem);
  }

  async getRecentPosts(filter: BlogPostFilterOptions): Promise<BlogPostListItem[]> {
    const params = new URLSearchParams();
    params.append("status", filter.status ? blogPostToWpStatusMap[filter.status] : allStatuses);
    params.append("order", "desc");
    params.append("context", "edit");
    params.append("_fields", listItemFields);
    if (filter.keyword) params.append("search", filter.keyword);
    if (filter.limit) params.append("per_page", filter.limit.toString());

    const posts = await this.client.post().find(params);
    //console.log(JSON.stringify(posts, null, 2));
    return (posts.filter(post => post) as WPPost[]).map(WPPostListItemToBlogPostListItem);
  }

  async searchPosts(options: BlogPostSearchOptions): Promise<BlogPostSearchResult> {
    const found: WPPost[] = [];
    for (const query of wordPressSearchQueries(options)) {
      const page = (await this.client.post().find(query)).filter(post => post) as WPPost[];
      found.push(...page);
      if (page.length < Number(query.get("per_page"))) break;
    }
    return {
      posts: found.slice(0, options.limit).map(WPPostListItemToBlogPostListItem),
      hasMore: found.length > options.limit,
    };
  }

  /** Moves the post to the WordPress trash, where it can still be restored from wp-admin. */
  async deletePost(id: string): Promise<void> {
    const [result] = await this.client.post().delete(parseInt(id, 10));
    if (!result) throw new Error(`Failed to delete post ${id}`);
  }

  async createPost(data: CreatePostData): Promise<BlogPost> {
    const { title, html, tags = [], feature_image } = data;
    if (feature_image && !feature_image.id) {
      throw new Error("Wordpress feature image must be an attachment id - is wordpress not set as the CDN?");
    }
    const result = await this.client.post().create({
      title: { rendered: title },
      content: { rendered: html, protected: false },
      status: "draft",
      tags: tags.length > 0 ? await this.getOrCreateTagIds(tags) : [],
      ...(feature_image?.id ? { featured_media: parseInt(feature_image.id, 10) } : {}),
    });

    if (!result) throw new Error("Failed to create post");
    return WPPostToBlogPost(result, tags);
  }

  async updatePost(id: string, data: UpdatePostData): Promise<BlogPost> {
    const updateData: Partial<WPPost> = { id: parseInt(id, 10), ...wordPressPostEdits(data) };
    if (data.tags) updateData.tags = await this.getOrCreateTagIds(data.tags);

    const result = await this.client.post().update(updateData, parseInt(id, 10));
    if (!result) throw new Error("Failed to update post");
    return WPPostToBlogPost(result, data.tags);
  }

  async getPostById(id: string): Promise<BlogPost> {
    const params = new URLSearchParams();
    params.append("context", "edit");
    params.append("_fields", fullItemFields);

    const post = await this.client.post().find(params, parseInt(id, 10));
    //console.log(JSON.stringify(post, null, 2));

    if (!post[0]) throw new Error(`Post with ID ${id} not found`);
    return WPPostToBlogPost(post[0]);
  }

  private async getOrCreateTagIds(tagNames: string[]): Promise<number[]> {
    const tagIds: number[] = [];
    for (const tagName of tagNames) {
      const existingTags = await this.client.postTag().find(new URLSearchParams({ search: tagName }));
      const existingTag = existingTags.find(tag => tag?.name.toLowerCase() === tagName.toLowerCase());
      if (existingTag) {
        tagIds.push(existingTag.id);
      } else {
        const newTag = await this.client.postTag().create({ name: tagName });
        if (newTag) tagIds.push(newTag.id);
      }
    }
    return tagIds;
  }
}
