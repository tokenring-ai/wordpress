import {ResetWhat} from "@tokenring-ai/agent/AgentEvents";
import type {AgentStateSlice} from "@tokenring-ai/agent/types";
import {z} from "zod";
import {WPPost} from "wordpress-api-client/src/types.js"

const serializationSchema = z.object({
  currentPost: z.any().nullable()
});

export class WordPressBlogState implements AgentStateSlice<typeof serializationSchema> {
  name = "WordPressBlogState";
  serializationSchema = serializationSchema;
  currentPost: WPPost | null;

  constructor({currentPost}: { currentPost?: WPPost | null } = {}) {
    this.currentPost = currentPost || null;
  }

  reset(what: ResetWhat[]): void {
    if (what.includes('chat')) {
      this.currentPost = null;
    }
  }

  serialize(): z.output<typeof serializationSchema> {
    return {
      currentPost: this.currentPost,
    };
  }

  deserialize(data: z.output<typeof serializationSchema>): void {
    this.currentPost = data.currentPost || null;
  }

  show(): string[] {
    return [
      `Current Post: ${this.currentPost ? `${this.currentPost.title?.rendered || 'Untitled'} (ID: ${this.currentPost.id})` : 'None'}`
    ];
  }
}
