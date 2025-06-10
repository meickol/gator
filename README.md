# Gator - RSS Feed Aggregator

A command-line RSS feed aggregator built with TypeScript, Node.js, and PostgreSQL. Gator allows you to manage RSS feeds, follow your favorite sources, and browse the latest posts from all your subscriptions in one place.

## Features

- 🔗 **Add RSS Feeds**: Add RSS feeds with custom names
- 👥 **User Management**: Multi-user support with user registration
- 📰 **Feed Following**: Follow and unfollow RSS feeds
- 📖 **Browse Posts**: View latest posts from your followed feeds
- 🔄 **Auto-Aggregation**: Automatically fetch new posts at regular intervals
- 📊 **Feed Management**: List all available feeds and your subscriptions

## Prerequisites

- Node.js (v18 or higher)
- PostgreSQL database
- npm or yarn

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd gator
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up your PostgreSQL database**
   ```bash
   # Create a database (adjust connection details as needed)
   createdb gator_db
   ```

4. **Configure the application**
   
   Create a configuration file at `~/.gatorconfig.json`:
   ```json
   {
     "db_url": "postgresql://username:password@localhost:5432/gator_db?sslmode=disable",
     "current_user_name": "your_username"
   }
   ```

5. **Run database migrations**
   ```bash
   npm run migrate
   ```

6. **Build the project**
   ```bash
   npm run build
   ```

## Configuration

The application uses a JSON configuration file located at `~/.gatorconfig.json`:

```json
{
  "db_url": "postgresql://username:password@localhost:5432/database_name?sslmode=disable",
  "current_user_name": "your_username"
}
```

### Configuration Fields

- `db_url`: PostgreSQL connection string
- `current_user_name`: Your username for the application

## Usage

All commands are run using:
```bash
npm start <command> [arguments]
```

### User Management

**Register a new user:**
```bash
npm start register <username>
```

**Login (set current user):**
```bash
npm start login <username>
```

### Feed Management

**Add a new RSS feed:**
```bash
npm start addfeed <feed_name> <feed_url>
```
Example:
```bash
npm start addfeed "Tech News" "https://example.com/rss.xml"
```

**List all available feeds:**
```bash
npm start feeds
```

**Follow an existing feed:**
```bash
npm start follow <feed_url>
```

**Unfollow a feed:**
```bash
npm start unfollow <feed_url>
```

**List feeds you're following:**
```bash
npm start following
```

### Browsing Posts

**Browse latest posts from your followed feeds:**
```bash
npm start browse [limit]
```

Examples:
```bash
npm start browse          # Shows 2 latest posts (default)
npm start browse 10       # Shows 10 latest posts
npm start browse 25       # Shows 25 latest posts
```

### Aggregation

**Start the feed aggregator (automatically fetch new posts):**
```bash
npm start agg <time_interval>
```

Time intervals can be specified as:
- `30s` - 30 seconds
- `5m` - 5 minutes  
- `1h` - 1 hour
- `2h` - 2 hours

Example:
```bash
npm start agg 10m         # Fetch feeds every 10 minutes
```

Press `Ctrl+C` to stop the aggregator.

## Database Schema

The application uses the following main tables:

- **users**: Store user information
- **feeds**: RSS feed definitions
- **posts**: Individual RSS items/posts
- **feed_follows**: Track which users follow which feeds

## Development

### Available Scripts

```bash
npm run generate         # Generate new database migrations
npm run migrate         # Apply database migrations
npm start              # Run the application
```

### Project Structure

```
src/
├── commands/           # Command handlers
│   └── feed.ts        # Feed-related commands
├── config.ts          # Configuration management
├── index.ts           # Main application entry point
└── lib/
    └── db/
        ├── index.ts       # Database connection
        ├── schema.ts      # Database schema definitions
        ├── migrations/    # Database migration files
        └── queries/       # Database query functions
```

## Examples

### Typical Workflow

1. **Register and login:**
   ```bash
   npm start register alice
   npm start login alice
   ```

2. **Add some feeds:**
   ```bash
   npm start addfeed "Hacker News" "https://hnrss.org/frontpage"
   npm start addfeed "Dev Blog" "https://blog.example.com/rss"
   ```

3. **Follow feeds (happens automatically when you add them):**
   ```bash
   npm start following
   ```

4. **Start aggregating posts:**
   ```bash
   npm start agg 30m
   ```
   
5. **In another terminal, browse posts:**
   ```bash
   npm start browse 5
   ```

## Troubleshooting

### Database Connection Issues

If you get "relation does not exist" errors:
```bash
# Reset and reapply migrations
npm run migrate
```

### Configuration Issues

Make sure your `~/.gatorconfig.json` file exists and has the correct format:
```bash
cat ~/.gatorconfig.json
```

### Permission Issues

Ensure your PostgreSQL user has the necessary permissions:
```sql
GRANT ALL PRIVILEGES ON DATABASE gator_db TO your_username;
```


## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

If you encounter any issues or have questions, please open an issue on GitHub. 