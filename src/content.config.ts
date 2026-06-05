import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders'; // Astro 6.0 핵심 로더 추가

const blogCollection = defineCollection({
  // 구버전 'type: content' 대신 최신 'glob' 로더로 마크다운 위치 지정
  loader: glob({ pattern: '*.md', base: "./src/content/blog" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    sourceUrl: z.string().url(),
    tags: z.array(z.string()),
  }),
});

export const collections = {
  'blog': blogCollection,
};