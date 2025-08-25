#!/usr/bin/env node

/**
 * Fix UI Component Export Issues
 * Adds named exports to all UI components that only have default exports
 */

const fs = require('fs')
const path = require('path')

const uiComponentsDir = 'src/admin-console/src/components/ui'

// List of components that need both default and named exports
const components = [
  'Button.jsx',
  'Card.jsx', 
  'Input.jsx',
  'Badge.jsx',
  'LoadingSpinner.jsx'
]

console.log('🔧 Fixing UI Component Exports')
console.log('============================================================')

components.forEach(componentFile => {
  const filePath = path.join(uiComponentsDir, componentFile)
  
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  ${componentFile}: File not found, skipping`)
    return
  }
  
  let content = fs.readFileSync(filePath, 'utf8')
  const componentName = componentFile.replace('.jsx', '')
  
  // Check if it already has named export
  if (content.includes(`export { ${componentName} }`)) {
    console.log(`✅ ${componentFile}: Already has named export`)
    return
  }
  
  // Check if it has default export
  if (content.includes(`export default ${componentName}`)) {
    // Add named export after default export
    content = content.replace(
      `export default ${componentName}`,
      `export default ${componentName}\nexport { ${componentName} }`
    )
    
    fs.writeFileSync(filePath, content)
    console.log(`✅ ${componentFile}: Added named export`)
  } else {
    console.log(`⚠️  ${componentFile}: No default export found`)
  }
})

console.log('\n🎉 UI component exports fixed!')