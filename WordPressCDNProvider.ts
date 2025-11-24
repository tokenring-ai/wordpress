import {CDNProvider} from "@tokenring-ai/cdn";
import {UploadOptions, UploadResult} from "@tokenring-ai/cdn/types";
import requireFields from "@tokenring-ai/utility/object/requireFields";
import {v4 as uuid} from "uuid";
import {WpApiClient} from "wordpress-api-client/src/wp-api-client.ts";
import {z} from "zod";

export const WordPressCDNProviderOptionsSchema = z.object({
  url: z.string(),
  username: z.string(),
  password: z.string(),
});

export type WordPressCDNProviderOptions = z.infer<typeof WordPressCDNProviderOptionsSchema>;


export default class WordPressCDNProvider extends CDNProvider {
  name: string = "WordPressCDN";
  description: string = "CDN backed by a WordPress media library";

  private readonly client: WpApiClient;

  constructor(opts: WordPressCDNProviderOptions) {
    super();
    const {url, username, password} = opts;
    requireFields(opts, ["url", "username", "password"], "WordPressCDNProvider");

    this.client = new WpApiClient(url, {
      auth: {
        type: 'basic',
        username,
        password,
      },
    });
  }

  async upload(data: Buffer, options?: UploadOptions): Promise<UploadResult> {
    const filename = options?.filename || `${uuid()}.jpg`;

    const media = await this.client.media().create(
      filename,
      data,
    );
    return {url: media.source_url, id: media.id.toString()};
  }
}