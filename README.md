# @token-ring/wordpress

WordPress integration package for the Token Ring writer. It provides:

- WordPressService to connect to a WordPress site via REST API
- Ready-to-use tools for agents and templates (create posts, get selection, generate images)
- A /wordpress chat command to select posts, show info, or start a new post

## What does it do?

This package lets Token Ring agents and the interactive REPL work with your WordPress blog:

- Browse and select an existing post as the current working context
- Create a new draft post from Markdown
- Generate an AI image and set it as the post's featured image
- Read the currently selected post's basic details

Internally it wraps the wordpress-api-client library and maintains a currentPost state used by tools and chat commands.

## Installation / Enabling

This package lives in the monorepo and is consumed by the writer app. To add it in a custom Registry setup:

```ts
import * as WordPressPackage from "@token-ring/wordpress";
import { WordPressService } from "@token-ring/wordpress";
import { Registry } from "@token-ring/registry";

const registry = new Registry();
await registry.start();
await registry.addPackages(WordPressPackage);

await registry.services.addServices(
  new WordPressService({
    url: process.env.WORDPRESS_URL!,
    username: process.env.WORDPRESS_USERNAME!,
    password: process.env.WORDPRESS_PASSWORD!,
  })
);

// Enable the tools exported by this package
await registry.tools.enableTools(Object.keys(WordPressPackage.tools));
```

## Configuration

WordPressService requires connection details for your WordPress site:

- url: string — Your WordPress site URL (e.g., https://your-site.com)
- username: string — WordPress username
- password: string — WordPress application password (not regular password)

Example environment variables:

- WORDPRESS_URL=https://your-wordpress-site.example
- WORDPRESS_USERNAME=your_username
- WORDPRESS_PASSWORD=your_application_password

Sample arguments exported by the service:

```ts
WordPressService.sampleArguments
// {
//   url: "https://your-wordpress-site.com",
//   username: "YOUR_USERNAME",
//   password: "YOUR_APPLICATION_PASSWORD"
// }
```

## Chat Command

Command: /wordpress

Usage: /wordpress post [select|info|new]

- post select: Open a tree selector to choose an existing post or clear selection
- post info: Show details about the currently selected post (title, status, dates, tags, URL)
- post new: Clear selection to indicate the next operations should create a new post

## CDN Service

WordPressCDNService uses the WordPress media library as a CDN:

```ts
import { WordPressCDNService } from "@token-ring/wordpress";

const wpCDN = new WordPressCDNService({
  url: process.env.WORDPRESS_URL!,
  username: process.env.WORDPRESS_USERNAME!,
  password: process.env.WORDPRESS_PASSWORD!
});

await registry.services.addServices(wpCDN);
```

Files uploaded via this CDN service are stored in the WordPress media library and accessible via the WordPress REST API.

## Exposed Tools

These tools are exported via pkg/wordpress/tools.ts and can be enabled through the Registry tool system.

- createPost
  - Description: Create a new WordPress post from Markdown content (saved as draft)
  - Params: { title: string; content: string; tags?: string[] }
  - Behavior: Converts Markdown to HTML, creates the post via REST API, and sets it as currentPost

- getCurrentPost
  - Description: Return details of the currently selected post or null if none
  - Params: none

- generateImageForPost
  - Description: Use an AI image model to generate an image and set it as the featured image of the currently selected post
  - Params: { prompt: string; aspectRatio?: "square"|"tall"|"wide" }

## License

MIT (see repository LICENSE)