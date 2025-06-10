import { Feed, feeds, users, User, FeedFollow, feedFollows, Post, posts} from "../schema";
import { db } from "../index";
import { eq, and, sql, desc } from "drizzle-orm";

export async function createFeed(name: string, url: string, userId: string): Promise<Feed> {
  const [result] = await db.insert(feeds).values({ name, url, user_id: userId }).returning();
  return result;
}

export async function getFeed(id: string): Promise<Feed> {
  const [result] = await db.select().from(feeds).where(eq(feeds.id, id));
  return result;
}

export async function getFeedByUrl(url: string): Promise<Feed | null> {
  const [result] = await db.select().from(feeds).where(eq(feeds.url, url));
  return result || null;
}

export async function getFeeds(): Promise<{
  feeds: Feed;
  users: User | null;
}[]> {
  const result = await db.select().from(feeds).leftJoin(users, eq(feeds.user_id, users.id));
  return result;
}

export async function createFeedFollow(feedId: string, userId: string): Promise<{
  feedFollow: FeedFollow;
  userName: string;
  feedName: string;
}> {
  const [result] = await db.insert(feedFollows).values({ feed_id: feedId, user_id: userId }).returning();
  
  const [enrichedResult] = await db
    .select({
      feedFollow: feedFollows,
      userName: users.name,
      feedName: feeds.name,
    })
    .from(feedFollows)
    .innerJoin(users, eq(feedFollows.user_id, users.id))
    .innerJoin(feeds, eq(feedFollows.feed_id, feeds.id))
    .where(eq(feedFollows.id, result.id));
    
  return enrichedResult;
}

export async function getFeedFollows(userId: string): Promise<FeedFollow[]> {
  const result = await db.select().from(feedFollows).where(eq(feedFollows.user_id, userId));
  return result;
}

export async function getFeedFollowsForUser(userId: string): Promise<{
  feedFollow: FeedFollow;
  userName: string;
  feedName: string;
}[]> {
  const result = await db
    .select({
      feedFollow: feedFollows,
      userName: users.name,
      feedName: feeds.name,
    })
    .from(feedFollows)
    .innerJoin(users, eq(feedFollows.user_id, users.id))
    .innerJoin(feeds, eq(feedFollows.feed_id, feeds.id))
    .where(eq(feedFollows.user_id, userId));
    
  return result;
}

export async function deleteFeedFollowByUserAndUrl(userId: string, feedUrl: string): Promise<boolean> {
  // First, get the feed by URL
  const feed = await getFeedByUrl(feedUrl);
  if (!feed) {
    return false;
  }

  // Delete the feed follow record
  const result = await db
    .delete(feedFollows)
    .where(
      and(
        eq(feedFollows.user_id, userId),
        eq(feedFollows.feed_id, feed.id)
      )
    );

  return true; // If no error was thrown, the deletion was successful
}

export async function markFeedFetched(feedId: string): Promise<void> {
  await db
    .update(feeds)
    .set({
      lastFetchedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(feeds.id, feedId));
}

export async function getNextFeedToFetch(): Promise<Feed | null> {
  const [result] = await db
    .select()
    .from(feeds)
    .orderBy(sql`${feeds.lastFetchedAt} ASC NULLS FIRST`)
    .limit(1);
    
  return result || null;
}
