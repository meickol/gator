import { XMLParser } from "fast-xml-parser";
import { readConfig } from "../config";
import { Feed, User, users } from "../lib/db/schema";
import { createFeed, getFeeds, getFeedByUrl, createFeedFollow, getFeedFollowsForUser, deleteFeedFollowByUserAndUrl } from "../lib/db/queries/feeds";
import { getUser, getUserById } from "../lib/db/queries/users";

export type RSSItem = {
  title: string;
  link: string;
  description: string;
  pubDate: string;
};

export type RSSFeed = {
  title: string;
  link: string;
  description: string;
  items: RSSItem[];
};

export async function fetchFeed(feedUrl: string): Promise<RSSFeed> {
  const response = await fetch(feedUrl, {
    headers: {
      "User-Agent": "gator"
    }
  });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch feed: ${response.statusText}`);
  }

  const xmlData = await response.text();
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_"
  });
  
  const result = parser.parse(xmlData);
  
  if (!result.rss?.channel) {
    throw new Error("Invalid RSS feed: missing channel");
  }

  const channel = result.rss.channel;
  
  // Validate required channel fields
  if (!channel.title || !channel.link || !channel.description) {
    throw new Error("Invalid RSS feed: missing required channel fields");
  }

  // Process items
  const items: RSSItem[] = [];
  const rawItems = channel.item || [];
  
  if (!Array.isArray(rawItems)) {
    throw new Error("Invalid RSS feed: items must be an array");
  }

  for (const item of rawItems) {
    if (item.title && item.link && item.description && item.pubDate) {
      items.push({
        title: item.title,
        link: item.link,
        description: item.description,
        pubDate: item.pubDate
      });
    }
  }

  return {
    title: channel.title,
    link: channel.link,
    description: channel.description,
    items
  };
}

export async function handlerAgg(cmdName: string, ...args: string[]): Promise<void> {
  try {
    const feed = await fetchFeed("https://www.wagslane.dev/index.xml");
    console.log(JSON.stringify(feed, null, 2));
  } catch (error) {
    console.error("Error fetching feed:", error);
  }
}

export async function handlerAddFeed(cmdName: string, user: User, ...args: string[]): Promise<void> {
  const name = args[0];
  const url = args[1];

  console.log(`Adding feed ${name} URL: ${url} for user ${user.name}`);

  const feed = await createFeed(name, url, user.id);
  console.log(`Feed added successfully!`);
  printFeed(feed, user);
  
  // Automatically create a feed follow record for the current user
  const followResult = await createFeedFollow(feed.id, user.id);
  console.log(`Automatically following ${followResult.feedName} by ${followResult.userName}`);
  
  process.exit(0);
}

export function printFeed(feed: Feed, user: User) {
  console.log(`Name: ${feed.name} - URL: ${feed.url} - User: ${user.name}`);
}

export async function handlerListFeeds(cmdName: string, ...args: string[]): Promise<void> {
  const feeds = await getFeeds();

  feeds.forEach((feed) => {
    printFeed(feed.feeds, feed.users as User);
  });
  process.exit(0);
}

export async function handlerFollow(cmdName: string, user: User, ...args: string[]): Promise<void> {
  const url = args[0];

  if (!url) {
    console.log("Usage: follow <url>");
    process.exit(1);
  }

  const feed = await getFeedByUrl(url);
  if (!feed) {
    console.log(`Feed with URL ${url} not found. Please add the feed first.`);
    process.exit(1);
  }

  const result = await createFeedFollow(feed.id, user.id);
  console.log(`Successfully followed ${result.feedName} by ${result.userName}`);
  process.exit(0);
}

export async function handlerFollowing(cmdName: string, user: User, ...args: string[]): Promise<void> {
  const feedFollows = await getFeedFollowsForUser(user.id);

  if (feedFollows.length === 0) {
    console.log("You are not following any feeds.");
  } else {
    console.log(`Following ${feedFollows.length} feed(s):`);
    feedFollows.forEach((follow) => {
      console.log(`- ${follow.feedName}`);
    });
  }
  process.exit(0);
}

export async function handlerUnfollow(cmdName: string, user: User, ...args: string[]): Promise<void> {
  const url = args[0];

  if (!url) {
    console.log("Usage: unfollow <url>");
    process.exit(1);
  }

  const success = await deleteFeedFollowByUserAndUrl(user.id, url);
  if (!success) {
    console.log(`Feed with URL ${url} not found or you are not following it.`);
    process.exit(1);
  }

  console.log(`Successfully unfollowed feed with URL: ${url}`);
  process.exit(0);
}