import { setUser } from "../config";
import { createUser, getUser, resetUser } from "../lib/db/queries/users";

export async function handlerLogin(cmdName: string, ...args: string[]): Promise<void> {
  if (args.length !== 1) {
    throw new Error(`usage: ${cmdName} <name>`);
  }

  // check if user exists
  const user = await getUser(args[0]);
  if (!user) {
    throw new Error(`User ${args[0]} does not exist`);
  }

  const userName = args[0];
  setUser(userName);
  console.log("User switched successfully!");
  process.exit(0);
}


export async function handlerRegisterUser(cmdName: string, ...args: string[]): Promise<void> {
  if (args.length !== 1) {
    throw new Error(`usage: ${cmdName} <name>`);
  }

  // check if user already exists
  const user = await getUser(args[0]);
  if (user) {
    throw new Error(`User ${user.name} already exists`);
  }

  const userName = args[0];
  try {
    await createUser(userName);
    setUser(userName);
    console.log(`User ${userName} registered successfully!`);
    process.exit(0);
  } catch (error) {
    throw error;
  }
  
}

// Delete all users from table users
export async function handlerResetUser(cmdName: string): Promise<void> {
 

  await resetUser();
  console.log("User reset successfully!");
  process.exit(0);
}