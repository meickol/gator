import { User } from "../lib/db/schema";
import { getUser } from "../lib/db/queries/users";
import { readConfig } from "../config";

export type CommandHandler = (cmdName: string, ...args: string[]) => Promise<void>;

export type UserCommandHandler = (
  cmdName: string,
  user: User,
  ...args: string[]
) => Promise<void>;

export type CommandsRegistry = Record<string, CommandHandler>;

export const middlewareLoggedIn = (handler: UserCommandHandler): CommandHandler => {
  return async (cmdName: string, ...args: string[]): Promise<void> => {
    const userName = readConfig().currentUserName;
    const user = await getUser(userName);
    if (!user) {
      throw new Error(`User ${userName} not found`);
    }
    
    return handler(cmdName, user, ...args);
  };
};

export function registerCommand(
  registry: CommandsRegistry,
  cmdName: string,
  handler: CommandHandler,
): void {
  registry[cmdName] = handler;
}

export async function runCommand(
  registry: CommandsRegistry,
  cmdName: string,
  ...args: string[]
): Promise<void> {
  const handler = registry[cmdName];
  if (!handler) {
    throw new Error(`Unknown command: ${cmdName}`);
  }

  handler(cmdName, ...args);
}
