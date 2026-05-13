# @tokenring-ai/wordpress

WordPress integration for the Token Ring ecosystem, providing blog post management and media handling
capabilities through the WordPress REST API.

## Overview

This package provides seamless WordPress integration for Token Ring applications, enabling AI agents to:

- **Blog Management**: Create, update, and manage WordPress blog posts through the REST API
- **Media Handling**: Upload and manage media files through WordPress media library
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
- `@tokenring-ai/cdn` - CDN service and provider interfaces
- `@tokenring-ai/blog` - Blog service interface
- `@tokenring-ai/utility` - Utility functions
- `wordpress-api-client` - WordPress REST API client (^0.4.9)
- `marked` - Markdown to HTML conversion (^17.0.6)
- `uuid` - UUID generation (^13.0.0)
- `zod` - Schema validation (^4.3.6)

## Features

- Full WordPress REST API integration for posts and media
- Automatic Markdown to HTML conversion
- Tag creation and management
- Featured image support via CDN integration
- Type-safe provider configuration with Zod schemas
- Environment variable configuration support

## Core Components/API

### WordPressBlogProvider

The main blog provider implementing the `BlogProvider` interface for WordPress blog management.

**Constructor Options:**

```typescript
interface WordPressBlogProviderOptions {
  url: string;           // WordPress site URL
  username: string;      // WordPress username
  password: string;      // WordPress application password
  cdn: string;           // CDN provider name
  description: string;   // Provider description
}
```

**Schema:**

```typescript
const WordPressBlogProviderOptionsSchema = z.object({
  url: z.string(),
  username: z.string(),
  password: z.string(),
  cdn: z.string(),
  description: z.string(),
});
```

**Methods:**

- `getAllPosts(): Promise<BlogPost[]>` - Retrieve all posts from WordPress (publish, future, draft, pending, private)
- `getRecentPosts(filter: BlogPostFilterOptions): Promise<BlogPost[]>` - Retrieve recent posts with filtering
- `filter.status?: BlogPostStatus` - Filter by status
- `filter.keyword?: string` - Search keyword
- `filter.limit?: number` - Maximum number of posts
- `createPost(data: CreatePostData): Promise<BlogPost>` - Create new blog posts from Markdown
- `data.title: string` - Post title
- `data.html: string` - Post content in HTML (Markdown should be converted before passing)
- `data.tags?: string[]` - Array of tag names
- `data.feature_image?: { id: string, url?: string }` - Featured image attachment ID and optional URL
- `updatePost(id: string, data: UpdatePostData): Promise<BlogPost>` - Update existing post
- `data.title?: string` - Updated title
- `data.html?: string` - Updated content in HTML
- `data.tags?: string[]` - Updated tags
- `data.feature_image?: { id: string }` - Updated featured image
- `data.status?: BlogPostStatus` - New status
- `getPostById(id: string): Promise<BlogPost>` - Get a specific post by ID

**Properties:**

- `description: string` - Provider description
- `cdnName: string` - CDN provider name

**Status Mapping:**

WordPress status values are automatically mapped to BlogPost status values:

| WordPress | BlogPost  |
|-----------|-----------|
| publish   | published |
| future    | scheduled |
| draft     | draft     |
| pending   | pending   |
| private   | private   |

**Error Handling:**

- `createPost`/`updatePost`: Throws error if feature_image.id is missing ("Wordpress feature image must be an
  attachment id - is wordpress not set as the CDN?")
- `getPostById`: Throws error if post not found ("Post with ID {id} not found")
- `createPost`/`updatePost`: Throws error if post creation/update fails ("Failed to create post" / "Failed to update
  post")

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
    wordpress: {
      accounts: {
        wordpress: {
          url: "https://your-site.com",
          username: "admin",
          password: "app_password",
          blog: {
            description: "Main WordPress blog",
            cdn: "wordpress"
          },
          cdn: {}
        }
      }
    }
  }
});

// Get the blog provider
const blogService = app.services.getItemByType(BlogService);
const wpProvider = blogService.getProvider("wordpress");

