import { setUser } from "../config";

export async function handlerLogin(cmdName: string, ...args: string[]): Promise<void> {
  if (args.length !== 1) {
    throw new Error(`usage: ${cmdName} <name>`);
  }

  const userName = args[0];
  setUser(userName);
  console.log("User switched successfully!");
}
