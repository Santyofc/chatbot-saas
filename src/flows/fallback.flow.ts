import { addKeyword, utils } from '@builderbot/bot'
import { BaileysProvider as Provider } from '@builderbot/provider-baileys'
import { JsonFileDB as Database } from '@builderbot/database-json'
import { IntentRouter, ConversationManager } from '../utils/intent-router'
import { mainConversationFlow } from './main-conversation.flow'

export const fallbackFlow = addKeyword<Provider, Database>(utils.setEvent('FALLBACK'))
    .addAction(async (ctx, { flowDynamic, state, gotoFlow }) => {
        const userMessage = ctx.body.trim()
        const currentState = await ConversationManager.getState(ctx, { state })

        // Intentar detectar intención incluso en fallback
        const detectedIntent = IntentRouter.detectIntent(userMessage)

        if (detectedIntent) {
            // Si detectamos intención, procesarla normalmente
            await ConversationManager.updateState(ctx, { state }, {
                currentIntent: detectedIntent,
                currentStep: 'intent_detected_from_fallback'
            })

            return gotoFlow(mainConversationFlow)
        }

        // Fallbacks inteligentes basados en contexto
        if (currentState.currentIntent) {
            await handleContextualFallback(ctx, { flowDynamic, state }, currentState)
        } else {
            await handleGeneralFallback(ctx, { flowDynamic, state }, currentState)
        }

        // Siempre redirigir al flow principal para continuar conversación
        return gotoFlow(mainConversationFlow)
    })

async function handleContextualFallback(ctx: any, { flowDynamic, state }: any, currentState: any) {
    const userMessage = ctx.body.trim().toLowerCase()

    switch (currentState.currentIntent) {
        case 'web':
            await flowDynamic([
                'Para desarrollo web, necesito saber más detalles.',
                '¿Quieres una landing page, un sitio corporativo, o una tienda online?',
                'O si prefieres, dime qué tipo de página imaginas.'
            ])
            break

        case 'info':
            await flowDynamic([
                'Zona Sur Tech ofrece desarrollo web, automatización, soporte y ayuda con facturación.',
                'Si quieres, dime cuál de esas áreas te interesa y te guío.'
            ])
            break

        case 'support':
            if (currentState.isWaitingForSupportIssue) {
                await flowDynamic([
                    'Cuéntame mejor qué problema tienes.',
                    'Por ejemplo: "no puedo acceder", "error al guardar", "no funciona la app", etc.'
                ])
            } else if (currentState.isWaitingForName) {
                await flowDynamic([
                    '¿Me puedes decir tu nombre para registrar el ticket?',
                    'O si prefieres, puedo usar "Usuario anónimo".'
                ])
            } else {
                await flowDynamic([
                    'Para soporte técnico, necesito más información.',
                    '¿Qué está pasando exactamente? ¿En qué parte del sistema?'
                ])
            }
            break

        case 'billing':
            await flowDynamic([
                'Para temas de facturación, dime específicamente:',
                '• ¿Problema con factura electrónica?',
                '• ¿Consulta sobre comprobantes?',
                '• ¿Duda administrativa?',
                'O cuéntame libremente qué necesitas.'
            ])
            break

        case 'automation':
            await flowDynamic([
                'Para automatización, me ayuda saber:',
                '¿Qué procesos quieres automatizar? (ventas, soporte, marketing, etc.)'
            ])
            break

        default:
            await flowDynamic([
                'No entendí bien esa respuesta.',
                '¿Puedes darme más detalles sobre lo que necesitas?'
            ])
    }
}

async function handleGeneralFallback(ctx: any, { flowDynamic, state }: any, currentState: any) {
    const userMessage = ctx.body.trim().toLowerCase()

    // Intentar interpretar frases comunes
    if (userMessage.includes('?') || userMessage.includes('como') || userMessage.includes('que')) {
        await flowDynamic([
            'Buena pregunta. Te ayudo con eso.',
            '¿Me das más contexto? Por ejemplo, qué específicamente quieres saber.'
        ])
    } else if (userMessage.length < 3) {
        await flowDynamic([
            'Hmm, ese mensaje es muy corto.',
            '¿Puedes escribir un poco más para entenderte mejor?'
        ])
    } else if (userMessage.includes('no') || userMessage.includes('nada')) {
        await flowDynamic([
            'Entendido. Si necesitas algo después, solo escribe "hola" o "menu".',
            '¡Que tengas un buen día!'
        ])
    } else {
        // Fallback general pero conversacional
        const responses = [
            [
                'No estoy seguro de entender exactamente.',
                'Puedo ayudarte con desarrollo web, automatización, facturación o soporte.',
                '¿Qué de estos temas te interesa?'
            ],
            [
                'Hmm, déjame ver si te entiendo bien.',
                '¿Puedes decirlo de otra forma? O si prefieres, escribe "menu" para ver todas las opciones.'
            ],
            [
                'Creo que no capté bien tu mensaje.',
                '¿Me lo puedes explicar diferente? Estoy aquí para ayudarte. 😊'
            ]
        ]

        const randomResponse = responses[Math.floor(Math.random() * responses.length)]
        await flowDynamic(randomResponse)
    }
}
