import {CDNResource} from "@token-ring/cdn";
import type {UploadOptions, UploadResult} from "@token-ring/cdn/CDNService";
import {v4 as uuid} from "uuid";
import WpApiClient from "wordpress-api-client";

export interface WordPressCDNResourceOptions {
  url: string;
  username: string;
  password: string;
}

export default class WordPressCDNResource extends CDNResource {
  name: string = "WordPressCDN";
  description: string = "CDN backed by a WordPress media library";

  private readonly client: WpApiClient.default;

  constructor({url, username, password}: WordPressCDNResourceOptions) {
    super();

    if (!url || !username || !password) {
      throw new Error("WordPress CDN configuration requires url, username, and password");
    }

    this.client = new WpApiClient.default(url, {
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
    return {url: media.source_url};
  }
}