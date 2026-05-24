# Projects

This folder is for your work. Organize it however you like!

## Suggested Structure

```
projects/
├── client-name/
│   ├── website-redesign/
│   │   ├── mockups/
│   │   ├── deliverables/
│   │   └── project.data      # Project metadata
│   └── brand-refresh/
│
├── personal/
│   ├── portfolio/
│   └── side-projects/
│
└── archive/
    └── completed-2024/
```

## Using Assets

Reference brand assets from `@brand/`:

```json
{
  "logo": "brand:logo-primary:001",
  "colors": ["brand:color-primary:001", "brand:color-secondary:001"],
  "font": "brand:font-heading:001"
}
```

## File Types

You can use custom file types anywhere:

- `mockup.image` - Image with metadata
- `explainer.video` - Video with metadata
- `brand-kit.palette` - Color palette
- `project.data` - Structured project data
