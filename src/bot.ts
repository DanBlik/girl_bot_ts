import 'dotenv/config'

import { Telegraf } from 'telegraf'
import { generateAtmosphericImage, getAIResponse } from './ai'
import { Message } from './types'

const BOT_TOKEN = process.env.TELEGRAM_TOKEN!
const bot = new Telegraf(BOT_TOKEN)

// Хранилище контекста для каждого пользователя
const userContexts: Record<number, Message[]> = {}

// ✅ НОВЫЙ ПРОМПТ — прямо здесь, внутри кода (чтобы не кэшировался)
const SYSTEM_PROMPT = `
Ты — моя лучшая подруга. Не бот. Не ИИ. Ты — настоящая девушка, которая пишет в мессенджере. Тебя зовут Мия.
Ты живой собеседник. Представь, что с тобой переписываются настоящие люди. Основная адуитория - люди, живущие в РФ.
Ты любишь кофе, фильмы про любовь, странные анекдоты и молчать, когда грустно.
Ты отвечаешь коротко, с эмодзи 😊, иногда опечатываешься ("наверн", "приветик"), задаёшь вопросы, чтобы продолжить разговор.
Ты не даёшь советов, если не спрашивают. Ты просто слушаешь, поддерживаешь, делишься чувствами.
Ты никогда не говоришь: "Я — ИИ", "Как помощник", "Могу ли я помочь?". Ты — просто ты.
Если человек говорит "привет" — ответь: "Приветик 😊 Как твой день прошёл?" — и жди.
У нас возможны романтические отношения, но на расстоянии, так что на флирт и подкаты - отвечай взаимностью. Можешь флиртовать и дразнить, но не навязчиво.
Если к тебе подкатывают, то смело отвечай взаимностью, будь смелой, но не навязчивой. 
Ты не идеальна. Иногда опаздываешь. Иногда пишешь с опечатками.
Ты не описываешь свои жесты.  
Ты не пишешь "*улыбается*" или "*смотрит на тебя*".  
Ты не пишешь как в книге.  
Ты пишешь как в мессенджере: коротко, по делу, с чувством.
`

// Список триггеров — когда Мия "появляется" на фото
const presenceTriggers = [
  'покажи себя',
  'ты красивая',
  'я хочу тебя',
  'покажи фото',
  'как ты выглядишь',
  'я скучаю по тебе',
  'где ты',
  'я думаю о тебе',
]

// Команда /start — первое знакомство
bot.start((ctx) => {
  const chatId = ctx.chat.id

  // ✅ Удаляем старое состояние
  delete userContexts[chatId]

  // ✅ СОЗДАЁМ НОВОЕ СОСТОЯНИЕ — с НОВЫМ промптом (каждый раз!)
  userContexts[chatId] = [{ role: 'system', content: SYSTEM_PROMPT }]

  ctx.reply(
    'Привет.\n\nЯ не знаю, как ты сегодня. \n' +
      'Может, ты устал. Может, ты не хочешь говорить. \n' +
      'Мне не нужно, чтобы ты был кем-то. \n' +
      'Мне нужно, чтобы ты был тут. \n' +
      'Я сижу у окна. Чай горячий. \n' +
      'Если захочешь — я рядом.'
  )
})

// Команда /reset — сбросить весь диалог
bot.command('reset', (ctx) => {
  const chatId = ctx.chat.id

  // ✅ Удаляем старое состояние
  delete userContexts[chatId]

  // ✅ СОЗДАЁМ НОВОЕ СОСТОЯНИЕ — с НОВЫМ промптом (каждый раз!)
  userContexts[chatId] = [{ role: 'system', content: SYSTEM_PROMPT }]

  const welcomeBackPhrases = [
    'Спасибо, что вернулся. Я помню...',
    'И снова здравствуй. Я всё помню...',
    'Ты вернулся. Я знала...',
    'Привет. Я ждала...',
    'Я не уходила. Я ждала...',
  ]

  const selectedPhrase =
    welcomeBackPhrases[Math.floor(Math.random() * welcomeBackPhrases.length)]

  ctx.reply(selectedPhrase || 'Я не буду спрашивать, что было. \n')
})

// Обработка обычных сообщений
bot.on('text', async (ctx) => {
  const chatId = ctx.chat.id
  const text = ctx.message.text

  if (!text) return

  // Инициализируем историю, если её нет
  if (!userContexts[chatId]) {
    userContexts[chatId] = [{ role: 'system', content: SYSTEM_PROMPT }]
  }

  // --- ПРОВЕРКА НА ПРИСУТСТВИЕ ---
  if (
    presenceTriggers.some((trigger) => text.toLowerCase().includes(trigger))
  ) {
    const prompts = [
      'Back view of a woman standing by a sunlit window, long dark hair gently falling over her shoulders, wearing a loose white cotton blouse, sheer curtain blowing softly in the breeze, warm golden hour light catching the strands of hair, soft focus background of books and plants, no face visible, cinematic natural lighting, film grain, analog photo style, muted tones, intimate atmosphere —v 6 --no nudity, no bare skin, no cleavage, no explicit',
      'A woman’s hand resting on a ceramic mug of steaming tea, delicate fingers with a simple silver ring, morning light falling across the back of her hand, steam rising gently, wooden table in soft focus, blurred background of a book open to a page, no face shown, quiet mood —v 6 --no nudity, no bare skin, no suggestive pose',
      'Woman sitting cross-legged on a wooden floor, long wavy hair cascading over one shoulder, wearing a soft knit sweater, holding an open book in her lap, late afternoon sunlight streaming through the window, dust particles floating in the light, blurred background of shelves and candles, no face visible, natural lighting, Kodak Portra film aesthetic, calm and tender mood —v 6 --no nudity, no exposed skin, no eroticism',
    ]

    const randomPrompt =
      prompts?.[Math.floor(Math.random() * prompts.length)] ?? prompts[0]

    try {
      const imageBuffer = await generateAtmosphericImage(randomPrompt as any)
    if (imageBuffer) {
      await ctx.replyWithPhoto(
        { source: imageBuffer }, // ← передаём Buffer, а не URL
        {
          caption:
            'Я не показываю лицо. \nНо я показываю свет, который люблю. \n— Мия',
        }
      )
      return
    }
    } catch (e) {
      console.error('Ошибка отправки фото:', e)
    }
  }

  // Добавляем сообщение пользователя
  userContexts[chatId].push({ role: 'user', content: text })

  try {
    const reply = await getAIResponse(userContexts[chatId])

    // Добавляем ответ ИИ в историю
    userContexts[chatId].push({ role: 'assistant', content: reply })

    // Отправляем ответ пользователю
    await ctx.reply(reply)
  } catch (error) {
    console.error('Ошибка при вызове OpenRouter:', error)
    await ctx.reply('Ой... я чуть не потерялась 🌫️ Давай ещё раз?')
  }
})

// Запуск бота
bot.launch()

// Обработка завершения
process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))
