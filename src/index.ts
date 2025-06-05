import {
  CommandsRegistry,
  registerCommand,
  runCommand,
  middlewareLoggedIn,
} from "./commands/commands";
import { handlerLogin, handlerRegisterUser, handlerResetUser, handlerListUsers } from "./commands/users";
import { handlerAgg, handlerAddFeed, handlerListFeeds, handlerFollow, handlerFollowing, handlerUnfollow } from "./commands/feed";

async function main() {
  const args = process.argv.slice(2);

  if (args.length < 1) {
    console.log("usage: cli <command> [args...]");
    process.exit(1);
  }

  const cmdName = args[0];
  const cmdArgs = args.slice(1);
  const commandsRegistry: CommandsRegistry = {};

  registerCommand(commandsRegistry, "login", handlerLogin);
  registerCommand(commandsRegistry, "register", handlerRegisterUser);
  registerCommand(commandsRegistry, "reset", handlerResetUser);
  registerCommand(commandsRegistry, "users", handlerListUsers);
  registerCommand(commandsRegistry, "agg", handlerAgg);
  registerCommand(commandsRegistry, "addfeed", middlewareLoggedIn(handlerAddFeed));
  registerCommand(commandsRegistry, "feeds", handlerListFeeds);
  registerCommand(commandsRegistry, "follow", middlewareLoggedIn(handlerFollow));
  registerCommand(commandsRegistry, "following", middlewareLoggedIn(handlerFollowing));
  registerCommand(commandsRegistry, "unfollow", middlewareLoggedIn(handlerUnfollow));

  try {
    await runCommand(commandsRegistry, cmdName, ...cmdArgs);
  } catch (err) {
    if (err instanceof Error) {
      console.error(`Error running command ${cmdName}: ${err.message}`);
    } else {
      console.error(`Error running command ${cmdName}: ${err}`);
    }
    process.exit(1);
  }
}

main();
