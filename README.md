# tcleaner

Discord bot that spots tracking parameters in posted links, deletes the message, and reposts it with clean links and a mention of the original author.

## Discord setup

1. Create an application at <https://discord.com/developers/applications> and add a bot.
2. Under **Bot**, enable the **Message Content Intent**.
3. Invite it with the `bot` scope and these permissions: View Channels, Send Messages, Read Message History, Embed Links, Manage Messages.

Manage Messages is needed to delete the original. Without it, or when a message cannot be reposted (stickers, polls, attachments too large, or no room for the mention), the bot replies with the clean links instead.

## Run

Needs Node 20.12 or newer.

```sh
npm install
echo "DISCORD_TOKEN=your-bot-token" > .env
npm start
```

## Deploy with systemd

```sh
sudo useradd --system --home /opt/tcleaner tcleaner
sudo cp -r . /opt/tcleaner && sudo chown -R tcleaner: /opt/tcleaner
sudo chmod 600 /opt/tcleaner/.env
sudo cp deploy/tcleaner.service /etc/systemd/system/
sudo systemctl enable --now tcleaner
journalctl -u tcleaner -f
```

Adjust `ExecStart` in the unit if `node` is not at `/usr/bin/node`.

## Rules

- `data/clearurls.json` is the [ClearURLs](https://docs.clearurls.xyz/) rule set (LGPL-3.0). Refresh it with `npm run update-rules`.
- `data/extra.json` holds additional rules in the same format, such as `x.com`.
