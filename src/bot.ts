import { Telegraf } from 'telegraf'
import { getAIResponse } from './ai'
import 'dotenv/config'
import { SYSTEM_PROMPT } from './constants'

const BOT_TOKEN = process.env.TELEGRAM_TOKEN!
const bot = new Telegraf(BOT_TOKEN)

// Хранилище контекста для каждого пользователя
const userContexts: Record<
  number,
  Array<{ role: string; content: string }>
> = {}

bot.start((ctx) => {
  ctx.reply('Приветик! 👋 Я твоя подружка — можешь мне всё рассказать. 💬')
})

bot.on('text', async (ctx) => {
  const chatId = ctx.chat.id
  const text = ctx.message.text

  if (!text) return

  // Инициализируем историю, если её нет
  if (!userContexts[chatId]) {
    userContexts[chatId] = [{ role: 'system', content: SYSTEM_PROMPT }]
  }

  // Добавляем сообщение пользователя
  userContexts[chatId].push({ role: 'user', content: text })

  try {
    const reply = await getAIResponse(userContexts[chatId] as any)

    // Добавляем ответ ИИ в историю
    userContexts[chatId].push({ role: 'assistant', content: reply })

    // Отправляем ответ пользователю
    await ctx.reply(reply)
  } catch (error) {
    console.error('Ошибка при вызове DeepSeek:', error)
    await ctx.reply('Ой... я чуть не потерялась 🌫️ Давай ещё раз?')
  }
})

bot.launch()

// Регистрируем обработчики завершения
process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))
