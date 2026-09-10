const fs = require('fs');
const content = fs.readFileSync('node_modules/lucide-react/dist/cjs/lucide-react.js', 'utf8');
const idx = content.indexOf('Phone =');
console.log(content.slice(idx, idx + 400));
