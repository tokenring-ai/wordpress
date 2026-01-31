# @tokenring-ai/wordpress

WordPress integration for the Token Ring ecosystem, providing comprehensive blog post management and media handling capabilities through the WordPress REST API.

## Overview/Purpose

This package provides seamless WordPress integration for Token Ring applications, enabling AI agents to:

- **Blog Management**: Create, update, and manage WordPress blog posts through the REST API
- **Media Handling**: Upload and manage media files through WordPress media library
- **State Management**: Maintain current post context across agent interactions
- **Content Processing**: Convert Markdown to HTML for WordPress compatibility
- **Tag Management**: Automatically create and manage WordPress tags
- **Featured Images**: Set featured images for posts via CDN integration

## Installation/Setup

This package integrates seamlessly with Token Ring applications via the plugin system. To set up:

1. Add the WordPress plugin to your TokenRingApp instance.
2. Configure blog and CDN providers in the app's configuration.

```ts
import { TokenRingApp } from "@tokenring-ai/app";
import WordPressPlugin from "@tokenring-ai/wordpress/plugin";

const app = new TokenRingApp({
  plugins: [WordPressPlugin],
  config: {
    blog: {
      providers: {
        wordpress: {
          type: "wordpress",
          url: process.env.WORDPRESS_URL,
          username: process.env.WORDPRESS_USERNAME,
          password: process.env.WORDPRESS_PASSWORD,
          imageGenerationModel: "dall-e-3",
          cdn: "wordpress",
          description: "Main WordPress blog"
        }
      }
    },
    cdn: {
      providers: {
        wordpress: {
          type: "wordpress",
          url: process.env.WORDPRESS_URL,
          username: process.env.WORDPRESS_USERNAME,
          password: process.env.WORDPRESS_PASSWORD
        }
      }
    }
  }
});
```

These environment variables can be set to configure WordPress credentials:

```bash
WORDPRESS_URL=https://your-wordpress-site.com
WORDPRESS_USERNAME=your_username
WORDPRESS_PASSWORD=your_application_password
```

## Package Structure

```
pkg/wordpress/
├── index.ts                     # Main exports
├── plugin.ts                    # Plugin integration and auto-registration
├── WordPressBlogProvider.ts     # Core blog management implementation
├── WordPressCDNProvider.ts      # Media/CDN provider implementation
├── state/
│   └── WordPressBlogState.ts    # Agent state management for current post
├── design/
│   ├── posts.md                 # WordPress Posts API reference and schema
│   ├── media.md                 # WordPress Media API reference and schema
│   └── typescript-api.md        # TypeScript client API documentation
└── README.md                    # This file
```

## Core Components

### WordPressBlogProvider

The main blog provider implementing the `BlogProvider` interface:

```typescript
interface WordPressBlogProviderOptions {
  url: string;                    // WordPress site URL
  username: string;               // WordPress username
  password: string;               // WordPress application password
  imageGenerationModel: string;   // AI image generation model
  cdn: string;                    // CDN provider name
  description: string;            // Provider description
}
```

**Key Methods:**
- `attach(agent: Agent)`: Initialize the blog state for an agent
- `getAllPosts()`: Retrieve all posts from WordPress
- `getCurrentPost(agent)`: Get the currently selected post
- `createPost(data, agent)`: Create new blog posts from Markdown
- `updatePost(data, agent)`: Update existing posts
- `selectPostById(id, agent)`: Select a specific post as current
- `clearCurrentPost(agent)`: Clear current post selection

### WordPressCDNProvider

CDN provider for media file management:

```typescript
interface WordPressCDNProviderOptions {
  url: string;
  username: string;
  password: string;
}
```

**Key Methods:**
- `upload(data, options?)`: Upload media files to WordPress media library
- Returns: `{ url: string, id: string }`

### WordPressBlogState

Agent state management for current post context:

```typescript
class WordPressBlogState implements AgentStateSlice {
  currentPost: WPPost | null;

  // State persistence across agent sessions
  // Automatic cleanup on chat reset
  // Serialization support for checkpointing
}
```

**Methods:**
- `reset(what: ResetWhat[])`: Reset state (handles 'chat' reset)
- `serialize()`: Serialize state for checkpoints
- `deserialize(data)`: Deserialize state from checkpoints
- `show()`: Generate display string for current post

## Configuration

The package uses Zod schema validation for configuration:

