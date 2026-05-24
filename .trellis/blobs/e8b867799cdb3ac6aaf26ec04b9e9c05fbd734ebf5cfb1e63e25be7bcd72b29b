// Simple validation that the fix is in place
const fs = require('fs');
const path = require('path');

const embedNodePath = path.join(__dirname, '../src/features/preview/viewers/canvasViewer/nodes/EmbedNode.tsx');
const content = fs.readFileSync(embedNodePath, 'utf8');

console.log('Checking EmbedNode for input focus fix...\n');

// Check if onMouseDown is present on the Input component
const inputMatch = content.match(/<Input[\s\S]*?onMouseDown=\{\(e\) => e\.stopPropagation\(\)\}/);

if (inputMatch) {
  console.log('✅ Fix found: Input component has onMouseDown with stopPropagation');
  console.log('\nFixed Input component:');
  console.log(inputMatch[0]);
} else {
  console.log('❌ Fix not found: Input component missing onMouseDown handler');
}

// Also verify the nodrag class is still present on the parent container
const nodragMatch = content.match(/className="[^"]*nodrag[^"]*"/);
if (nodragMatch) {
  console.log('\n✅ Parent container still has "nodrag" class');
} else {
  console.log('\n⚠️  Parent container missing "nodrag" class');
}

console.log('\nValidation complete.');
