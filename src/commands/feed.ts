import { XMLParser } from "fast-xml-parser";
import { Feed, User, users } from "../lib/db/schema";
import { createFeed, getFeeds, getFeedByUrl, createFeedFollow, getFeedFollowsForUser, deleteFeedFollowByUserAndUrl, markFeedFetched, getNextFeedToFetch, getPostsForUser } from "../lib/db/queries/feeds";
import { createPost } from "../lib/db/queries/post";

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

/**
 * Fetches and parses an RSS feed from the given URL
 * @param feedUrl - The URL of the RSS feed to fetch
 * @returns Promise that resolves to a parsed RSS feed object
 * @throws Error if the feed cannot be fetched or parsed
 */
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

/**
 * Parses a duration string into milliseconds
 * @param durationStr - Duration string in format like "1s", "5m", "2h", "1000ms"
 * @returns The duration in milliseconds
 * @throws Error if the duration format is invalid
 */
function parseDuration(durationStr: string): number {
  const regex = /^(\d+)(ms|s|m|h)$/;
  const match = durationStr.match(regex);
  
  if (!match) {
    throw new Error(`Invalid duration format: ${durationStr}. Use format like 1s, 1m, 1h`);
  }
  
  const value = parseInt(match[1]);
  const unit = match[2];
  
  switch (unit) {
    case 'ms':
      return value;
    case 's':
      return value * 1000;
    case 'm':
      return value * 60 * 1000;
    case 'h':
      return value * 60 * 60 * 1000;
    default:
      throw new Error(`Unknown duration unit: ${unit}`);
  }
}

/**
 * Scrapes the next available feed from the database
 * Fetches the feed content, parses it, and displays the items
 * Marks the feed as fetched after processing
 */
async function scrapeFeeds(): Promise<void> {
  console.log("Looking for feeds to scrape...");
  
  const feed = await getNextFeedToFetch();
  if (!feed) {
    console.log("No feeds available to scrape.");
    return;
  }
  
  console.log(`Scraping feed: ${feed.name} (${feed.url})`);
  
  try {
    // Mark feed as fetched first
    await markFeedFetched(feed.id);
    
    // Fetch and parse the feed
    const rssFeed = await fetchFeed(feed.url);
    
    console.log(`Found ${rssFeed.items.length} posts in ${feed.name}:`);
    
    // Use for loop instead of forEach to properly handle async/await
    for (let index = 0; index < rssFeed.items.length; index++) {
      const item = rssFeed.items[index];
      
      // Convert string date to Date object
      const pubDate = new Date(item.pubDate);
      
      // Save the post to the database
      const post = await createPost(item.title, item.link, item.description, pubDate, feed.id);
      
      console.log(`  ${index + 1}. ${item.title}`);
    }
    
  } catch (error) {
    console.error(`Error scraping feed ${feed.name}:`, error);
  }
  
  console.log("---");
}

/**
 * Handles and logs errors that occur during feed scraping
 * @param error - The error that occurred
 */
function handleError(error: unknown): void {
  console.error("Error during feed scraping:", error);
}

/**
 * Handles the aggregation command that continuously scrapes feeds at regular intervals
 * @param cmdName - The name of the command (unused)
 * @param args - Command arguments, first argument should be the time between requests
 */
export async function handlerAgg(cmdName: string, ...args: string[]): Promise<void> {
  const timeBetweenReqsStr = args[0];
  
  if (!timeBetweenReqsStr) {
    console.log("Usage: agg <time_between_reqs>");
    console.log("Example: agg 1m");
    process.exit(1);
  }
  
  let timeBetweenRequests: number;
  try {
    timeBetweenRequests = parseDuration(timeBetweenReqsStr);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
  
  // Convert milliseconds back to readable format for display
  const seconds = Math.floor(timeBetweenRequests / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  const displayTime = minutes > 0 ? `${minutes}m${remainingSeconds}s` : `${remainingSeconds}s`;
  
  console.log(`Collecting feeds every ${displayTime}`);
  
  // Run once immediately
  scrapeFeeds().catch(handleError);
  
  // Set up interval
  const interval = setInterval(() => {
    scrapeFeeds().catch(handleError);
  }, timeBetweenRequests);
  
  // Handle SIGINT (Ctrl+C) gracefully
  await new Promise<void>((resolve) => {
    process.on("SIGINT", () => {
      console.log("\nShutting down feed aggregator...");
      clearInterval(interval);
      resolve();
    });
  });
}

/**
 * Handles adding a new RSS feed to the database
 * @param cmdName - The name of the command (unused)
 * @param user - The user adding the feed
 * @param args - Command arguments: [name, url]
 */
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

/**
 * Prints feed information to the console
 * @param feed - The feed to display
 * @param user - The user associated with the feed
 */
export function printFeed(feed: Feed, user: User) {
  console.log(`Name: ${feed.name} - URL: ${feed.url} - User: ${user.name}`);
}

/**
 * Handles listing all feeds in the database
 * @param cmdName - The name of the command (unused)
 * @param args - Command arguments (unused)
 */
export async function handlerListFeeds(cmdName: string, ...args: string[]): Promise<void> {
  const feeds = await getFeeds();

  feeds.forEach((feed) => {
    printFeed(feed.feeds, feed.users as User);
  });
  process.exit(0);
}

/**
 * Handles following an existing feed by URL
 * @param cmdName - The name of the command (unused)
 * @param user - The user who wants to follow the feed
 * @param args - Command arguments: [url]
 */
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

/**
 * Handles displaying all feeds that the current user is following
 * @param cmdName - The name of the command (unused)
 * @param user - The user whose followed feeds to display
 * @param args - Command arguments (unused)
 */
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

/**
 * Handles unfollowing a feed by URL
 * @param cmdName - The name of the command (unused)
 * @param user - The user who wants to unfollow the feed
 * @param args - Command arguments: [url]
 */
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

/**
 * Handles browsing the latest posts for the current user
 * @param cmdName - The name of the command (unused)
 * @param user - The user whose posts to browse
 * @param args - Command arguments: [limit] (optional, defaults to 2)
 */
export async function handlerBrowse(cmdName: string, user: User, ...args: string[]): Promise<void> {
  const limitStr = args[0];
  let limit = 2; // Default limit

  // Parse limit if provided
  if (limitStr) {
    const parsedLimit = parseInt(limitStr);
    if (isNaN(parsedLimit) || parsedLimit <= 0) {
      console.log("Error: limit must be a positive number");
      process.exit(1);
    }
    limit = parsedLimit;
  }

  console.log(`Browsing latest ${limit} posts for user ${user.name}:`);

  const posts = await getPostsForUser(user.id, limit);

  if (posts.length === 0) {
    console.log("No posts found. Follow some feeds first!");
  } else {
    posts.forEach((postData, index) => {
      const { post, feedName } = postData;
      console.log(`${index + 1}. ${post.title}`);
      console.log(`   URL: ${post.url}`);
      console.log(`   Description: ${post.description || 'No description'}`);
      console.log(`   Published: ${post.publishedAt ? post.publishedAt.toLocaleString() : 'Unknown'}`);
      console.log(`   From: ${feedName}`);
      console.log();
    });
  }

  process.exit(0);
}