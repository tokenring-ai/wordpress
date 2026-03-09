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

## Installation

```bash
bun add @tokenring-ai/wordpress
```

### Dependencies

This package requires the following dependencies:

- `@tokenring-ai/app` - Application framework
- `@tokenring-ai/ai-client` - AI client integration
- `@tokenring-ai/cdn` - CDN service and provider interfaces
- `@tokenring-ai/agent` - Agent system and state management
- `@tokenring-ai/blog` - Blog service interface
- `@tokenring-ai/filesystem` - File system utilities
- `@tokenring-ai/utility` - Utility functions
- `wordpress-api-client` - WordPress REST API client (^0.4.9)
- `marked` - Markdown to HTML conversion (^17.0.3)
- `uuid` - UUID generation (^13.0.0)
- `zod` - Schema validation (^4.3.6)

## Features

- Full WordPress REST API integration for posts and media
- Automatic Markdown to HTML conversion
- Tag creation and management
- Featured image support via CDN integration
- Agent state management for current post context
- Checkpoint support for state persistence
- Type-safe provider configuration with Zod schemas

## Core Components/API

### WordPressBlogProvider

The main blog provider implementing the `BlogProvider` interface for WordPress blog management.

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

**Schema:**

```typescript
const WordPressBlogProviderOptionsSchema = z.object({
  url: z.string(),
  username: z.string(),
  password: z.string(),
  imageGenerationModel: z.string(),
  cdn: z.string(),
  description: z.string(),
});
```

**Methods:**

- `attach(agent: Agent): void` - Initialize the blog state for an agent
- `getAllPosts(): Promise<BlogPost[]>` - Retrieve all posts from WordPress (publish, future, draft, pending, private)
- `getRecentPosts(filter: BlogPostFilterOptions, agent: Agent): Promise<BlogPost[]>` - Retrieve recent posts with filtering
  - `filter.status?: BlogPostStatus` - Filter by status
  - `filter.keyword?: string` - Search keyword
  - `filter.limit?: number` - Maximum number of posts
- `getCurrentPost(agent: Agent): BlogPost | null` - Get the currently selected post
- `createPost(data: CreatePostData, agent: Agent): Promise<BlogPost>` - Create new blog posts from Markdown
  - `data.title: string` - Post title
  - `data.content?: string` - Post content in Markdown
  - `data.tags?: string[]` - Array of tag names
  - `data.feature_image?: { id: string }` - Featured image attachment ID
  - **Note**: Throws an error if a post is currently selected
- `updatePost(data: UpdatePostData, agent: Agent): Promise<BlogPost>` - Update existing post
  - `data.title?: string` - Updated title
  - `data.content?: string` - Updated content in Markdown
  - `data.tags?: string[]` - Updated tags
  - `data.feature_image?: { id: string }` - Updated featured image
  - `data.status?: BlogPostStatus` - New status
  - **Note**: Throws an error if no post is currently selected
- `selectPostById(id: string, agent: Agent): Promise<BlogPost>` - Select a specific post as current
- `clearCurrentPost(agent: Agent): Promise<void>` - Clear current post selection

**Status Mapping:**

WordPress status values are automatically mapped to BlogPost status values:

| WordPress | BlogPost   |
|-----------|------------|
| publish   | published  |
| future    | scheduled  |
| draft     | draft      |
| pending   | pending    |
| private   | private    |

**Error Handling:**

- `createPost`: Throws error if a post is currently selected ("A post is currently selected. Clear the selection before creating a new post.")
- `updatePost`: Throws error if no post is currently selected ("No post is currently selected. Select a post before updating.")
- `selectPostById`: Throws error if post not found ("Post with ID {id} not found")
- `createPost`/`updatePost`: Throws error if feature_image.id is missing ("Wordpress feature image must be an attachment id - is wordpress not set as the CDN?")

### WordPressCDNProvider

CDN provider for media file management, implementing the `CDNProvider` interface.

**Constructor Options:**

```typescript
interface WordPressCDNProviderOptions {
  url: string;
  username: string;
  password: string;
}
```

**Schema:**

```typescript
const WordPressCDNProviderOptionsSchema = z.object({
  url: z.string(),
  username: z.string(),
  password: z.string(),
});
```

**Methods:**

- `upload(data: Buffer, options?: UploadOptions): Promise<UploadResult>` - Upload media files to WordPress media library
  - `options.filename?: string` - Optional filename override (defaults to UUID.jpg)
  - Returns: `{ url: string, id: string }`

**Properties:**

- `name: string = "WordPressCDN"` - Provider name
- `description: string = "CDN backed by a WordPress media library"` - Provider description

### WordPressBlogState

Agent state slice for tracking the current post context.

**Schema:**

```typescript
const serializationSchema = z.object({
  currentPost: z.any().nullable()
});
```

**Properties:**

- `currentPost: WPPost | null` - Currently selected WordPress post

**Methods:**

- `reset(what: ResetWhat[]): void` - Reset state (handles 'chat' reset)
- `serialize(): z.output<typeof serializationSchema>` - Serialize state for checkpoints
- `deserialize(data: z.output<typeof serializationSchema>): void` - Deserialize state from checkpoints
- `show(): string[]` - Generate display string for current post

## Usage Examples

### Basic Blog Post Creation

```typescript
import { WordPressBlogProvider } from "@tokenring-ai/wordpress";
import { TokenRingApp } from "@tokenring-ai/app";
import WordPressPlugin from "@tokenring-ai/wordpress/plugin";
import { BlogService } from "@tokenring-ai/blog";

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
import { CDNService } from "@tokenring-ai/cdn";

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

// Get all posts (all statuses)
const allPosts = await wpProvider.getAllPosts();
```

