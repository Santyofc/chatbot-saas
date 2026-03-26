import { BaileysProvider as Provider } from '@builderbot/provider-baileys'
import { JsonFileDB as Database } from '@builderbot/database-json'

export interface ConversationState {
    currentIntent?: string
    currentStep?: string
    collectedData?: Record<string, any>
    lastMenuShownAt?: number
    isWaitingForSupportIssue?: boolean
    isWaitingForName?: boolean
    isWaitingForClarification?: boolean
    lastInteractionAt?: number
    userName?: string
    conversationHistory?: string[]
}

export class IntentRouter {
    private static readonly INTENT_PATTERNS = {
        // Saludos
        greeting: [
            'hola', 'hi', 'hello', 'buenas', 'buenos', 'hey', 'saludos',
            'buen dia', 'buenas tardes', 'buenas noches'
        ],

        // Menú
        menu: [
            'menu', 'opciones', 'que puedes hacer', 'que haces',
            'que ofreces', 'servicios'
        ],

        // Tipo de trámite
        transaction_personal: [
            'tramite personal', 'personal', 'persona'
        ],
        transaction_business: [
            'empresa', 'pyme', 'negocio', 'comercial', 'empresarial'
        ],

        // Identificación
        id_type_cedula_personal: [
            'cédula nacional', 'cedula nacional', 'cedula'
        ],
        id_type_cedula_residente: [
            'cédula de residente', 'cedula de residente'
        ],
        id_type_pasaporte: [
            'pasaporte'
        ],

        // Regresar / Cambiar selección
        reverse_selection: [
            'regresar', 'cambiar', 'volver'
        ],

        // Desarrollo web
        web: [
            'web', 'pagina', 'sitio', 'landing', 'desarrollo web',
            'crear pagina', 'hacer web', 'sitio web', 'pagina web',
            'desarrollo de paginas', 'desarrollo de sitios', 'app'
        ],

        // Automatización
        automation: [
            'bot', 'automatizacion', 'ia', 'inteligencia artificial',
            'chatbot', 'automatizar', 'proceso', 'flujo', 'workflow'
        ],

        // Información general
        info: [
            'que hacen', 'que es', 'informacion', 'info', 'sobre ustedes',
            'quienes son', 'que ofrecen', 'servicios', 'empresa', 'nosotros'
        ],

        // Facturación/Pagos
        billing: [
            'cuanto cuesta', 'precios', 'pagar', 'costo', 'tarifa',
            'planes', 'precio', 'valor', 'cobrar', 'pago', 'factura'
        ],

        // Soporte
        support: [
            'ayuda', 'soporte', 'problema', 'error', 'no funciona',
            'ayudame', 'tengo un problema', 'no me sirve', 'no anda',
            'ayuda por favor', 'necesito ayuda', 'tengo una duda'
        ],

        // Archivos/Media
        media: [
            'archivo', 'pdf', 'imagen', 'video', 'documento',
            'descargar', 'enviar', 'mandar', 'obtener'
        ],

        // Conversación general
        conversation: [
            'como estas', 'que tal', 'como va', 'todo bien',
            'que pasa', 'que cuentas', 'como te va'
        ],

        // Despedida
        goodbye: [
            'chau', 'adios', 'bye', 'hasta luego', 'nos vemos',
            'gracias', 'ok', 'listo', 'terminar'
        ]
    }

    static detectIntent(message: string): string | null {
        const normalizedMessage = message.toLowerCase().trim()

        // Detectar intenciones por palabras clave
        for (const [intent, patterns] of Object.entries(this.INTENT_PATTERNS)) {
            for (const pattern of patterns) {
                if (normalizedMessage.includes(pattern)) {
                    return intent
                }
            }
        }

        return null
    }

    static getIntentConfidence(message: string, intent: string): number {
        const normalizedMessage = message.toLowerCase().trim()
        const patterns = this.INTENT_PATTERNS[intent as keyof typeof this.INTENT_PATTERNS] || []

        let matches = 0
        for (const pattern of patterns) {
            if (normalizedMessage.includes(pattern)) {
                matches++
            }
        }

        return matches / patterns.length
    }
}

export class ConversationManager {
    static async getState(ctx: any, { state }: any): Promise<ConversationState> {
        const currentState = state.getMyState() || {}
        return {
            currentIntent: currentState.currentIntent,
            currentStep: currentState.currentStep,
            collectedData: currentState.collectedData || {},
            lastMenuShownAt: currentState.lastMenuShownAt,
            isWaitingForSupportIssue: currentState.isWaitingForSupportIssue,
            isWaitingForName: currentState.isWaitingForName,
            isWaitingForClarification: currentState.isWaitingForClarification,
            lastInteractionAt: currentState.lastInteractionAt,
            userName: currentState.userName,
            conversationHistory: currentState.conversationHistory || []
        }
    }

    static async updateState(ctx: any, { state }: any, updates: Partial<ConversationState>): Promise<void> {
        const currentState = await this.getState(ctx, { state })
        const newState = {
            ...currentState,
            ...updates,
            lastInteractionAt: Date.now(),
            conversationHistory: [
                ...(currentState.conversationHistory || []),
                `${new Date().toISOString()}: ${ctx.body}`
            ].slice(-10) // Mantener últimas 10 interacciones
        }

        await state.update(newState)
    }

    static shouldShowMenu(state: ConversationState): boolean {
        if (!state.lastMenuShownAt) return true
        const timeSinceLastMenu = Date.now() - state.lastMenuShownAt
        return timeSinceLastMenu > 5 * 60 * 1000 // 5 minutos
    }

    static getContextualResponse(intent: string, state: ConversationState): string {
        const hasContext = state.currentIntent && state.collectedData

        switch (intent) {
            case 'greeting':
                if (state.userName) {
                    return `¡Hola de nuevo ${state.userName}! ¿En qué más te ayudo?`
                }
                return `¡Hola! Soy el asistente de Zona Sur Tech. ¿En qué te ayudo hoy?`

            case 'web':
                return `Perfecto, te ayudo con desarrollo web. ¿Ya tienes dominio y hosting o todavía no has empezado?`

            case 'automation':
                return `Excelente, puedo ayudarte con automatización. ¿Qué procesos quieres automatizar?`

            case 'billing':
                return `Claro, te ayudo con facturación. ¿Es sobre factura electrónica, un comprobante o una consulta administrativa?`

            case 'info':
                return `Somos Zona Sur Tech. Te ayudamos con desarrollo web, automatización, soporte y consultas de facturación.`

            case 'support':
                if (state.isWaitingForSupportIssue) {
                    return `Cuéntame más detalles sobre el problema para poder ayudarte mejor.`
                }
                return `Con gusto te ayudo. ¿Qué problema estás teniendo?`

            case 'media':
                return `Te envío algunos archivos de ejemplo. ¿Qué tipo de archivo necesitas?`

            default:
                return `No estoy seguro de qué necesitas. ¿Puedes darme más detalles?`
        }
    }
}
