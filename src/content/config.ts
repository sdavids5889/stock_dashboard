import { defineCollection, z } from 'astro:content';

const blogCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(), // 'YYYY-MM-DD' 문자열을 Date 객체로 자동 변환
    sourceUrl: z.string().url(),
    tags: z.array(z.string()),
  }),
});

export const collections = {
  'blog': blogCollection,
};