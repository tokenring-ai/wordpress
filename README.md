# @tokenring-ai/wordpress

WordPress integration for the Token Ring ecosystem, providing comprehensive blog post management and media handling capabilities through the WordPress REST API.

## Overview

This package provides seamless WordPress integration for Token Ring applications, enabling AI agents to:

- **Blog Management**: Create, update, and manage WordPress blog posts through the REST API
- **Media Handling**: Upload and manage media files through WordPress media library
- **State Management**: Maintain current post context across agent interactions
- **Content Processing**: Convert Markdown to HTML for WordPress compatibility
- **Tag Management**: Automatically create and manage WordPress tags
- **Featured Images**: Set featured images for posts via CDN integration

## Chat Commands

This package does not define any chat commands directly. Blog operations are performed through service methods.

## Plugin Configuration

The WordPress plugin integrates with the Token Ring application configuration system:

```typescript
{
  cdn: {
    providers: {
      wordpress: {
        type: "wordpress",
        url: process.env.WORDPRESS_URL,
        username: process.env.WORDPRESS_USERNAME,
        password: process.env.WORDPRESS_PASSWORD
      }
    }
  },
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
  }
}
```

### Configuration Schema

```typescript
const packageConfigSchema = z.object({
  cdn: CDNConfigSchema.optional(),
  blog: BlogConfigSchema.optional(),
});
```

## Agent Configuration

The WordPressBlogProvider implements the `BlogProvider` interface and integrates with the Agent system through state management:

### WordPressBlogState

Agent state slice for tracking the current post context:

- **Current Post**: Tracks the currently selected WordPress post
- **Session Persistence**: Posts persist within agent sessions
- **Chat Reset**: Clears current post when chat context is reset
- **Checkpoint Support**: Full state serialization for agent checkpoints

## Tools

This package does not define any tools directly. Blog operations are performed through service methods.

## Services

### WordPressBlogProvider

The main blog provider implementing the `BlogProvider` interface:

**Constructor Options:**
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

**Methods:**

- `attach(agent: Agent): void` - Initialize the blog state for an agent
- `getAllPosts(): Promise<BlogPost[]>` - Retrieve all posts from WordPress
- `getRecentPosts(filter: BlogPostFilterOptions, agent: Agent): Promise<BlogPost[]>` - Retrieve recent posts with filtering
- `getCurrentPost(agent: Agent): BlogPost | null` - Get the currently selected post
- `createPost(data: CreatePostData, agent: Agent): Promise<BlogPost>` - Create new blog posts from Markdown
- `updatePost(data: UpdatePostData, agent: Agent): Promise<BlogPost>` - Update existing posts
- `selectPostById(id: string, agent: Agent): Promise<BlogPost>` - Select a specific post as current
- `clearCurrentPost(agent: Agent): Promise<void>` - Clear current post selection

**Status Mapping:**

WordPress status values are automatically mapped to BlogPost status values:

| WordPress | BlogPost |
|-----------|----------|
| publish   | published |
| future    | scheduled |
| draft     | draft     |
| pending   | pending   |
| private   | private   |

### WordPressCDNProvider

CDN provider for media file management, implementing the `CDNProvider` interface:

**Constructor Options:**
```typescript
interface WordPressCDNProviderOptions {
  url: string;
  username: string;
  password: string;
}
```

**Methods:**

- `upload(data: Buffer, options?: UploadOptions): Promise<UploadResult>` - Upload media files to WordPress media library
  - `options.filename?: string` - Optional filename override
  - Returns: `{ url: string, id: string }`

## RPC Endpoints

This package does not define any RPC endpoints directly.

## State Management

### WordPressBlogState

State slice for tracking the current post context:

**Schema:**
```typescript
const serializationSchema = z.object({
  currentPost: z.any().nullable()
});
```

**Methods:**
- `reset(what: ResetWhat[]): void` - Reset state (handles 'chat' reset)
- `serialize(): z.output<typeof serializationSchema>` - Serialize state for checkpoints
- `deserialize(data: z.output<typeof serializationSchema>): void` - Deserialize state from checkpoints
- `show(): string[]` - Generate display string for current post

**State Structure:**
- `currentPost: WPPost | null` - Currently selected WordPress post

## Dependencies

### Production Dependencies

- `@tokenring-ai/app` - Application framework
- `@tokenring-ai/ai-client` - AI client integration
- `@tokenring-ai/cdn` - CDN service and provider interfaces
- `@tokenring-ai/agent` - Agent system and state management
- `@tokenring-ai/blog` - Blog service interface
- `@tokenring-ai/filesystem` - File system utilities
- `@tokenring-ai/utility` - Utility functions (including `requireFields`)
- `wordpress-api-client` - WordPress REST API client
- `marked` - Markdown to HTML conversion
- `uuid` - UUID generation
- `zod` - Schema validation

### Development Dependencies

- `vitest` - Testing framework
- `@vitest/coverage-v8` - Coverage reporting
- `typescript` - TypeScript compiler

## Usage Examples

### Basic Blog Post Creation

```typescript
import { WordPressBlogProvider } from "@tokenring-ai/wordpress";
import { TokenRingApp } from "@tokenring-ai/app";
import WordPressPlugin from "@tokenring-ai/wordpress/plugin";

// Initialize app with plugin
const app = new TokenRingApp({
  plugins: [WordPressPlugin],
  config: {
    blog: {
      providers: {
        wordpress: {
          type: "wordpress",
          url: "https://your-site.com",
          username: "admin",
          password: "app_password",
          imageGenerationModel: "dall-e-3",
          cdn: "wordpress",
          description: "Main WordPress blog"
        }
      }
    }
  }
});

// Get the blog provider
const blogService = app.services.getItemByType(BlogService);
const wpProvider = blogService.getProvider("wordpress");

// Create a new post
const newPost = await wpProvider.createPost({
  title: "My New Post",
  content: "# Hello World\n\nThis is a **Markdown** post.",
  tags: ["technology", "blog"]
}, agent);
```

### Media Upload via CDN

```typescript
import { WordPressCDNProvider } from "@tokenring-ai/wordpress";
import { TokenRingApp } from "@tokenring-ai/app";
import WordPressPlugin from "@tokenring-ai/wordpress/plugin";

// Initialize app with plugin
const app = new TokenRingApp({
  plugins: [WordPressPlugin],
  config: {
    cdn: {
      providers: {
        wordpress: {
          type: "wordpress",
          url: "https://your-site.com",
          username: "admin",
          password: "app_password"
        }
      }
    }
  }
});

// Upload an image
const wpCDN = app.services.getItemByType(CDNService).getProvider("wordpress");
const uploadResult = await wpCDN.upload(imageBuffer, {
  filename: "featured-image.jpg"
});

// Use the image as a featured image
await wpProvider.createPost({
  title: "Post with Featured Image",
  content: "Content here",
  feature_image: { id: uploadResult.id }
}, agent);
```

### Post Status Management

```typescript
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

### Selecting and Updating an Existing Post

```typescript
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

### Filtering and Retrieving Recent Posts

```typescript
// Get recent posts with filtering
const recentPosts = await wpProvider.getRecentPosts({
  status: "published",
  keyword: "technology",
  limit: 10
}, agent);
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
bun run test:coverage
```

## License

MIT License - see [LICENSE](./LICENSE) file for details.
