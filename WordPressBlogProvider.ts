import Agent from "@tokenring-ai/agent/Agent";
import {
  BlogPost,
  BlogProvider,
  BlogProviderOptions,
  CreatePostData,
  UpdatePostData
} from "@tokenring-ai/blog/BlogProvider";
import {marked} from "marked";
import WpApiClient from "wordpress-api-client";
import {WordPressBlogState} from "./state/WordPressBlogState.js";

export type WPPost = WpApiClient.WPPost;
export interface WordPressProviderOptions extends BlogProviderOptions {
  url: string;
  username: string;
  password: string;
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


export default class WordPressBlogProvider implements BlogProvider {
  static sampleArguments = {
    url: "https://example.com",
    username: "admin",
    password: "",
  };

  private readonly client: WpApiClient.default;
  private readonly url: string;
  description: string;
  cdnName: string;
  imageGenerationModel: string;

  constructor({url, username, password, imageGenerationModel, cdn, description}: WordPressProviderOptions) {
    if (!cdn) {
      throw new Error("Error in Ghost config: No cdn provided");
    }
    this.cdnName = cdn;

    if (!imageGenerationModel) {
      throw new Error("Error in Ghost config: No imageGenerationModel provided");
    }
    this.imageGenerationModel = imageGenerationModel;

    if (!description) {
      throw new Error("Error in Ghost config: No description provided");
    }
    this.description = description;

    if (!url) {
      throw new Error("Error in WordPress config: No url provided");
    }

    if (!username || !password) {
      throw new Error("Error in WordPress configuration: username and password required");
    }

    this.url = url;
    this.client = new WpApiClient.default(url, {
      auth: {
        type: 'basic',
        username,
        password,
      },
    });
  }

  async attach(agent: Agent): Promise<void> {
    agent.initializeState(WordPressBlogState, {});
  }

  async getAllPosts(): Promise<BlogPost[]> {
    const posts = await this.client.post().find();
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

    const {title, content = '', tags = []} = data;
    const html = await marked(content);
    const result = await this.client.post().create({
      title: {rendered: title},
      content: {rendered: html, protected: false},
      status: 'draft',
      tags: tags.length > 0 ? await this.getOrCreateTagIds(tags) : [],
    });

    if (result) {
      return WPPostToBlogPost(result);
    } else {
      throw new Error("Failed to create post");
    }
  }

  async updatePost(data: UpdatePostData, agent: Agent): Promise<BlogPost> {
    const {title, content, tags} = data;
    const currentPost = agent.getState(WordPressBlogState).currentPost;
    if (!currentPost) {
      throw new Error("No post is currently selected. Select a post before updating.");
    }

    const updateData: WPPost = {
      ...currentPost,
    };

    if (title) updateData.title = { rendered: title };
    if (content) updateData.content = { rendered: await marked(content), protected: false };
    if (tags) updateData.tags = await this.getOrCreateTagIds(tags);

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