### Direct Provider Instantiation

```typescript
import WordPressBlogProvider from "@tokenring-ai/wordpress/WordPressBlogProvider";
import WordPressCDNProvider from "@tokenring-ai/wordpress/WordPressCDNProvider";

// Blog provider
const blogProvider = new WordPressBlogProvider({
  url: "https://your-site.com",
  username: "admin",
  password: "app_password",
  imageGenerationModel: "dall-e-3",
  cdn: "wordpress",
  description: "Main WordPress blog"
});

// CDN provider
const cdnProvider = new WordPressCDNProvider({
  url: "https://your-site.com",
  username: "admin",
  password: "app_password"
});
```

## Configuration

The WordPress plugin integrates with the Token Ring application configuration system.

### Plugin Configuration Schema

```typescript
import { z } from "zod";
import { CDNConfigSchema } from "@tokenring-ai/cdn";
import { BlogConfigSchema } from "@tokenring-ai/blog";

const packageConfigSchema = z.object({
  cdn: CDNConfigSchema.optional(),
  blog: BlogConfigSchema.optional(),
});
```

### Example Configuration

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

## Integration

### Plugin Registration

The WordPress plugin automatically registers both blog and CDN providers when configured:

```typescript
import WordPressPlugin from "@tokenring-ai/wordpress/plugin";
import { TokenRingApp } from "@tokenring-ai/app";

const app = new TokenRingApp({
  plugins: [WordPressPlugin],
  config: {
    // Configuration as shown above
  }
});
```

### Service Registration

The plugin registers providers with the following services:

- **BlogService**: Registers `WordPressBlogProvider` as a blog provider
- **CDNService**: Registers `WordPressCDNProvider` as a CDN provider

### Agent Integration

The `WordPressBlogProvider.attach()` method initializes state management for agents:

```typescript
// Provider automatically attaches to agents when used
provider.attach(agent);
// Initializes WordPressBlogState for the agent
```

## RPC Endpoints

This package does not define any RPC endpoints directly. It uses the WordPress REST API endpoints:

### WordPress REST API Endpoints Used

| Endpoint                      | Method | Description                    |
|-------------------------------|--------|--------------------------------|
| `/wp/v2/posts`                | GET    | List posts                     |
| `/wp/v2/posts`                | POST   | Create post                    |
| `/wp/v2/posts/{id}`           | GET    | Get post                       |
| `/wp/v2/posts/{id}`           | POST   | Update post                    |
| `/wp/v2/posts/{id}`           | DELETE | Delete post                    |
| `/wp/v2/media`                | GET    | List media                     |
| `/wp/v2/media`                | POST   | Upload media                   |
| `/wp/v2/media/{id}`           | GET    | Get media item                 |
| `/wp/v2/media/{id}`           | POST   | Update media                   |
| `/wp/v2/media/{id}`           | DELETE | Delete media                   |
| `/wp/v2/tags`                 | GET    | List tags                      |
| `/wp/v2/tags`                 | POST   | Create tag                     |

## State Management

### WordPressBlogState

State slice for tracking the current post context.

**Schema:**

```typescript
const serializationSchema = z.object({
  currentPost: z.any().nullable()
});
```

**State Structure:**

- `currentPost: WPPost | null` - Currently selected WordPress post

**Persistence:**

- Posts persist within agent sessions
- Full state serialization for agent checkpoints
- Chat reset clears current post selection

## Chat Commands

This package does not define any chat commands directly. Blog operations are performed through service methods.

## Provider Documentation

### WordPressBlogProvider

Implements the `BlogProvider` interface with the following capabilities:

- **Provider Type**: "wordpress"
- **Authentication**: Basic authentication with username and application password
- **Content Format**: Markdown input, HTML output (via marked)
- **Tag Management**: Automatic tag creation if not exists
- **Status Support**: All WordPress post statuses (publish, future, draft, pending, private)

### WordPressCDNProvider

Extends `CDNProvider` with WordPress media library backend:

- **Provider Type**: "wordpress"
- **Authentication**: Basic authentication with username and application password
- **File Format**: Defaults to .jpg if no extension provided
- **ID Format**: Returns WordPress media ID as string
- **URL Format**: Returns WordPress media source URL

## Best Practices

1. **Use Application Passwords**: Always use WordPress application passwords instead of user passwords for API access
2. **Configure CDN Integration**: Set up WordPress CDN provider for featured image support
3. **Handle State Management**: Clear current post selection when done to avoid conflicts
4. **Error Handling**: Wrap provider calls in try-catch blocks for production use
5. **Environment Variables**: Store credentials in environment variables, not in code
6. **Tag Names**: Use consistent tag naming conventions for better organization

## Testing and Development

### Building

```bash
bun run build
```

### Testing

```bash
bun run test
bun run test:watch
bun run test:coverage
```

### Test Configuration

The package uses vitest for testing with the following configuration:

```typescript
import {defineConfig} from "vitest/config";

export default defineConfig({
  test: {
    include: ["**/*.test.ts"],
    environment: "node",
    globals: true,
    isolate: true,
  },
});
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
├── vitest.config.ts             # Test configuration
├── package.json                 # Package metadata and dependencies
├── README.md                    # This file
└── LICENSE                      # MIT License
```

## Related Components

- `@tokenring-ai/blog` - Blog service interface and types
- `@tokenring-ai/cdn` - CDN service and provider interfaces
- `@tokenring-ai/agent` - Agent system and state management
- `@tokenring-ai/app` - Application framework
- `wordpress-api-client` - WordPress REST API client library

## License

MIT License - see [LICENSE](./LICENSE) file for details.
