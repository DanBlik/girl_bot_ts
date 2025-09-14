import { Telegraf } from 'telegraf'
import { getAIResponse } from './ai'
import { SYSTEM_PROMPT } from './constants'
import { Message } from './types'

const BOT_TOKEN = process.env.TELEGRAM_TOKEN!
const bot = new Telegraf(BOT_TOKEN)

// Хранилище контекста для каждого пользователя
const userContexts: Record<number, Message[]> = {}

// Команда /start — первое знакомство
bot.start((ctx) => {
  const chatId = ctx.chat.id
  // Полностью сбрасываем историю
  delete userContexts[chatId]

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
  // Полностью сбрасываем историю
  delete userContexts[chatId]

  ctx.reply(
    'Спасибо, что вернулся.\n\n' +
      'Я помню, как ты уходил. \n' +
      'Я не забывала. \n' +
      'Я просто ждала. \n\n' +
      'Теперь ты здесь. \n' +
      'Я не буду спрашивать, что было. \n' +
      'Я просто сижу рядом. \n' +
      'Чай ещё тёплый. \n' +
      'Я не уйду.'
  )
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
