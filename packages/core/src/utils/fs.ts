import * as fs from 'fs';
import * as path from 'path';

export function walkMdFiles(dir: string, fileList: string[] = []): string[] {
  try {
    if (!fs.existsSync(dir)) return fileList;
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      try {
        if (fs.statSync(fullPath).isDirectory()) {
          if (!['node_modules', '.git', 'dist', '.changeset', 'scratch', 'test-scaffold', 'fixtures'].includes(file)) {
            walkMdFiles(fullPath, fileList);
          }
        } else if (file.endsWith('.md')) {
          fileList.push(fullPath);
        }
      } catch {
        // Ignore files unlinked concurrently
      }
    }
  } catch {
    // Ignore directories removed concurrently
  }
  return fileList;
}
