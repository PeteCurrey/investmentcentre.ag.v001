import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('Running CI fresh build check...');

try {
  // 1. Capture status of tracked files BEFORE build
  const preStatus = execSync('git status --porcelain', { encoding: 'utf8' });
  const preLines = new Set(preStatus.split('\n').filter(Boolean));

  // 2. Run full build
  execSync('npm run build', { stdio: 'inherit' });

  // 3. Capture status AFTER build
  const postStatus = execSync('git status --porcelain', { encoding: 'utf8' });
  const postLines = postStatus.split('\n').filter(Boolean);

  // 4. Find files newly modified or created BY the build step
  const dirtyBuildFiles = postLines.filter(line => !preLines.has(line));

  if (dirtyBuildFiles.length > 0) {
    console.error('CI Fresh Build Error: The build step generated or modified the following git files:');
    console.error(dirtyBuildFiles.join('\n'));
    process.exit(1);
  }

  // 5. Verify key package dist outputs exist
  const requiredDistPackages = ['core', 'execute', 'risk', 'signals', 'adapters'];
  for (const pkg of requiredDistPackages) {
    const distIndex = path.join(process.cwd(), 'packages', pkg, 'dist', 'index.js');
    if (!fs.existsSync(distIndex)) {
      console.error(`CI Fresh Build Error: Missing expected build artifact at ${distIndex}`);
      process.exit(1);
    }
  }

  console.log('CI fresh build check PASSED cleanly.');
} catch (err) {
  console.error('CI Fresh Build Failed:', err.message);
  process.exit(1);
}
