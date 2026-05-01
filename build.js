const fs = require('fs');
const { execFileSync } = require('child_process');
const babel = require('@babel/core');

console.log('🔨 Building...');

execFileSync(
  process.execPath,
  [require.resolve('tailwindcss/lib/cli.js'), '-i', 'tailwind.input.css', '-o', 'tailwind.generated.css', '--minify'],
  { stdio: 'inherit' }
);

const jsx = fs.readFileSync('app.jsx', 'utf8');
console.log('  ├─ app.jsx:', jsx.length, 'chars');

const result = babel.transformSync(jsx, {
  plugins: [['@babel/plugin-transform-react-jsx', { runtime: 'classic' }]],
  sourceType: 'script',
  babelrc: false,
  configFile: false,
  comments: false,
});

const compiled = result.code;
console.log('  ├─ Compiled →', compiled.length, 'chars JS');

const tpl = fs.readFileSync('template.html', 'utf8');
if (!tpl.includes('{{COMPILED_APP}}')) {
  console.error('❌ template.html missing {{COMPILED_APP}} placeholder');
  process.exit(1);
}
const html = tpl.replace('{{COMPILED_APP}}', '\n' + compiled + '\n');
console.log('  └─ index.html:', html.length, 'chars');

fs.writeFileSync('index.html', html, 'utf8');
console.log('✅ Done!');
