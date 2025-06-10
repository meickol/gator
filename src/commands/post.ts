import { getPostsForUser } from "../lib/db/queries/post";
import { getUser } from "../lib/db/queries/users";

export async function handlerBrowse(cmdName: string, ...args: string[]): Promise<void> {
    const user = await getUser(args[0]);

    // get arg 1 and check is a number. 
    const limit = parseInt(args[1]);
    const posts = await getPostsForUser(user.id, limit);
    console.log(posts);
}