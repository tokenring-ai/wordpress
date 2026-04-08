import {z} from "zod";

export const WordPressAccountCDNSchema = z.object({

});

export const WordPressAccountBlogSchema = z.object({
  description: z.string().default("WordPress blog"),
  cdn: z.string(),
});

export const WordPressAccountSchema = z.object({
  url: z.string(),
  username: z.string(),
  password: z.string(),
  blog: WordPressAccountBlogSchema,
  cdn: WordPressAccountCDNSchema,
});

export const WordPressConfigSchema = z.object({
  accounts: z.record(z.string(), WordPressAccountSchema).default({}),
});

export type WordPressConfig = z.output<typeof WordPressConfigSchema>;
export type WordPressAccount = z.output<typeof WordPressAccountSchema>;
export type WordPressAccountBlog = z.output<typeof WordPressAccountBlogSchema>;
export type WordPressAccountCDN = z.output<typeof WordPressAccountCDNSchema>;
