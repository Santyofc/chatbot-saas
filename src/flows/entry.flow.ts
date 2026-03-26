import { addKeyword } from '@builderbot/bot'
import { BaileysProvider as Provider } from '@builderbot/provider-baileys'
import { JsonFileDB as Database } from '@builderbot/database-json'
import { mainConversationFlow } from './main-conversation.flow'

// Flow de entrada que captura cualquier mensaje
export const entryFlow = addKeyword<Provider, Database>('')
    .addAction(async (ctx, { gotoFlow, state }) => {
        // Cualquier mensaje que llegue, lo procesamos en el flow conversacional
        return gotoFlow(mainConversationFlow)
    })

// Flow específico para saludos iniciales
export const greetingFlow = addKeyword<Provider, Database>(['hola', 'hi', 'hello', 'buenas', 'hey'])
    .addAction(async (ctx, { gotoFlow, state, flowDynamic }) => {
        // Verificar si es primera interacción
        const currentState = state.getMyState() || {}

        if (!currentState.userName && !currentState.lastInteractionAt) {
            // Primera vez que saluda
            await flowDynamic([
                '¡Hola! 👋',
                'Soy el asistente de Zona Sur Tech.',
                '¿En qué te puedo ayudar hoy?'
            ])
        } else {
            // Ya ha interactuado antes
            const userName = currentState.userName || ''
            const greeting = userName ? `¡Hola de nuevo ${userName}!` : '¡Hola otra vez!'

            await flowDynamic([
                greeting,
                '¿En qué más te puedo ayudar?'
            ])
        }

        // Redirigir al flow conversacional principal
        return gotoFlow(mainConversationFlow)
    })