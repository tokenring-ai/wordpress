import type { TokenRingPlugin } from "@tokenring-ai/app";
import { BlogService } from "@tokenring-ai/blog";
import { CDNService } from "@tokenring-ai/cdn";
import { z } from "zod";
import packageJSON from "./package.json" with { type: "json" };
import { WordPressConfigSchema } from "./schema.ts";
import WordPressBlogProvider from "./WordPressBlogProvider.ts";
import WordPressCDNProvider from "./WordPressCDNProvider.ts";

const packageConfigSchema = z.object({
  wordpress: WordPressConfigSchema.prefault({ accounts: {} }),
});

export default {
  name: packageJSON.name,
  displayName: "WordPress Integration",
  version: packageJSON.version,
  description: packageJSON.description,
  install(app, config) {
    for (const [name, account] of Object.entries(config.wordpress.accounts)) {
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

      app.services.waitForItemByType(BlogService, blogService => {
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
      });
    }
  },
  configSchema: packageConfigSchema,
} satisfies TokenRingPlugin<typeof packageConfigSchema>;
