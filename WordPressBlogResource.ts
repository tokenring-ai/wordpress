import {BlogResource} from "@token-ring/blog";
import {BlogPost, BlogResourceOptions} from "@token-ring/blog/BlogResource";
import ChatService from "@token-ring/chat/ChatService";
import {Registry, Service} from "@token-ring/registry";
import {marked} from "marked";
import WpApiClient from "wordpress-api-client";

export type WPPost = WpApiClient.WPPost;
export interface WordPressResourceOptions extends BlogResourceOptions {
  url: string;
  username: string;
  password: string;
}

interface CreatePostData {
  title: string;
  content: string;
  tags?: string[];
  published?: boolean;
}

interface UpdatePostData {
  title?: string;
  content?: string;
  tags?: string[];
}


function WPPostToBlogPost({id, date_gmt, modified_gmt, title, content, status}: Partial<WPPost>): BlogPost {
  if (! id) {
    throw new Error("Cannot convert WPPost to BlogPost: Missing required field: id");
  }
  if (! title) {
    throw new Error("Cannot convert WPPost to BlogPost: Missing required field: title");
  }
  if (! content) {
    throw new Error("Cannot convert WPPost to BlogPost: Missing required field: content");
  }
  if (! status) {
    throw new Error("Cannot convert WPPost to BlogPost: Missing required field: status");
  }

  const now = new Date();
  return {
    id: id?.toString(),
    title: title?.rendered,
    content: content?.rendered,
    status: status as 'draft' | 'published' | 'scheduled',
    created_at: modified_gmt ? new Date(modified_gmt) : now,
    updated_at: modified_gmt ? new Date(modified_gmt) : now,
    published_at: date_gmt ? new Date(date_gmt) : now,
  };
}

function BlogPostToWPPost({id, title, content, status, created_at, updated_at}: BlogPost): Partial<WPPost> {
  return {
    id: parseInt(id, 10),
    title: {rendered: title},
    content: {rendered: content ?? '', protected: false},
    status,
    modified_gmt: updated_at.toISOString(),
    modified: updated_at.toLocaleDateString(),
    date_gmt: created_at.toISOString(),
    date: created_at.toLocaleDateString(),
  };
}


export default class WordPressBlogResource extends BlogResource {
  static sampleArguments = {
    url: "https://your-wordpress-site.com",
    username: "YOUR_USERNAME",
    password: "YOUR_APPLICATION_PASSWORD",
  };

  name: string = "WordPressService";
  description: string = "Service for interacting with WordPress via REST API";

  private currentPost: WPPost | null;
  private readonly client: WpApiClient.default;
  private registry!: Registry;
  private readonly url: string;

  constructor({url, username, password, imageGenerationModel, cdn}: WordPressResourceOptions) {
    super({imageGenerationModel, cdn});

    if (!url) {
      throw new Error("Error in WordPress config: No url provided");
    }

    if (!username || !password) {
      throw new Error("Error in WordPress configuration: username and password required");
    }

    this.url = url;
    this.currentPost = null;
    this.client = new WpApiClient.default(url, {
      auth: {
        type: 'basic',
        username,
        password,
      },
    });
  }



  async start(registry: Registry): Promise<void> {
    const chatContext = registry.requireFirstServiceByType(ChatService);
    this.registry = registry;
    chatContext.on("reset", this.resetCurrentPost.bind(this));
  }

  async stop(registry: Registry): Promise<void> {
    const chatContext = registry.requireFirstServiceByType(ChatService);
    chatContext.off("reset", this.resetCurrentPost.bind(this));
  }

  resetCurrentPost(type: string): void {
    if (type === 'state') {
      const chatService = this.registry?.requireFirstServiceByType(ChatService);
      if (chatService) {
        chatService?.systemLine("[WordPress] Resetting current post");
      }
      this.currentPost = null;
    }
  }

  getCurrentPost(): BlogPost | null {
    if (!this.currentPost) return null;

    return WPPostToBlogPost(this.currentPost);
  }

  async getAllPosts(): Promise<BlogPost[]> {
    const results =  await this.client.post().find(new URLSearchParams({
      per_page: "100",
    }));

    return results.filter(post => post != null).map(WPPostToBlogPost);
  }

  async createPost({title, content, tags = [], published = false}: CreatePostData): Promise<BlogPost> {
    if (this.currentPost) {
      throw new Error("A post is currently selected. Clear the selection before creating a new post.");
    }

    const html = await marked(content);
    const result = await this.client.post().create({
      title: {rendered: title},
      content: {rendered: html, protected: false},
      status: published ? 'publish' : 'draft',
      tags: tags.length > 0 ? await this.getOrCreateTagIds(tags) : [],
    });

    if (result) {
      return WPPostToBlogPost(result);
    } else {
      throw new Error("Failed to create post");
    }
  }

  async updatePost({title, content, tags}: UpdatePostData): Promise<BlogPost> {
    if (!this.currentPost) {
      throw new Error("No post is currently selected. Select a post before updating.");
    }

    const updateData: WPPost = {
      ...this.currentPost,
    };

    if (title) updateData.title = { rendered: title };
    if (content) updateData.content = { rendered: await marked(content), protected: false };
    if (tags) updateData.tags = await this.getOrCreateTagIds(tags);

    const result = await this.client.post().update(updateData, this.currentPost.id);
    if (result) {
      this.currentPost = result;
      return WPPostToBlogPost(result);
    } else {
      throw new Error("Failed to update post");
    }
  }

  async selectPostById(id: string): Promise<BlogPost> {
    const post = await this.client.post().find(parseInt(id, 10));
    if (post?.[0] == null) {
      throw new Error(`Post with ID ${id} not found`);
    }

    this.currentPost = post[0];
    return WPPostToBlogPost(this.currentPost);
  }

  async clearCurrentPost(): Promise<void> {
    this.currentPost = null;
  }

  private async getOrCreateTagIds(tagNames: string[]): Promise<number[]> {
    const tagIds: number[] = [];
    
    for (const tagName of tagNames) {
      try {
        // Try to find existing tag
        const existingTags = await this.client.postTag().find(new URLSearchParams({ search: tagName }));
        const existingTag = existingTags.find(tag => tag?.name?.toLowerCase() === tagName.toLowerCase());
        
        if (existingTag) {
          tagIds.push(existingTag.id);
        } else {
          // Create new tag
          const newTag = await this.client.postTag().create({ name: tagName });
          if (newTag) tagIds.push(newTag.id);
        }
      } catch (error) {
        console.warn(`Failed to handle tag "${tagName}":`, error);
      }
    }
    
    return tagIds;
  }
}