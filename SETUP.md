# Setup & Configuration

## Local Development

Open `index.html` in a browser. No server required.

## Deploy to Netlify

1. Go to https://app.netlify.com
2. Click **Add new site** → **Import an existing project**
3. Connect GitHub and select your repository
4. Settings are auto-detected from `netlify.toml`
5. Click **Deploy**

## Telegram Bot

### Create a Bot

1. Open [@BotFather](https://t.me/BotFather)
2. `/newbot` — choose name and username

### Set Environment Variables

In Netlify **Site settings** → **Environment variables** → **Add a variable**:
- `BOT_TOKEN` — your bot token from BotFather
- `SITE_URL` — your site URL, e.g. `https://your-app.netlify.app` (optional, falls back to `URL` env var)

### Configure Mini App

In BotFather:
- `/mybots` → your bot → **Bot Settings** → **Domain** → enter your site domain:
  ```
  your-app.netlify.app
  ```
- `/mybots` → your bot → **Bot Settings** → **Menu Button** → enter:
  ```
  https://your-app.netlify.app
  ```

### Set Webhook

Open in browser:
```
https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://your-app.netlify.app/.netlify/functions/telegram-bot
```
Replace `<TOKEN>` with your bot token from BotFather.

Expected response:
`{"ok":true,"result":true,"description":"Webhook was set"}`

### Icon & Description

In BotFather:
- `/setuserpic` — upload `assets/icons/icon.png`
- `/setdescription` — paste game description

## Word Database

JSON files in `data/`. To add words or categories:
1. Edit the corresponding JSON
2. Commit and push
3. Netlify auto-deploys

## Project Structure

```
├── assets/icons/       # Icons
├── css/                # Styles
├── data/               # Word JSON files
├── js/                 # Scripts
├── netlify/functions/  # Telegram bot webhook
├── netlify.toml        # Netlify config
└── index.html          # Entry point
```
