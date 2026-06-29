const TOKEN = process.env.BOT_TOKEN;
const SITE_URL = process.env.SITE_URL || process.env.URL || 'https://your-site.netlify.app';

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 200, body: 'OK' };
  }

  const body = JSON.parse(event.body);

  if (body?.ok !== undefined) {
    return { statusCode: 200, body: 'OK' };
  }

  const chatId = body?.message?.chat?.id;
  const text = body?.message?.text || '';

  if (text === '/start') {
    const reply = {
      chat_id: chatId,
      text: '🕊 Ласкаво просимо до Bible Alias!\n\nНатисніть кнопку нижче, щоб відкрити гру. Пояснюйте слова своїй команді, набирайте бали та веселіться!\n\n✍️ Автор: Дячук Андрій\n💬 Пропозиції та правки: @Andriy55443',
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: '🎮 Відкрити гру',
              web_app: { url: SITE_URL }
            }
          ],
          [
            {
              text: '🌐 Відкрити в браузері',
              url: SITE_URL
            }
          ],
          [
            {
              text: '✍️ Зв\'язок з автором',
              url: 'https://t.me/Andriy55443'
            }
          ]
        ]
      }
    };

    await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reply)
    });
  }

  return { statusCode: 200, body: 'OK' };
};
