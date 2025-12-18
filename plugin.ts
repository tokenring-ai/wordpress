import TokenRingApp, { TokenRingPlugin } from "@tokenring-ai/app";
import {BlogConfigSchema, BlogService} from "@tokenring-ai/blog";
import {CDNConfigSchema, CDNService} from "@tokenring-ai/cdn";
import packageJSON from './package.json' with {type: 'json'};
import WordPressBlogProvider, {WordPressBlogProviderOptionsSchema} from "./WordPressBlogProvider.js";
import WordPressCDNProvider, {WordPressCDNProviderOptionsSchema} from "./WordPressCDNProvider.js";


export default {
  name: packageJSON.name,
  version: packageJSON.version,
  description: packageJSON.description,
  install(app: TokenRingApp) {
    const cdnConfig = app.getConfigSlice("cdn", CDNConfigSchema);

    if (cdnConfig) {
      app.services.waitForItemByType(CDNService, cdnService => {
        for (const name in cdnConfig.providers) {
          const provider = cdnConfig.providers[name];
          if (provider.type === "wordpress") {
            cdnService.registerProvider(name, new WordPressCDNProvider(WordPressCDNProviderOptionsSchema.parse(provider)));
          }
        }
      });
    }

    const blogConfig = app.getConfigSlice("blog", BlogConfigSchema);

    if (blogConfig) {
      app.services.waitForItemByType(BlogService, blogService => {
        for (const name in blogConfig.providers) {
          const provider = blogConfig.providers[name];
          if (provider.type === "wordpress") {
            blogService.registerBlog(name, new WordPressBlogProvider(WordPressBlogProviderOptionsSchema.parse(provider)));
          }
        }
      });
    }
  },
} satisfies TokenRingPlugin;
