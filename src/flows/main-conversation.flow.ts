import { addKeyword, utils } from '@builderbot/bot'
import { BaileysProvider as Provider } from '@builderbot/provider-baileys'
import { JsonFileDB as Database } from '@builderbot/database-json'
import { IntentRouter, ConversationManager, ConversationState } from '../utils/intent-router'

export const mainConversationFlow = addKeyword<Provider, Database>(utils.setEvent('MAIN_CONVERSATION'))
    .addAction(async (ctx, { flowDynamic, state, gotoFlow }) => {
        const userMessage = ctx.body.trim()
        const currentState = await ConversationManager.getState(ctx, { state })

        // Detectar intención del mensaje
        const detectedIntent = IntentRouter.detectIntent(userMessage)

        if (detectedIntent) {
            // Actualizar estado con la nueva intención
            await ConversationManager.updateState(ctx, { state }, {
                currentIntent: detectedIntent,
                currentStep: currentState.currentStep || 'intent_detected'
            })

            // Responder de forma contextual
            const response = ConversationManager.getContextualResponse(detectedIntent, currentState)

            // Manejar respuestas específicas por intención
            switch (detectedIntent) {
                case 'greeting':
                    await flowDynamic([
                        '¡Bienvenido a Zona Sur Tech! Soy tu asistente virtual.',
                        'Selecciona si tu trámite es de carácter personal o para tu negocio.',
                        '1️⃣ Trámite personal',
                        '2️⃣ Empresa/PYME',
                        'O escribe directamente una opción como: "Trámite personal" o "Empresa/Pyme"'
                    ])
                    await ConversationManager.updateState(ctx, { state }, {
                        currentStep: 'ask_transaction_type'
                    })
                    break

                case 'web':
                    await flowDynamic(response)
                    await ConversationManager.updateState(ctx, { state }, {
                        currentStep: 'waiting_web_details'
                    })
                    break

                case 'automation':
                    await flowDynamic(response)
                    await ConversationManager.updateState(ctx, { state }, {
                        currentStep: 'waiting_automation_details'
                    })
                    break

                case 'billing':
                    await flowDynamic([
                        response,
                        'También puedo ayudarte con:',
                        '• Configuración de facturación electrónica',
                        '• Problemas con comprobantes',
                        '• Consultas administrativas'
                    ])
                    break

                case 'info':
                    await flowDynamic([
                        response,
                        'Puedo orientarte en estas areas:',
                        '1. Desarrollo web',
                        '2. Automatizacion',
                        '3. Facturacion',
                        '4. Soporte',
                        '5. Archivos y media'
                    ])
                    await ConversationManager.updateState(ctx, { state }, {
                        currentStep: 'main_menu'
                    })
                    break

                case 'support':
                    await flowDynamic(response)
                    await ConversationManager.updateState(ctx, { state }, {
                        isWaitingForSupportIssue: true,
                        currentStep: 'waiting_support_description'
                    })
                    break

                case 'media':
                    await flowDynamic([
                        response,
                        'Te envío algunos archivos de ejemplo:'
                    ])

                    // Enviar archivos de ejemplo
                    await flowDynamic([
                        {
                            body: '📄 Documento PDF de ejemplo',
                            media: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'
                        }
                    ])

                    await flowDynamic([
                        {
                            body: '🖼️ Imagen de nuestros trabajos',
                            media: 'https://via.placeholder.com/500x300?text=Zona+Sur+Tech'
                        }
                    ])

                    await flowDynamic('¿Necesitas algún archivo específico o más información?')
                    break

                case 'menu':
                    await flowDynamic([
                        'Menú principal de Zona Sur Tech:',
                        '1. Desarrollo web',
                        '2. Automatizacion',
                        '3. Facturacion',
                        '4. Soporte',
                        '5. Archivos y media',
                        '6. Informacion general'
                    ])
                    await ConversationManager.updateState(ctx, { state }, {
                        lastMenuShownAt: Date.now(),
                        currentStep: 'main_menu'
                    })
                    break

                case 'transaction_personal':
                case 'transaction_business':
                    await flowDynamic([
                        detectedIntent === 'transaction_personal'
                            ? 'Has seleccionado trámite personal.'
                            : 'Has seleccionado trámite para empresa/PYME.',
                        'Para brindarte una mejor experiencia, selecciona tu tipo de identificación: ',
                        '• Cédula nacional',
                        '• Cédula de residente',
                        '• Pasaporte',
                        'Escribe el nombre completo del tipo (o escribe REGRESAR para elegir otro trámite).'
                    ])
                    await ConversationManager.updateState(ctx, { state }, {
                        currentStep: 'ask_id_type',
                        collectedData: {
                            ...currentState.collectedData,
                            transactionType: detectedIntent
                        }
                    })
                    break

                case 'id_type_cedula_personal':
                case 'id_type_cedula_residente':
                case 'id_type_pasaporte':
                    await flowDynamic([
                        `Tipo seleccionado: ${detectedIntent === 'id_type_cedula_personal' ? 'Cédula nacional' : detectedIntent === 'id_type_cedula_residente' ? 'Cédula de residente' : 'Pasaporte'}`,
                        'Digite su número de identificación (sin guiones ni espacios) o escriba REGRESAR para cambiar su tipo de identificación.'
                    ])
                    await ConversationManager.updateState(ctx, { state }, {
                        currentStep: 'ask_id_number',
                        collectedData: {
                            ...currentState.collectedData,
                            idType: detectedIntent
                        }
                    })
                    break

                case 'reverse_selection':
                    await flowDynamic('De acuerdo, volvamos atrás. Indica si tu trámite es: Trámite personal o Empresa/PYME.')
                    await ConversationManager.updateState(ctx, { state }, {
                        currentStep: 'ask_transaction_type',
                        collectedData: {
                            ...currentState.collectedData,
                            transactionType: undefined,
                            idType: undefined,
                            idNumber: undefined
                        }
                    })
                    break

                case 'goodbye':
                    await flowDynamic([
                        '¡Gracias por contactarnos!',
                        'Si necesitas algo más, solo escribe "hola" o "menu".',
                        'Que tengas un excelente día. 👋'
                    ])
                    await state.clear()
                    break

                default:
                    await flowDynamic(response)
            }

        } else {
            // No se detectó intención clara, intentar contexto o pedir aclaración
            if (currentState.currentIntent && currentState.currentStep) {
                await handleContextualResponse(ctx, { flowDynamic, state }, currentState)
            } else {
                // Pedir aclaración de forma natural
                await flowDynamic([
                    'No estoy seguro de qué necesitas exactamente.',
                    'Puedo ayudarte con desarrollo web, automatización, facturación o soporte.',
                    '¿Puedes darme más detalles sobre lo que buscas?'
                ])
                await ConversationManager.updateState(ctx, { state }, {
                    isWaitingForClarification: true
                })
            }
        }
    })

