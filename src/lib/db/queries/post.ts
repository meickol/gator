import { desc, eq } from "drizzle-orm";
import { db } from "../index";
import { posts, Post, feeds, feedFollows } from "../schema";

export async function createPost(title: string, url: string, description: string, publishedAt: Date, feedId: string): Promise<Post> {
    const [result] = await db.insert(posts).values({ title, url, description, publishedAt, feed_id: feedId }).returning();
    return result;
}

export async function getPostsForUser(userId: string, limit: number = 2): Promise<{
    post: Post;
    feedName: string;
  }[]> {
    const result = await db
      .select({
        post: posts,
        feedName: feeds.name,
      })
      .from(posts)
      .innerJoin(feeds, eq(posts.feed_id, feeds.id))
      .innerJoin(feedFollows, eq(feeds.id, feedFollows.feed_id))
      .where(eq(feedFollows.user_id, userId))
      .orderBy(desc(posts.publishedAt), desc(posts.createdAt))
      .limit(limit);
      
    return result;
  }