const { execSync } = require('child_process');

try {
  // Kill hanging git process if any
  try {
    execSync('taskkill /F /IM git.exe', { stdio: 'ignore' });
  } catch (e) {}

  // Remove lock
  try {
    const fs = require('fs');
    if (fs.existsSync('.git/index.lock')) {
      fs.unlinkSync('.git/index.lock');
    }
  } catch (e

  // Commit and push
  console.log('Committing changes...');
  execSync('git commit -m "Update frontend components and pages"', { stdio: 'inherit' });
  
  console.log('Pushing to GitHub...');
  execSync('git push', { stdio: 'inherit' });
  
  console.log('Successfully pushed to github!');
} catch (error) {
  console.error('An error occurred:', error.message);
  process.exit(1);
}
