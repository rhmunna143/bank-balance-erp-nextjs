const fs = require('fs');
const path = require('path');
function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else if (file.endsWith('.jsx') || file.endsWith('.tsx') || file.endsWith('.js') || file.endsWith('.ts')) {
      results.push(file);
    }
  });
  return results;
}

const files = [...walk('app'), ...walk('components')];
files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let updated = false;

  const transactionRegex = /import\s+\{\s*transactionService\s*\}\s+from\s+['"].*?transactionService['"]/g;
  if (transactionRegex.test(content)) {
    content = content.replace(transactionRegex, 'import * as transactionService from "@/services/transactionService"');
    updated = true;
  }
  
  if (updated) {
    fs.writeFileSync(file, content);
    console.log('Updated', file);
  }
});
