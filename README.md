# ME_AnonBot

ME_AnonBot is a Discord bot designed for roleplay communities, allowing users to create anonymous handles and interact with other players in a designated dark web channel. Users can send messages under their custom aliases, enhancing the immersive experience of roleplaying.

## Features

- **Create Anonymous Handles**: Users can create custom anonymous IDs (e.g., `anon1234`) to interact without revealing their actual usernames.
- **Send Anonymous Messages**: Users can send messages in the dark web channel under their chosen handle.
- **User-Friendly Commands**: Easily create and manage your anonymous identity using slash commands.

## Commands

### `/create`

Create a custom anonymous handle.

- **Options**:
  - `handle` (string): The custom handle you want to use (required).

### Example Usage

1. To create an anonymous handle, type:
   ```
   /create <custom-anon-handle>
   ```
2. To send an anonymous message, type:
   ```
   !anon <Your message here>
   ```

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (version 16 or higher)
- [MongoDB](https://www.mongodb.com/) (for storing user handles)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/SahilThete/ME_AnonBot.git
   ```

2. Navigate to the project directory:
   ```bash
   cd ME_AnonBot
   ```

3. Install the required packages:
   ```bash
   npm install
   ```

4. Create a `.env` file in the project root directory and add your Discord bot token and MongoDB URI:
   ```
   BOT_TOKEN=YOUR_DISCORD_BOT_TOKEN
   MONGODB_URI=YOUR_MONGODB_URI
   ```

### Running the Bot

To start the bot, run the following command:
```bash
node bot.js
```

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Discord.js](https://discord.js.org/) for providing a powerful framework for interacting with the Discord API.
- [MongoDB](https://www.mongodb.com/) for the database support.