// Create a new post (content should be HTML, convert Markdown with marked)
const newPost = await wpProvider.createPost({
  title: "My New Post",
  html: "<h1>Hello World</h1><p>This is a <strong>HTML</strong> post.</p>",
  tags: ["technology", "blog"]
});
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
    wordpress: {
      accounts: {
        wordpress: {
          url: "https://your-site.com",
          username: "admin",
          password: "app_password",
          blog: {
            description: "Main WordPress blog",
            cdn: "wordpress"
          },
          cdn: {}
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
  html: "<p>Content here</p>",
  feature_image: { id: uploadResult.id, url: uploadResult.url }
});
```

### Post Status Management

```typescript
// Update post status
await wpProvider.updatePost("123", {
  status: "published"  // published, scheduled, draft, pending, private
});

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
const post = await wpProvider.getPostById("123");

// Make changes and update
await wpProvider.updatePost("123", {
  title: "Updated Title",
  html: "<p>Updated content in HTML</p>"
});
```

### Filtering and Retrieving Recent Posts

```typescript
// Get recent posts with filtering
const recentPosts = await wpProvider.getRecentPosts({
  status: "published",
  keyword: "technology",
  limit: 10
});

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
import { WordPressConfigSchema } from "@tokenring-ai/wordpress/schema";

const packageConfigSchema = z.object({
  wordpress: WordPressConfigSchema.prefault({ accounts: {} }),
});
```

### WordPress Account Schema

```typescript
const WordPressAccountSchema = z.object({
  url: z.string(),
  username: z.string(),
  password: z.string(),
  blog: z.object({
    description: z.string().default("WordPress blog"),
    cdn: z.string(),
  }),
  cdn: z.object({}),
});

const WordPressConfigSchema = z.object({
  accounts: z.record(z.string(), WordPressAccountSchema).default({}),
});
```

### Example Configuration

```typescript
{
  wordpress: {
    accounts: {
      wordpress: {
        url: process.env.WORDPRESS_URL,
        username: process.env.WORDPRESS_USERNAME,
        password: process.env.WORDPRESS_PASSWORD,
        blog: {
          description: "Main WordPress blog",
          cdn: "wordpress"
        },
        cdn: {}
      }
    }
  }
}
```

### Environment Variables

The plugin supports environment variable configuration for multiple WordPress accounts:

- `WORDPRESS_URL{n}` - WordPress site URL (n is optional number for multiple accounts)
- `WORDPRESS_USERNAME{n}` - WordPress username
- `WORDPRESS_PASSWORD{n}` - WordPress application password
- `WORDPRESS_NAME{n}` - Account name (defaults to hostname from URL)
- `WORDPRESS_DESCRIPTION{n}` - Blog description (defaults to "WordPress {name}")
- `WORDPRESS_CDN{n}` - CDN provider name (defaults to account name)

Example:

```bash
WORDPRESS_URL=https://your-site.com
WORDPRESS_USERNAME=admin
WORDPRESS_PASSWORD=app_password
WORDPRESS_NAME=myblog
WORDPRESS_DESCRIPTION=My WordPress Blog
WORDPRESS_CDN=wordpress
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
    wordpress: {
      accounts: {
        wordpress: {
          url: "https://your-site.com",
          username: "admin",
          password: "app_password",
          blog: {
            description: "Main WordPress blog",
            cdn: "wordpress"
          },
          cdn: {}
        }
      }
    }
  }
});
```

### Service Registration

The plugin registers providers with the following services:

- **BlogService**: Registers `WordPressBlogProvider` as a blog provider
- **CDNService**: Registers `WordPressCDNProvider` as a CDN provider

## RPC Endpoints

This package does not define any RPC endpoints directly. It uses the WordPress REST API endpoints:

### WordPress REST API Endpoints Used

| Endpoint            | Method | Description    |
|---------------------|--------|----------------|
| `/wp/v2/posts`      | GET    | List posts     |
| `/wp/v2/posts`      | POST   | Create post    |
| `/wp/v2/posts/{id}` | GET    | Get post       |
| `/wp/v2/posts/{id}` | POST   | Update post    |
| `/wp/v2/media`      | GET    | List media     |
| `/wp/v2/media`      | POST   | Upload media   |
| `/wp/v2/media/{id}` | GET    | Get media item |
| `/wp/v2/media/{id}` | POST   | Update media   |
| `/wp/v2/media/{id}` | DELETE | Delete media   |
| `/wp/v2/tags`       | GET    | List tags      |
| `/wp/v2/tags`       | POST   | Create tag     |

## Chat Commands

This package does not define any chat commands directly. Blog operations are performed through service methods.

## Provider Implementation Details

### WordPressBlogProvider Implementation

Implements the `BlogProvider` interface with the following capabilities:

- **Provider Type**: "wordpress"
- **Authentication**: Basic authentication with username and application password
- **Content Format**: HTML input (Markdown should be converted before passing)
- **Tag Management**: Automatic tag creation if not exists
- **Status Support**: All WordPress post statuses (publish, future, draft, pending, private)

### WordPressCDNProvider Implementation

Extends `CDNProvider` with WordPress media library backend:

- **Provider Type**: "wordpress"
- **Authentication**: Basic authentication with username and application password
- **File Format**: Defaults to .jpg if no extension provided
- **ID Format**: Returns WordPress media ID as string
- **URL Format**: Returns WordPress media source URL

## Best Practices

1. **Use Application Passwords**: Always use WordPress application passwords instead of user passwords for API access
2. **Configure CDN Integration**: Set up WordPress CDN provider for featured image support
3. **Convert Markdown to HTML**: Use the `marked` library to convert Markdown content before passing to the provider
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
import { defineConfig } from "vitest/config";

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

```text
pkg/wordpress/
├── index.ts                     # Main exports
├── plugin.ts                    # Plugin integration and auto-registration
├── WordPressBlogProvider.ts     # Core blog management implementation
├── WordPressCDNProvider.ts      # Media/CDN provider implementation
├── schema.ts                    # Zod schema definitions
├── vitest.config.ts             # Test configuration
├── package.json                 # Package metadata and dependencies
├── README.md                    # This file
└── LICENSE                      # MIT License
```

## Related Components

- `@tokenring-ai/blog` - Blog service interface and types
- `@tokenring-ai/cdn` - CDN service and provider interfaces
- `@tokenring-ai/app` - Application framework
- `@tokenring-ai/utility` - Utility functions
- `wordpress-api-client` - WordPress REST API client library
- `marked` - Markdown to HTML conversion library

## License

MIT License - see [LICENSE](./LICENSE) file for details.
