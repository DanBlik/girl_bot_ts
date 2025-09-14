import axios from 'axios'

interface Message {
  role: 'system' | 'user' | 'assistant'
  content: string
}

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY
const DEEPSEEK_URL = 'https://api.deepseek.com/v1/chat/completions'

export async function getAIResponse(messages: Message[]): Promise<string> {
  if (!DEEPSEEK_API_KEY) {
    throw new Error('DEEPSEEK_API_KEY не установлен!')
  }

  try {
    const response = await axios.post(
      DEEPSEEK_URL,
      {
        model: 'deepseek-chat',
        messages,
        temperature: 0.8,
        max_tokens: 500,
      },
      {
        headers: {
          Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    )

    return response.data.choices[0].message.content || '...'
  } catch (error: any) {
    console.error('DeepSeek API error:', error.response?.data || error.message)
    return 'Извини, я сейчас немного засомневалась... 🤔'
  }
}