```typescript
export const WordPressBlogProviderOptionsSchema = z.object({
  url: z.string(),
  username: z.string(),
  password: z.string(),
  imageGenerationModel: z.string(),
  cdn: z.string(),
  description: z.string(),
});

export const WordPressCDNProviderOptionsSchema = z.object({
  url: z.string(),
  username: z.string(),
  password: z.string(),
});
```

### Sample Configuration

```ts
{
  url: "https://example.com",
  username: "admin",
  password: "app_password",
  imageGenerationModel: "dall-e-3",
  cdn: "wordpress",
  description: "Main WordPress blog"
}
```

## Usage Examples

### Basic Blog Post Creation

```ts
import { WordPressBlogProvider } from "@tokenring-ai/wordpress";

const wpProvider = new WordPressBlogProvider({
  url: "https://your-site.com",
  username: "admin",
  password: "app_password",
  imageGenerationModel: "dall-e-3",
  cdn: "wordpress",
  description: "Main WordPress blog"
});

// Initialize state for the agent
await wpProvider.attach(agent);

// Create a new post
const newPost = await wpProvider.createPost({
  title: "My New Post",
  content: "# Hello World\n\nThis is a **Markdown** post.",
  tags: ["technology", "blog"]
}, agent);

// The post is automatically set as current post
const currentPost = wpProvider.getCurrentPost(agent);
```

### Media Upload via CDN

```ts
import { WordPressCDNProvider } from "@tokenring-ai/wordpress";

const wpCDN = new WordPressCDNProvider({
  url: "https://your-site.com",
  username: "admin",
  password: "app_password"
});

// Upload a file
const uploadResult = await wpCDN.upload(imageBuffer, {
  filename: "featured-image.jpg"
});

// Result includes WordPress media URL and ID
// { url: "https://site.com/wp-content/uploads/image.jpg", id: "123" }
```

### Post Status Management

```ts
// Update post status
await wpProvider.updatePost({
  status: "published"  // published, scheduled, draft, pending, private
}, agent);

// WordPress status mapping:
// published -> publish
// scheduled -> future
// draft -> draft
// pending -> pending
// private -> private
```

### Selecting an Existing Post

```ts
// Select an existing post by ID
const post = await wpProvider.selectPostById("123", agent);

// Make changes and update
await wpProvider.updatePost({
  title: "Updated Title",
  content: "Updated content in Markdown"
}, agent);

// Clear the current post selection
await wpProvider.clearCurrentPost(agent);
```

## API Reference

### Blog Provider Methods

#### attach()

Initialize the blog state for an agent:

```ts
async attach(agent: Agent): Promise<void>
```

Initializes the WordPressBlogState for the agent, enabling post management capabilities.

#### getAllPosts()

Retrieve all posts from WordPress:

```ts
async getAllPosts(): Promise<BlogPost[]>
```

Fetches all posts with statuses: publish, future, draft, pending, private.

#### getCurrentPost()

Get the currently selected post:

```ts
getCurrentPost(agent: Agent): BlogPost | null
```

Returns the currently selected post, or null if no post is selected.

#### createPost()

Create a new blog post:

```ts
interface CreatePostData {
  title: string;
  content?: string;
  tags?: string[];
  feature_image?: { id: string };
}

async createPost(data: CreatePostData, agent: Agent): Promise<BlogPost>
```

Automatically converts Markdown to HTML, creates missing tags automatically, and sets new post as current post.

#### updatePost()

Update an existing post:

```ts
interface UpdatePostData {
  title?: string;
  content?: string;
  tags?: string[];
  feature_image?: { id: string };
  status?: "published" | "scheduled" | "draft" | "pending" | "private";
}

async updatePost(data: UpdatePostData, agent: Agent): Promise<BlogPost>
```

Updates the currently selected post with new data.

#### selectPostById()

Select a specific post as current:

```ts
async selectPostById(id: string, agent: Agent): Promise<BlogPost>
```

Post ID is converted to integer internally. Throws error if post not found.

#### clearCurrentPost()

Clear current post selection:

```ts
async clearCurrentPost(agent: Agent): Promise<void>
```

Clears the current post selection.

### CDN Provider Methods

#### upload()

Upload media files:

```ts
interface UploadOptions {
  filename?: string;
}

async upload(data: Buffer, options?: UploadOptions): Promise<UploadResult>
// UploadResult: { url: string, id: string }
```

Uploads a buffer to the WordPress media library and returns the URL and media ID.

## Plugin Integration

The package automatically integrates with Token Ring applications through the plugin system:

