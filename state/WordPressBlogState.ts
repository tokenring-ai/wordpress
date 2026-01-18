import {ResetWhat} from "@tokenring-ai/agent/AgentEvents";
import {AgentStateSlice} from "@tokenring-ai/agent/types";
import {WPPost} from "wordpress-api-client/src/types.js"

export class WordPressBlogState implements AgentStateSlice {
  name = "WordPressBlogState";
  currentPost: WPPost | null;

  constructor({currentPost}: { currentPost?: WPPost | null } = {}) {
    this.currentPost = currentPost || null;
  }

  reset(what: ResetWhat[]): void {
    if (what.includes('chat')) {
      this.currentPost = null;
    }
  }

  serialize(): object {
    return {
      currentPost: this.currentPost,
    };
  }

  deserialize(data: any): void {
    this.currentPost = data.currentPost || null;
  }

  show(): string[] {
    return [
      `Current Post: ${this.currentPost ? `${this.currentPost.title?.rendered || 'Untitled'} (ID: ${this.currentPost.id})` : 'None'}`
    ];
  }
}