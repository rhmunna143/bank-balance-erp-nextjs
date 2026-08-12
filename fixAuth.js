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

  if (content.includes('useAuthStore')) {
    content = content.replace(/import\s+\{\s*useAuthStore\s*\}\s+from\s+['"]@\/stores\/authStore['"];?/g, 'import { useUser } from "@clerk/nextjs";');
    content = content.replace(/const\s+\{\s*user\s*\}\s*=\s*useAuthStore\(\);/g, 'const { user } = useUser();');
    content = content.replace(/const\s+user\s*=\s*useAuthStore\(\(state\)\s*=>\s*state\.user\);/g, 'const { user } = useUser();');
    updated = true;
  }

  // Check for BackupService usages in settings/page.jsx that might be wrong (like backupService.createBackup)
  // Actually, wait, `backupService` exports `createBackup`. If the subagent did `export async function createBackup`, we just need to make sure we import `* as backupService`.
  if (content.includes('import { backupService } from')) {
    content = content.replace(/import\s+\{\s*backupService\s*\}\s+from\s+['"].*?backupService['"];?/g, 'import * as backupService from "@/services/backupService";');
    updated = true;
  }
  if (content.includes('import { bankService } from')) {
    content = content.replace(/import\s+\{\s*bankService\s*\}\s+from\s+['"].*?bankService['"];?/g, 'import * as bankService from "@/services/bankService";');
    updated = true;
  }

  if (updated) {
    fs.writeFileSync(file, content);
    console.log('Updated', file);
  }
});
