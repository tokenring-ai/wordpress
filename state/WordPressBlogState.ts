import {AgentStateSlice} from "@tokenring-ai/agent/types";
import {WPPost} from "wordpress-api-client/src/types.js"
import {z} from "zod";

const serializationSchema = z.object({
  currentPost: z.any().nullable()
});

export class WordPressBlogState extends AgentStateSlice<typeof serializationSchema> {
  currentPost: WPPost | null;

  constructor({currentPost}: { currentPost?: WPPost | null } = {}) {
    super("WordPressBlogState",serializationSchema);
    this.currentPost = currentPost || null;
  }

  reset(): void {
    this.currentPost = null;
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
