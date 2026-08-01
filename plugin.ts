import type { TokenRingPlugin } from "@tokenring-ai/app";
import { z } from "zod";
import packageJSON from "./package.json" with { type: "json" };
import { WordPressConfigSchema } from "./schema.ts";
import WordPressService from "./WordPressService.ts";

const packageConfigSchema = z.object({
  wordpress: WordPressConfigSchema.prefault({ accounts: {} }),
});

export default {
  name: packageJSON.name,
  displayName: "WordPress Integration",
  version: packageJSON.version,
  description: packageJSON.description,
  install(app) {
    app.addService(new WordPressService());
  },
  reconfigure(app, config) {
    app.requireService(WordPressService).reconfigure(config.wordpress.accounts, app);
  },
  configSchema: packageConfigSchema,
} satisfies TokenRingPlugin<typeof packageConfigSchema>;
