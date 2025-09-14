import axios from 'axios'

interface Message {
  role: 'system' | 'user' | 'assistant'
  content: string
}

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'

export async function getAIResponse(messages: Message[]): Promise<string> {
  if (!OPENROUTER_API_KEY) {
    throw new Error('OPENROUTER_API_KEY не установлен!')
  }

  try {
    const response = await axios.post(
      OPENROUTER_URL,
      {
        //
        // model: 'deepseek-ai/deepseek-chat', // ← ВАЖНО: именно так пишется имя модели!
        model: 'deepseek/deepseek-chat-v3.1:free',
        messages,
        temperature: 0.8,
        max_tokens: 500,
      },
      {
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          'HTTP-Referer': 'girlbotts-production.up.railway.app', // обязательно, даже если просто тест
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
    console.error('OpenRouter error:', error.response?.data || error.message)
    return 'Извини, я чуть не потерялась... 🌫️ Попробуй ещё раз?'
  }
}
