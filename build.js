// Build pipeline: app.jsx → JSX-compile → inject into template.html → write index.html
const fs = require('fs');
const babel = require('@babel/core');

console.log('🔨 Building...');

// 1. Read source JSX
const jsx = fs.readFileSync('app.jsx', 'utf8');
console.log('  ├─ app.jsx:', jsx.length, 'chars');

// 2. Compile JSX → plain JS (classic React.createElement)
const result = babel.transformSync(jsx, {
  plugins: [['@babel/plugin-transform-react-jsx', { runtime: 'classic' }]],
  sourceType: 'script',
  babelrc: false,
  configFile: false,
  comments: false, // strip comments — saves ~5–10KB in output
});

const compiled = result.code;
console.log('  ├─ Compiled →', compiled.length, 'chars JS');

// 3. Read template & inject compiled code
const tpl = fs.readFileSync('template.html', 'utf8');
if (!tpl.includes('{{COMPILED_APP}}')) {
  console.error('❌ template.html missing {{COMPILED_APP}} placeholder');
  process.exit(1);
}
const html = tpl.replace('{{COMPILED_APP}}', '\n' + compiled + '\n');
console.log('  └─ index.html:', html.length, 'chars');

// 4. Write output
fs.writeFileSync('index.html', html, 'utf8');
console.log('✅ Done!');
