const fs = require('fs');
const path = require('path');

function replaceInDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if (file !== 'node_modules' && file !== 'dist' && file !== '.git' && file !== '.gemini' && file !== 'build') {
        replaceInDir(fullPath);
      }
    } else {
      if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx') || fullPath.endsWith('.html')) {
        let content = fs.readFileSync(fullPath, 'utf8');
        let newContent = content.replace(/HeartSync/g, 'TapIn');
        newContent = newContent.replace(/heartsync/g, 'tapin');
        if (content !== newContent) {
          fs.writeFileSync(fullPath, newContent);
          console.log('Updated: ' + fullPath);
        }
      }
    }
  }
}

replaceInDir('d:\\dating app\\frontend');
replaceInDir('d:\\dating app\\backend');
