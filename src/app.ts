import 'dotenv/config'
import { createBot, createProvider, createFlow } from '@builderbot/bot'
import { JsonFileDB as Database } from '@builderbot/database-json'
import { BaileysProvider as Provider } from '@builderbot/provider-baileys'
import { entryFlow, greetingFlow } from './flows/entry.flow'
import { mainConversationFlow } from './flows/main-conversation.flow'
import { fallbackFlow } from './flows/fallback.flow'

const PORT = process.env.PORT ?? 3008

const main = async () => {
    try {
        const adapterFlow = createFlow([
            entryFlow,
            greetingFlow,
            mainConversationFlow,
            fallbackFlow,
        ])
        
        // If you experience AUTH issues, check the latest WhatsApp version at:
        // https://wppconnect.io/whatsapp-versions/
        // Example: version "2.3000.1035824857-alpha" -> [2, 3000, 1035824857]
        const adapterProvider = createProvider(Provider, {
            version: [2, 3000, 1035824857],
        })

        console.log('🔌 Using JSON file database...')
        const adapterDB = new Database()

        console.log('✅ JSON file database initialized')

        const botInstance = await createBot({
            flow: adapterFlow,
            provider: adapterProvider,
            database: adapterDB,
        })

        const { handleCtx, httpServer } = botInstance
        
        console.log('✅ Bot initialized successfully')

    /**
     * POST /v1/messages - Send message to user
     */
    adapterProvider.server.post(
        '/v1/messages',
        handleCtx(async (bot, req, res) => {
            const { number, message, urlMedia } = req.body

            if (!number || !message) {
                res.writeHead(400, { 'Content-Type': 'application/json' })
                return res.end(JSON.stringify({ status: 'error', message: 'number and message required' }))
            }

            await bot.sendMessage(number, message, { media: urlMedia ?? null })
            res.writeHead(200, { 'Content-Type': 'application/json' })
            return res.end(JSON.stringify({ status: 'sent', number }))
        })
    )

    /**
     * POST /v1/blacklist - Manage blacklist
     */
    adapterProvider.server.post(
        '/v1/blacklist',
        handleCtx(async (bot, req, res) => {
            const { number, intent } = req.body

            if (!number || !intent) {
                res.writeHead(400, { 'Content-Type': 'application/json' })
                return res.end(JSON.stringify({ status: 'error', message: 'number and intent required' }))
            }

            if (intent === 'remove') bot.blacklist.remove(number)
            if (intent === 'add') bot.blacklist.add(number)

            res.writeHead(200, { 'Content-Type': 'application/json' })
            return res.end(JSON.stringify({ status: 'ok', number, intent }))
        })
    )

    /**
     * GET /v1/blacklist/list - Get blacklist
     */
    adapterProvider.server.get(
        '/v1/blacklist/list',
        handleCtx(async (bot, req, res) => {
            const blacklist = bot.blacklist.getList()
            res.writeHead(200, { 'Content-Type': 'application/json' })
            return res.end(JSON.stringify({ status: 'ok', blacklist }))
        })
    )

        httpServer(+PORT)
        console.log(`✅ Bot running on port ${PORT}`)
    } catch (error) {
        console.error('❌ Error starting bot:', error instanceof Error ? error.message : error)
        process.exit(1)
    }
}

main()
