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

This package is part of the Token Ring monorepo and integrates automatically through the plugin system. For custom setups:

```ts
import WordPressPlugin from "@tokenring-ai/wordpress/plugin";
import { TokenRingApp } from "@tokenring-ai/app";

// The plugin auto-registers with TokenRing applications
// No manual setup required for standard integrations
```

## Package Structure

```
pkg/wordpress/
├── WordPressBlogProvider.ts      # Core blog management implementation
├── WordPressCDNProvider.ts       # Media/CDN provider implementation
├── WordPressBlogState.ts         # State management for current post
├── plugin.ts                     # Plugin integration and auto-registration
├── state/                        # State management files
├── design/                       # API documentation and design specs
└── README.md                     # This file
```

## Core Components

### WordPressBlogProvider

The main blog provider implementing the `BlogProvider` interface:

```ts
interface WordPressBlogProviderOptions {
  url: string;                    # WordPress site URL
  username: string;              # WordPress username
  password: string;              # WordPress application password
  imageGenerationModel: string;  # AI image generation model
  cdn: string;                   # CDN provider name
  description: string;           # Provider description
}
```

**Key Methods:**
- `getAllPosts()`: Retrieve all posts from WordPress
- `getCurrentPost()`: Get the currently selected post
- `createPost(data, agent)`: Create new blog posts from Markdown
- `updatePost(data, agent)`: Update existing posts
- `selectPostById(id, agent)`: Select a specific post as current
- `clearCurrentPost(agent)`: Clear current post selection

### WordPressCDNProvider

CDN provider for media file management:

```ts
interface WordPressCDNProviderOptions {
  url: string;
  username: string;
  password: string;
}
```

**Key Features:**
- Media upload to WordPress media library
- File storage and retrieval
- Integration with WordPress REST API

### WordPressBlogState

Agent state management for current post context:

```ts
class WordPressBlogState implements AgentStateSlice {
  currentPost: WPPost | null;
  
  # State persistence across agent sessions
  # Automatic cleanup on chat reset
  # Serialization support for checkpointing
}
```

## Configuration

The package uses Zod schema validation for configuration:

```ts
const WordPressBlogProviderOptionsSchema = z.object({
  url: z.string(),
  username: z.string(),
  password: z.string(),
  imageGenerationModel: z.string(),
  cdn: z.string(),
  description: z.string(),
});
```

### Environment Variables

```bash
WORDPRESS_URL=https://your-wordpress-site.com
WORDPRESS_USERNAME=your_username
WORDPRESS_PASSWORD=your_application_password
```

### Sample Configuration

```ts
WordPressBlogProvider.sampleArguments
// {
//   url: "https://example.com",
//   username: "admin", 
//   password: "app_password"
// }
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

## API Reference

### Blog Provider Methods

#### getAllPosts()

Retrieve all posts from WordPress:

```ts
const posts = await wpProvider.getAllPosts();
// Returns: BlogPost[] with all WordPress posts
```

#### createPost()

Create a new blog post:

```ts
interface CreatePostData {
  title: string;
  content?: string;
  tags?: string[];
  feature_image?: { id: string };
}

const post = await wpProvider.createPost(data, agent);
// Automatically converts Markdown to HTML
// Creates missing tags automatically
// Sets new post as current post
```

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

const post = await wpProvider.updatePost(data, agent);
```

#### selectPostById()

Select a specific post as current:

```ts
const post = await wpProvider.selectPostById("123", agent);
// Post ID is converted to integer internally
// Sets selected post as current post
```

### CDN Provider Methods

#### upload()

Upload media files:

```ts
interface UploadOptions {
  filename?: string;
}

const result = await wpCDN.upload(buffer, options);
// Returns: { url: string, id: string }
```

## Plugin Integration

The package automatically integrates with TokenRing applications through the plugin system:

```ts
export default {
  name: "@tokenring-ai/wordpress",
  version: "0.2.0",
  install(app: TokenRingApp) {
    # Automatically registers with BlogService and CDNService
    # Configures providers based on app configuration
    # Handles service dependencies
  }
}
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

### Error Handling

- **Validation**: Comprehensive input validation with Zod
- **WordPress API Errors**: Proper error propagation from WordPress API
- **Missing Resources**: Clear errors for missing posts or resources
- **Network Issues**: Handling of network and API errors

## Dependencies

### Runtime Dependencies

- **@tokenring-ai/app**: Core application framework
- **@tokenring-ai/ai-client**: AI client integration
- **@tokenring-ai/cdn**: CDN service interfaces
- **@tokenring-ai/agent**: Agent system integration
- **@tokenring-ai/blog**: Blog service interfaces
- **@tokenring-ai/filesystem**: File system services
- **@tokenring-ai/utility**: Utility functions
- **wordpress-api-client**: WordPress REST API client (^0.4.9)
- **marked**: Markdown processing (^17.0.1)
- **uuid**: UUID generation (^13.0.0)
- **zod**: Schema validation

### Development Dependencies

- **vitest**: Testing framework
- **@vitest/coverage-v8**: Coverage reporting

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
npm run build
```

### Testing

```bash
npm run test
```

### Plugin Integration

The package automatically integrates with TokenRing applications. No additional setup required for standard usage.

## License

MIT License - see repository LICENSE file for details.

## Integration Notes

This package is designed to work seamlessly with the TokenRing ecosystem through the plugin system. For custom integrations, ensure proper configuration of WordPress credentials and CDN settings.