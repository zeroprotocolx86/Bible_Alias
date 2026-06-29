# Налаштування та запуск

## Локальний запуск

Просто відкрийте `index.html` у браузері. Все працює одразу.

## Деплой на Netlify

1. Зайдіть на https://app.netlify.com
2. Натисніть **Add new site** → **Import an existing project**
3. Підключіть GitHub і виберіть репозиторій
4. Налаштування підтягнуться з `netlify.toml` автоматично
5. Натисніть **Deploy**

## Telegram Bot

### Створення бота

1. Відкрийте [@BotFather](https://t.me/BotFather)
2. `/newbot` — задайте ім'я та username

### Налаштування Mini App

У BotFather:
- `/mybots` → ваш бот → **Bot Settings** → **Domain** → введіть:
  ```
  bible-alias.netlify.app
  ```
- `/mybots` → ваш бот → **Bot Settings** → **Menu Button** → введіть:
  ```
  https://bible-alias.netlify.app
  ```

### Webhook для команди /start

1. На Netlify додайте змінну оточення:
   - **Site settings** → **Environment variables** → **Add a variable**
   - Key: `BOT_TOKEN`
   - Value: токен від BotFather

2. Відкрийте в браузері:
   ```
   https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://bible-alias.netlify.app/.netlify/functions/telegram-bot
   ```
   Замість `<TOKEN>` підставте токен бота.

3. Має прийти відповідь:
   `{"ok":true,"result":true,"description":"Webhook was set"}`

### Іконка та опис

У BotFather:
- `/setuserpic` — завантажте `assets/icons/icon.png`
- `/setdescription` — вставте опис гри

## База слів

Файли JSON у папці `data/`. Щоб додати нові слова або категорії:
1. Відредагуйте відповідний JSON
2. Закомітьте та запуште
3. Netlify передеплоїть сайт автоматично

## Структура проекту

```
AliasFinal/
├── assets/icons/       # Іконки
├── css/                # Стилі
├── data/               # JSON зі словами
├── js/                 # Скрипти
├── netlify/functions/  # Функції для Telegram бота
├── netlify.toml        # Конфіг Netlify
└── index.html          # Головна сторінка
```