async function handleContextualResponse(ctx: any, { flowDynamic, state }: any, currentState: ConversationState) {
    const userMessage = ctx.body.trim().toLowerCase()

    switch (currentState.currentStep) {
        case 'ask_transaction_type':
            if (userMessage.includes('personal') || userMessage.includes('1')) {
                await flowDynamic('Entendido, trámite personal seleccionado. Ahora elige tu tipo de identificación.')
                await ConversationManager.updateState(ctx, { state }, {
                    currentStep: 'ask_id_type',
                    collectedData: {
                        ...currentState.collectedData,
                        transactionType: 'personal'
                    }
                })
            } else if (userMessage.includes('empresa') || userMessage.includes('pyme') || userMessage.includes('2')) {
                await flowDynamic('Perfecto, trámite para empresa/PYME seleccionado. Ahora elige tu tipo de identificación.')
                await ConversationManager.updateState(ctx, { state }, {
                    currentStep: 'ask_id_type',
                    collectedData: {
                        ...currentState.collectedData,
                        transactionType: 'empresa'
                    }
                })
            } else {
                await flowDynamic('No entendí. Por favor escribe "Trámite personal" o "Empresa/PYME".')
            }
            break

        case 'ask_id_type':
            if (userMessage.includes('cédula nacional') || userMessage.includes('cedula nacional') || userMessage.includes('cedula')) {
                await flowDynamic('Has seleccionado Cédula nacional. Ahora envía tu número de identificación (sin guiones ni espacios).')
                await ConversationManager.updateState(ctx, { state }, {
                    currentStep: 'ask_id_number',
                    collectedData: {
                        ...currentState.collectedData,
                        idType: 'cédula nacional'
                    }
                })
            } else if (userMessage.includes('cédula de residente') || userMessage.includes('cedula de residente')) {
                await flowDynamic('Has seleccionado Cédula de residente. Ahora envía tu número de identificación (sin guiones ni espacios).')
                await ConversationManager.updateState(ctx, { state }, {
                    currentStep: 'ask_id_number',
                    collectedData: {
                        ...currentState.collectedData,
                        idType: 'cédula de residente'
                    }
                })
            } else if (userMessage.includes('pasaporte')) {
                await flowDynamic('Has seleccionado Pasaporte. Ahora envía tu número de identificación (sin guiones ni espacios).')
                await ConversationManager.updateState(ctx, { state }, {
                    currentStep: 'ask_id_number',
                    collectedData: {
                        ...currentState.collectedData,
                        idType: 'pasaporte'
                    }
                })
            } else {
                await flowDynamic('No te entendí. Escribe: Cédula nacional, Cédula de residente o Pasaporte. Puedes escribir REGRESAR para cambiar tipo de trámite.')
            }
            break

        case 'ask_id_number':
            if (userMessage === 'regresar' || userMessage === 'cambiar' || userMessage === 'volver') {
                await flowDynamic('De acuerdo, volvemos al tipo de trámite. ¿Trámite personal o Empresa/PYME?')
                await ConversationManager.updateState(ctx, { state }, {
                    currentStep: 'ask_transaction_type'
                })
            } else {
                const idNumber = userMessage.replace(/\D/g, '')
                if (idNumber.length < 5) {
                    await flowDynamic('El número es muy corto. Ingresa tu número de identificación completo sin espacios ni guiones.')
                } else {
                    await ConversationManager.updateState(ctx, { state }, {
                        currentStep: 'confirm_id_number',
                        collectedData: {
                            ...currentState.collectedData,
                            idNumber
                        }
                    })
                    await flowDynamic([
                        `Confirme su número de identificación: ${idNumber}`,
                        'Escriba: Confirmar ⬇️',
                        'o: Regresar ⬅️'
                    ])
                }
            }
            break

        case 'confirm_id_number':
            if (userMessage.includes('confirmar')) {
                await flowDynamic([
                    `✅ Registrado: ${currentState.collectedData?.idType} - ${currentState.collectedData?.idNumber}`,
                    'Gracias, tu información fue registrada exitosamente.',
                    'Si deseas continuar con otra gestión, escribe "menu" o "hola".'
                ])
                await ConversationManager.updateState(ctx, { state }, {
                    currentStep: 'completed',
                    currentIntent: 'goodbye'
                })
            } else if (userMessage.includes('regresar') || userMessage.includes('cambiar') || userMessage.includes('volver')) {
                await flowDynamic('Ok, por favor ingresa nuevamente tu número de identificación (sin guiones ni espacios).')
                await ConversationManager.updateState(ctx, { state }, {
                    currentStep: 'ask_id_number'
                })
            } else {
                await flowDynamic('Por favor escribe "Confirmar" para validar o "Regresar" para editar tu número.')
            }
            break

        case 'main_menu':
            if (userMessage === '1') {
                await ConversationManager.updateState(ctx, { state }, {
                    currentIntent: 'web',
                    currentStep: 'waiting_web_details'
                })
                await flowDynamic('Perfecto, te ayudo con desarrollo web. ¿Ya tienes dominio y hosting o todavia no has empezado?')
            } else if (userMessage === '2') {
                await ConversationManager.updateState(ctx, { state }, {
                    currentIntent: 'automation',
                    currentStep: 'waiting_automation_details'
                })
                await flowDynamic('Excelente, puedo ayudarte con automatizacion. ¿Que procesos quieres automatizar?')
            } else if (userMessage === '3') {
                await ConversationManager.updateState(ctx, { state }, {
                    currentIntent: 'billing',
                    currentStep: 'intent_detected'
                })
                await flowDynamic('Claro, te ayudo con facturacion. ¿Es sobre factura electronica, un comprobante o una consulta administrativa?')
            } else if (userMessage === '4') {
                await ConversationManager.updateState(ctx, { state }, {
                    currentIntent: 'support',
                    currentStep: 'waiting_support_description',
                    isWaitingForSupportIssue: true
                })
                await flowDynamic('Con gusto te ayudo. ¿Que problema estas teniendo?')
            } else if (userMessage === '5') {
                await ConversationManager.updateState(ctx, { state }, {
                    currentIntent: 'media',
                    currentStep: 'intent_detected'
                })
                await flowDynamic('Te envio algunos archivos de ejemplo. ¿Que tipo de archivo necesitas?')
            } else if (userMessage === '6') {
                await ConversationManager.updateState(ctx, { state }, {
                    currentIntent: 'info',
                    currentStep: 'intent_detected'
                })
                await flowDynamic('Somos Zona Sur Tech. Te ayudamos con desarrollo web, automatizacion, soporte y consultas de facturacion.')
            } else {
                await flowDynamic('Escribe un numero del 1 al 6 o dime directamente que servicio necesitas.')
            }
            break

        case 'waiting_web_details':
            if (
                userMessage.includes('si') ||
                userMessage.includes('sí') ||
                userMessage.includes('tengo') ||
                userMessage.includes('ya')
            ) {
                await flowDynamic([
                    'Perfecto, trabajamos sobre lo que ya tienes.',
                    '¿Que tipo de pagina web necesitas? Tambien puedo darte un estimado.'
                ])
                await ConversationManager.updateState(ctx, { state }, {
                    currentStep: 'waiting_web_type',
                    collectedData: { ...currentState.collectedData, hasDomain: true }
                })
            } else if (userMessage.includes('no') || userMessage.includes('todavia')) {
                await flowDynamic([
                    'No hay problema, también te ayudamos con eso.',
                    '¿Qué tipo de página web necesitas? Te doy precios aproximados.'
                ])
                await ConversationManager.updateState(ctx, { state }, {
                    currentStep: 'waiting_web_type',
                    collectedData: { ...currentState.collectedData, hasDomain: false }
                })
            } else {
                await flowDynamic('¿Ya tienes dominio y hosting o necesitas que te ayudemos con eso también?')
            }
            break

        case 'waiting_support_description':
            await ConversationManager.updateState(ctx, { state }, {
                collectedData: {
                    ...currentState.collectedData,
                    supportIssue: ctx.body.trim()
                },
                isWaitingForSupportIssue: false,
                isWaitingForName: true,
                currentStep: 'waiting_support_name'
            })

            await flowDynamic([
                'Entendido, voy a registrar tu consulta.',
                '¿Me compartes tu nombre para el ticket?'
            ])
            break

        case 'waiting_support_name':
            const issue = currentState.collectedData?.supportIssue
            const name = ctx.body.trim()

            await ConversationManager.updateState(ctx, { state }, {
                userName: name,
                collectedData: {
                    ...currentState.collectedData,
                    clientName: name
                },
                isWaitingForName: false,
                currentStep: 'support_completed'
            })

            await flowDynamic([
                `✅ Ticket registrado exitosamente`,
                `👤 Cliente: ${name}`,
                `📌 Problema: ${issue}`,
                '',
                'Nuestro equipo te contactará pronto.',
                '¿Necesitas algo más mientras tanto?'
            ])
            break

        default:
            await flowDynamic([
                '¿En qué más te puedo ayudar?',
                'Si quieres volver al menú principal, escribe "menu".'
            ])
    }
}