```ts
import { TokenRingPlugin } from "@tokenring-ai/app";
import { BlogConfigSchema, BlogService } from "@tokenring-ai/blog";
import { CDNConfigSchema, CDNService } from "@tokenring-ai/cdn";
import { z } from "zod";
import packageJSON from './package.json' with {type: 'json'};
import WordPressBlogProvider, {WordPressBlogProviderOptionsSchema} from "./WordPressBlogProvider.js";
import WordPressCDNProvider, {WordPressCDNProviderOptionsSchema} from "./WordPressCDNProvider.js";

const packageConfigSchema = z.object({
  cdn: CDNConfigSchema.optional(),
  blog: BlogConfigSchema.optional(),
});

export default {
  name: packageJSON.name,
  version: packageJSON.version,
  description: packageJSON.description,
  install(app, config) {
    if (config.cdn) {
      app.services.waitForItemByType(CDNService, cdnService => {
        for (const name in config.cdn!.providers) {
          const provider = config.cdn!.providers[name];
          if (provider.type === "wordpress") {
            cdnService.registerProvider(name, new WordPressCDNProvider(
              WordPressCDNProviderOptionsSchema.parse(provider)
            ));
          }
        }
      });
    }
    if (config.blog) {
      app.services.waitForItemByType(BlogService, blogService => {
        for (const name in config.blog!.providers) {
          const provider = config.blog!.providers[name];
          if (provider.type === "wordpress") {
            blogService.registerBlog(name, new WordPressBlogProvider(
              WordPressBlogProviderOptionsSchema.parse(provider)
            ));
          }
        }
      });
    }
  },
  config: packageConfigSchema
} satisfies TokenRingPlugin<typeof packageConfigSchema>;
```

### Auto-Registration Features

- **Blog Service Integration**: Registers WordPress blog providers automatically
- **CDN Service Integration**: Registers WordPress CDN providers automatically
- **Configuration-Based Setup**: Reads configuration from app config slices
- **Service Dependencies**: Handles service lifecycle and dependencies

## Features

### Content Processing
- **Markdown Conversion**: Automatic Markdown to HTML conversion using `marked`
- **HTML Sanitization**: Content is marked as unprotected for WordPress
- **Rich Text Support**: Full HTML content support

### Tag Management
- **Automatic Creation**: Creates missing tags automatically
- **Duplicate Prevention**: Checks for existing tags before creation
- **Bulk Operations**: Handle multiple tags efficiently
- **Error Handling**: Graceful handling of tag operation failures

### State Management
- **Current Post Context**: Maintains current post across operations
- **Session Persistence**: Posts persist within agent sessions
- **Chat Reset**: Clears current post on chat reset
- **Checkpoint Support**: Full state serialization for checkpoints
- **Display Support**: Generates human-readable status via `show()` method

### Error Handling
- **Validation**: Comprehensive input validation with Zod
- **WordPress API Errors**: Proper error propagation from WordPress API
- **Missing Resources**: Clear errors for missing posts or resources
- **Network Issues**: Handling of network and API errors
- **Preconditions**: Validation of preconditions (e.g., no post selected when creating)

### Development Dependencies
- **vitest**: Testing framework
- **@vitest/coverage-v8**: Coverage reporting
- **typescript**: TypeScript compiler

## Design Documentation

The package includes comprehensive design documentation:

- **posts.md**: WordPress Posts API reference and schema
- **media.md**: WordPress Media API reference and schema
- **typescript-api.md**: TypeScript client API documentation

## WordPress REST API Integration

The package integrates with WordPress REST API endpoints:

### Posts API
- `GET /wp/v2/posts` - List posts
- `POST /wp/v2/posts` - Create post
- `GET /wp/v2/posts/{id}` - Get post
- `POST /wp/v2/posts/{id}` - Update post
- `DELETE /wp/v2/posts/{id}` - Delete post

### Media API
- `GET /wp/v2/media` - List media
- `POST /wp/v2/media` - Upload media
- `GET /wp/v2/media/{id}` - Get media item
- `POST /wp/v2/media/{id}` - Update media
- `DELETE /wp/v2/media/{id}` - Delete media

### Tags API
- `GET /wp/v2/tags` - List tags
- `POST /wp/v2/tags` - Create tag

## Development

### Building

```bash
bun run build
```

### Testing

```bash
bun run test
```

### Plugin Integration

The package automatically integrates with TokenRing applications. No additional setup required for standard usage.

## License

MIT License - see [LICENSE](./LICENSE) file for details.
