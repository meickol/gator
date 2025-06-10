import { getPostsForUser } from "../lib/db/queries/post";
import { User } from "../lib/db/schema";

export async function handlerBrowse(cmdName: string, user: User, ...args: string[]): Promise<void> {
    const limit = parseInt(args[0]) ?? 2;
    const posts = await getPostsForUser(user.id, limit);
    console.log('Posts: ', posts);
    process.exit(0);
}
