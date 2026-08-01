import type TokenRingApp from "@tokenring-ai/app";
import type { TokenRingService } from "@tokenring-ai/app/types";
import { BlogService } from "@tokenring-ai/blog";
import { CDNService } from "@tokenring-ai/cdn";
import deepEqual from "@tokenring-ai/utility/object/deepEqual";
import KeyedRegistry from "@tokenring-ai/utility/registry/KeyedRegistry";
import type { WordPressAccount } from "./schema.ts";
import WordPressBlogProvider from "./WordPressBlogProvider.ts";
import WordPressCDNProvider from "./WordPressCDNProvider.ts";

export default class WordPressService implements TokenRingService {
  readonly name = "WordPressService";
  description = "Connects to WordPress blogs";

  accounts = new KeyedRegistry<WordPressAccount>();

  reconfigure(config: Record<string, WordPressAccount>, app: TokenRingApp) {
    const cdnService = app.requireService(CDNService);
    const blogService = app.requireService(BlogService);

    this.accounts.reconcileAgainst(config, {
      creating: (name, account) => {
        cdnService.registerProvider(
          name,
          new WordPressCDNProvider({
            url: account.url,
            username: account.username,
            password: account.password,
          }),
        );
        blogService.registerBlog(
          name,
          new WordPressBlogProvider({
            url: account.url,
            username: account.username,
            password: account.password,
            description: account.blog.description,
            cdn: account.blog.cdn,
          }),
        );
        return account;
      },
      deleting: name => {
        cdnService.unregisterProvider(name);
        blogService.unregisterBlog(name);
      },
      updating: (name, existing, account) => {
        if (deepEqual(existing, account)) return existing;

        cdnService.unregisterProvider(name);
        blogService.unregisterBlog(name);

        cdnService.registerProvider(
          name,
          new WordPressCDNProvider({
            url: account.url,
            username: account.username,
            password: account.password,
          }),
        );
        blogService.registerBlog(
          name,
          new WordPressBlogProvider({
            url: account.url,
            username: account.username,
            password: account.password,
            description: account.blog.description,
            cdn: account.blog.cdn,
          }),
        );
        return account;
      },
    });
  }
}
