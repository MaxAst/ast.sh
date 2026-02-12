import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders'; // Not available with legacy API

const blog = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/posts" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.coerce.date(),
    image: z.string().default("/blog-placeholder.svg"),
    isDraft: z.boolean().default(false),
  })
});

const apps = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/apps" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.coerce.date(),
    isDraft: z.boolean().default(false),
    platform: z.string().optional(),
    appStoreUrl: z.string().optional(),
  })
});

export const collections = { blog, apps };