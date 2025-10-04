import {AgentTeam, TokenRingPackage} from "@tokenring-ai/agent";
import {BlogConfigSchema, BlogService} from "@tokenring-ai/blog";
import {CDNConfigSchema, CDNService} from "@tokenring-ai/cdn";
import packageJSON from './package.json' with {type: 'json'};
import WordPressBlogProvider, {WordPressBlogProviderOptionsSchema} from "./WordPressBlogProvider.js";
import WordPressCDNProvider, {WordPressCDNProviderOptionsSchema} from "./WordPressCDNProvider.js";

export const packageInfo: TokenRingPackage = {
  name: packageJSON.name,
  version: packageJSON.version,
  description: packageJSON.description,
  install(agentTeam: AgentTeam) {
    const cdnConfig = agentTeam.getConfigSlice("cdn", CDNConfigSchema);

    if (cdnConfig) {
      agentTeam.services.waitForItemByType(CDNService).then(cdnService => {
        for (const name in cdnConfig.providers) {
          const provider = cdnConfig.providers[name];
          if (provider.type === "wordpress") {
            cdnService.registerProvider(name, new WordPressCDNProvider(WordPressCDNProviderOptionsSchema.parse(provider)));
          }
        }
      });
    }

    const blogConfig = agentTeam.getConfigSlice("blog", BlogConfigSchema);

    if (blogConfig) {
      agentTeam.services.waitForItemByType(BlogService).then(blogService => {
        for (const name in blogConfig.providers) {
          const provider = blogConfig.providers[name];
          if (provider.type === "wordpress") {
            blogService.registerBlog(name, new WordPressBlogProvider(WordPressBlogProviderOptionsSchema.parse(provider)));
          }
        }
      });
    }
  },
};

export {default as WordPressBlogProvider} from "./WordPressBlogProvider.ts";
export {default as WordPressCDNProvider} from "./WordPressCDNProvider.ts";