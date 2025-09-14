import axios from 'axios'
import { InferenceClient } from '@huggingface/inference'

interface Message {
  role: 'system' | 'user' | 'assistant'
  content: string
}

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY
const OPENROUTER_API_MODEL_NAME = process.env.OPENROUTER_API_MODEL_NAME
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'

const HF_TOKEN = process.env.HF_API_KEY
const client = new InferenceClient(HF_TOKEN)

export async function generateAtmosphericImage(
  prompt: string
): Promise<string> {
  if (!HF_TOKEN) {
    console.error('❌ HF_TOKEN не установлен!')
    return ''
  }

  try {
    // Используем SD3-Medium — лучшая модель для эстетики
    const image = await client.textToImage({
      provider: 'auto', // автоматически выберет оптимальный провайдер
      model: 'stabilityai/stable-diffusion-3-medium',
      inputs: prompt,
      parameters: {
        num_inference_steps: 40, // качество: выше — лучше, но медленнее
        guidance_scale: 7.5, // баланс между креативностью и точностью
        negative_prompt:
          'nudity, explicit, bare skin, cleavage, sexual content, text, watermark, logo, cartoon, anime, deformed, low quality, blurry, bad anatomy',
        width: 1024,
        height: 1024,
        seed: Math.floor(Math.random() * 1000000), // чтобы каждый раз было немного по-разному
      },
    })

    // Преобразуем ArrayBuffer в base64
    const buffer = Buffer.from(image)
    const base64Image = buffer.toString('base64')

    return `image/jpeg;base64,${base64Image}`
  } catch (error: any) {
    console.error('🔴 Ошибка генерации фото через SD3-Medium:', error.message)
    return ''
  }
}

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
        temperature: 0.9,
        max_tokens: 160,
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
