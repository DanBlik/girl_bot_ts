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

export async function generateAtmosphericImage(
  prompt: string
): Promise<string> {
  console.log('🔍 Генерация фото запущена...')
  console.log('📝 Промпт:', prompt)

  if (!HF_TOKEN) {
    console.error('❌ HF_TOKEN не установлен!')
    return ''
  }

  console.log('✅ HF_TOKEN найден')

  try {
    console.log('📡 Отправка запроса на FAL Router...')

    const response = await fetch(
      'https://router.huggingface.co/fal-ai/fal-ai/hunyuan-image/v2.1/text-to-image',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${HF_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sync_mode: true,
          prompt: prompt,
          num_inference_steps: 40,
          guidance_scale: 7.5,
          negative_prompt:
            'nudity, explicit, bare skin, cleavage, sexual content, text, watermark, logo, cartoon, anime, deformed, low quality, blurry, bad anatomy',
          width: 1024,
          height: 1024,
          seed: Math.floor(Math.random() * 1000000),
        }),
      }
    )

    console.log('📡 Получен ответ:', response.status, response.statusText)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('🔴 Ошибка от FAL Router:', response.status, errorText)
      return ''
    }

    console.log('📥 Получаем данные как ArrayBuffer...')
    const arrayBuffer = await response.arrayBuffer()
    console.log(
      '✅ ArrayBuffer получен, размер:',
      arrayBuffer.byteLength,
      'байт'
    )

    const buffer = Buffer.from(arrayBuffer)
    const base64Image = buffer.toString('base64')
    console.log(
      '📸 Изображение преобразовано в base64, длина:',
      base64Image.length,
      'символов'
    )

    return `image/jpeg;base64,${base64Image}`
  } catch (error: any) {
    console.error('🔴 Критическая ошибка при генерации фото:', error.message)
    console.error('🐞 Стек ошибки:', error.stack)
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
