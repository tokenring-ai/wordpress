import {AgentStateSlice} from "@tokenring-ai/agent/Agent";
import {ResetWhat} from "@tokenring-ai/agent/AgentEvents";
import {WPPost} from "../WordPressBlogProvider.js";

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
}