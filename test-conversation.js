#!/usr/bin/env node

/**
 * Script de prueba para validar el sistema conversacional
 * Ejecutar con: npm run test:conversation
 */

import { IntentRouter } from './src/utils/intent-router.ts'

console.log('🧪 Probando sistema de detección de intención...\n')

const testMessages = [
    // Saludos
    { message: 'hola', expected: 'greeting' },
    { message: 'buenas tardes', expected: 'greeting' },
    { message: 'hey', expected: 'greeting' },

    // Soporte
    { message: 'tengo un problema', expected: 'support' },
    { message: 'no funciona', expected: 'support' },
    { message: 'ayuda', expected: 'support' },

    // Información
    { message: 'que hacen', expected: 'info' },
    { message: 'informacion', expected: 'info' },
    { message: 'sobre ustedes', expected: 'info' },

    // Facturación
    { message: 'cuanto cuesta', expected: 'billing' },
    { message: 'precios', expected: 'billing' },
    { message: 'pagar', expected: 'billing' },

    // Web/App
    { message: 'quiero la web', expected: 'web' },
    { message: 'app', expected: 'web' },
    { message: 'sitio web', expected: 'web' },

    // Despedidas
    { message: 'chau', expected: 'goodbye' },
    { message: 'hasta luego', expected: 'goodbye' },
    { message: 'adios', expected: 'goodbye' },

    // Conversación general
    { message: 'como estas', expected: 'conversation' },
    { message: 'que tal', expected: 'conversation' },
]

const router = new IntentRouter()

let passed = 0
let failed = 0

testMessages.forEach(({ message, expected }) => {
    const result = IntentRouter.detectIntent(message)
    const success = result === expected

    if (success) {
        passed++
        console.log(`✅ "${message}" → ${result}`)
    } else {
        failed++
        console.log(`❌ "${message}" → ${result} (esperado: ${expected})`)
    }
})

console.log(`\n📊 Resultados: ${passed} pasaron, ${failed} fallaron`)

if (failed === 0) {
    console.log('🎉 ¡Todos los tests pasaron! El sistema de intención funciona correctamente.')
} else {
    console.log('⚠️  Algunos tests fallaron. Revisa los patrones de intención.')
}