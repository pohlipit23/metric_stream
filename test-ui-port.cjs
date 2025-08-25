#!/usr/bin/env node

/**
 * Test UI Port Access
 * Checks which port the Admin Console UI is running on
 */

async function testPort(port) {
  try {
    const response = await fetch(`http://localhost:${port}`)
    if (response.ok) {
      const html = await response.text()
      return {
        accessible: true,
        isReactApp: html.includes('Daily Index Tracker') || html.includes('root') || html.includes('vite')
      }
    }
    return { accessible: false, isReactApp: false }
  } catch (error) {
    return { accessible: false, isReactApp: false }
  }
}

async function main() {
  console.log('🔍 TESTING UI PORT ACCESS')
  console.log('============================================================')
  
  const ports = [3000, 5173, 8080, 4173]
  
  console.log('\n📋 Testing common development ports...')
  
  for (const port of ports) {
    const result = await testPort(port)
    
    if (result.accessible) {
      if (result.isReactApp) {
        console.log(`✅ Port ${port}: Admin Console UI is running`)
      } else {
        console.log(`⚠️  Port ${port}: Something is running (not Admin Console)`)
      }
    } else {
      console.log(`❌ Port ${port}: Not accessible`)
    }
  }
  
  console.log('\n💡 INSTRUCTIONS:')
  console.log('If no UI is running:')
  console.log('   cd src/admin-console')
  console.log('   npm run dev')
  console.log('')
  console.log('Vite typically uses port 5173 by default.')
  console.log('The UI will show the correct URL when it starts.')
}

main().catch(console.error)