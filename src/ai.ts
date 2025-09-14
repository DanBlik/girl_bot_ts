import axios from 'axios'

interface Message {
  role: 'system' | 'user' | 'assistant'
  content: string
}

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY
const OPENROUTER_API_MODEL_NAME = process.env.OPENROUTER_API_MODEL_NAME
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'

export async function getAIResponse(messages: Message[]): Promise<string> {
  if (!OPENROUTER_API_KEY) {
    throw new Error('OPENROUTER_API_KEY не установлен!')
  }

  let lastError: any

  try {
    const response = await axios.post(
      OPENROUTER_URL,
      {
        // model: 'deepseek/deepseek-chat-v3.1:free', // ← ВАЖНО: именно так пишется имя модели!
        model: OPENROUTER_API_MODEL_NAME, // ← ВАЖНО: именно так пишется имя модели!
        messages,
        temperature: 0.8,
        max_tokens: 500,
      },
      {
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          'HTTP-Referer': 'girlbotts-production.up.railway.app', // обязательно
          'X-Title': 'GirlFriendBot',
          'Content-Type': 'application/json',
        },
      }
    )

    let reply = response.data.choices[0]?.message?.content || ''

    // Убираем стандартные "защитные" фразы, которые модель может добавить
    reply = reply
      .replace(
        /^(?:\s*)?(Как помощник|Я не могу|Я не одобряю|Рекомендую|Служба поддержки)/i,
        ''
      )
      .trim()

    // Если ответ стал пустым — возвращаем "молчание"
    if (!reply || reply.length < 5) {
      return 'Я тут. \n\nНе уйду.'
    }

    return reply
  } catch (error: any) {
    lastError = error

    // Если 401 — ключ неверный
    if (error.response?.status === 401) {
      console.error(
        '🛑 Неверный API ключ! Проверь OPENROUTER_API_KEY в Railway.'
      )
      return 'Неверный API ключ! Проверь OPENROUTER_API_KEY в Railway.'
    }

    // Если 404 — модель не найдена
    if (error.response?.status === 404) {
      console.error('🔍 Модель не найдена. Проверь имя: в Referer')
      return '🔍 Модель не найдена. Проверь имя: в Referer'
    }

    return 'Ой... я чуть не потерялась 🌫️ Давай ещё раз?'
  }
}
