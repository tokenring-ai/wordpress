import type { TokenRingPlugin } from "@tokenring-ai/app";
import { BlogService } from "@tokenring-ai/blog";
import { CDNService } from "@tokenring-ai/cdn";
import { z } from "zod";
import packageJSON from "./package.json" with { type: "json" };
import { type WordPressAccount, WordPressConfigSchema } from "./schema.ts";
import WordPressBlogProvider from "./WordPressBlogProvider.ts";
import WordPressCDNProvider from "./WordPressCDNProvider.ts";

const packageConfigSchema = z.object({
  wordpress: WordPressConfigSchema.prefault({ accounts: {} }),
});

function addAccountsFromEnv(accounts: Record<string, Partial<WordPressAccount>>) {
  for (const [key, value] of Object.entries(process.env)) {
    const match = key.match(/^WORDPRESS_URL(\d*)$/);
    if (!match || !value) continue;
    const n = match[1];
    const username = process.env[`WORDPRESS_USERNAME${n}`];
    const password = process.env[`WORDPRESS_PASSWORD${n}`];
    if (!username || !password) continue;
    const name = process.env[`WORDPRESS_NAME${n}`] ?? new URL(value).hostname;
    accounts[name] = {
      url: value,
      username,
      password,
      blog: {
        description: process.env[`WORDPRESS_DESCRIPTION${n}`] ?? `WordPress (${name})`,
        cdn: process.env[`WORDPRESS_CDN${n}`] ?? name,
      },
      cdn: {},
    };
  }
}

export default {
  name: packageJSON.name,
  displayName: "WordPress Integration",
  version: packageJSON.version,
  description: packageJSON.description,
  install(app, config) {
    addAccountsFromEnv(config.wordpress.accounts);

    for (const [name, account] of Object.entries(config.wordpress.accounts)) {
      if (account.cdn) {
        app.services.waitForItemByType(CDNService, cdnService => {
          cdnService.registerProvider(
            name,
            new WordPressCDNProvider({
              url: account.url,
              username: account.username,
              password: account.password,
            }),
          );
        });
      }

      if (account.blog) {
        app.services.waitForItemByType(BlogService, blogService => {
          blogService.registerBlog(
            name,
            new WordPressBlogProvider({
              url: account.url,
              username: account.username,
              password: account.password,
              description: account.blog.description,
              cdn: account.blog.cdn ?? name,
            }),
          );
        });
      }
    }
  },
  config: packageConfigSchema,
} satisfies TokenRingPlugin<typeof packageConfigSchema>;
