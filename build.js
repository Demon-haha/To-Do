const fs = require('fs');
const babel = require('@babel/core');

const html = fs.readFileSync('index.html', 'utf8');

// Extract the text/babel script content
const match = html.match(/<script type="text\/babel"[^>]*>([\s\S]*?)<\/script>/);
if (!match) { console.error('Babel script not found!'); process.exit(1); }

const jsxCode = match[1];

// Compile JSX → plain JS (classic React.createElement, no imports)
const result = babel.transformSync(jsxCode, {
  plugins: [
    ['@babel/plugin-transform-react-jsx', { runtime: 'classic' }]
  ],
  sourceType: 'script',
});

const compiled = result.code;

// Replace <script type="text/babel"...>...</script> with <script>compiled</script>
// Also remove the Babel CDN <script> tag
let output = html.replace(
  /<script type="text\/babel"[^>]*>[\s\S]*?<\/script>/,
  `<script>\n${compiled}\n</script>`
);

// Remove Babel standalone CDN script tag
output = output.replace(
  /\s*<script src="https:\/\/cdn\.jsdelivr\.net\/npm\/@babel\/standalone[^"]*"><\/script>\n?/,
  '\n'
);

fs.writeFileSync('index.html', output, 'utf8');
console.log('Done! Compiled', jsxCode.length, 'chars JSX →', compiled.length, 'chars JS');
console.log('Babel CDN removed from index.html');
