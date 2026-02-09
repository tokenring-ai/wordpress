import Agent from "@tokenring-ai/agent/Agent";
import {BlogPost, BlogProvider, CreatePostData, UpdatePostData} from "@tokenring-ai/blog/BlogProvider";
import {marked} from "marked";
import type {WPPost} from "wordpress-api-client/dist/types.js";
import {WpApiClient} from "wordpress-api-client/dist/wp-api-client.js";
import {z} from "zod";
import {WordPressBlogState} from "./state/WordPressBlogState.js";

export const WordPressBlogProviderOptionsSchema = z.object({
  url: z.string(),
  username: z.string(),
  password: z.string(),
  imageGenerationModel: z.string(),
  cdn: z.string(),
  description: z.string(),
});

export type WordPressBlogProviderOptions = z.infer<typeof WordPressBlogProviderOptionsSchema>;

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

  const statusMap = {
    publish: "published",
    future: "scheduled",
    draft: "draft",
    pending: "pending",
    private: "private"
  };

  const now = new Date();
  return {
    id: id?.toString(),
    title: title?.rendered,
    content: content?.rendered,
    status: (statusMap[status as keyof typeof statusMap] ?? "draft") as BlogPost["status"],
    created_at: modified_gmt ? new Date(modified_gmt) : now,
    updated_at: modified_gmt ? new Date(modified_gmt) : now,
    published_at: date_gmt ? new Date(date_gmt) : now,
  };
}

export default class WordPressBlogProvider implements BlogProvider {
  private readonly client: WpApiClient;
  description: string;
  cdnName: string;
  imageGenerationModel: string;

  constructor(options: WordPressBlogProviderOptions) {
    this.description = options.description;
    this.cdnName = options.cdn;
    this.imageGenerationModel = options.imageGenerationModel;

    this.client = new WpApiClient(options.url, {
      auth: {
        type: 'basic',
        username: options.username,
        password: options.password,
      },
    });
  }

  attach(agent: Agent): void {
    agent.initializeState(WordPressBlogState, {});
  }

  async getAllPosts(): Promise<BlogPost[]> {
    const posts = await this.client.post().find(new URLSearchParams('status=publish,future,draft,pending,private'));
    return (posts.filter(post => post) as WPPost[]).map(WPPostToBlogPost);
  }

  getCurrentPost(agent: Agent): BlogPost | null {
    const currentPost = agent.getState(WordPressBlogState).currentPost;
    if (!currentPost) return null;

    return WPPostToBlogPost(currentPost);
  }

  async createPost(data: CreatePostData, agent: Agent): Promise<BlogPost> {
    const currentPost = agent.getState(WordPressBlogState).currentPost;
    if (currentPost) {
      throw new Error("A post is currently selected. Clear the selection before creating a new post.");
    }

    const {title, content = '', tags = [], feature_image} = data;
    if (feature_image && ! feature_image.id) {
      throw new Error("Wordpress feature image must be an attachment id - is wordpress not set as the CDN?");
    }
    const html = await marked(content);
    const result = await this.client.post().create({
      title: {rendered: title},
      content: {rendered: html, protected: false},
      status: 'draft',
      tags: tags.length > 0 ? await this.getOrCreateTagIds(tags) : [],
      feature_image: feature_image,
    });

    if (result) {
      agent.mutateState(WordPressBlogState, (state: WordPressBlogState) => {
        state.currentPost = result;
      });
      return WPPostToBlogPost(result);
    } else {
      throw new Error("Failed to create post");
    }
  }

  async updatePost(data: UpdatePostData, agent: Agent): Promise<BlogPost> {
    const {title, content, tags, feature_image, status} = data;
    const currentPost = agent.getState(WordPressBlogState).currentPost;
    if (!currentPost) {
      throw new Error("No post is currently selected. Select a post before updating.");
    }


    const updateData: Partial<WPPost> = {
      id: currentPost.id,
    };


    if (title) updateData.title = { rendered: title };
    if (content) updateData.content = { rendered: await marked(content), protected: false };
    if (tags) updateData.tags = await this.getOrCreateTagIds(tags);

    if (feature_image) {
      if (feature_image.id) updateData.featured_media = parseInt(feature_image.id, 10);
      else throw new Error("Wordpress feature image must be an attachment id - is wordpress not set as the CDN?");
    }

    if (status) {
      const statusMap = {
        published: "publish",
        scheduled: "future",
        draft: "draft",
        pending: "pending",
        private: "private"
      };
      updateData.status = statusMap[status];
    }

    const result = await this.client.post().update(updateData, currentPost.id);
    if (result) {
      agent.mutateState(WordPressBlogState, (state: WordPressBlogState) => {
        state.currentPost = result;
      });
      return WPPostToBlogPost(result);
    } else {
      throw new Error("Failed to update post");
    }
  }

  async selectPostById(id: string, agent: Agent): Promise<BlogPost> {
    const post = await this.client.post().find(parseInt(id, 10));
    if (post?.[0] == null) {
      throw new Error(`Post with ID ${id} not found`);
    }

    agent.mutateState(WordPressBlogState, (state: WordPressBlogState) => {
      state.currentPost = post[0];
    });
    return WPPostToBlogPost(post[0]);
  }

  async clearCurrentPost(agent: Agent): Promise<void> {
    agent.mutateState(WordPressBlogState, (state: WordPressBlogState) => {
      state.currentPost = null;
    });
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