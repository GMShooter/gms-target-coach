#!/usr/bin/env node

/**
 * GMShooter v2 Deployment Script
 * Cross-platform deployment script for Node.js
 */

const { spawn, exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logStep(step) {
  log(`📋 ${step}`, 'cyan');
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

// Execute command and return promise
function executeCommand(command, args = [], options = {}) {
  return new Promise((resolve, reject) => {
    log(`🔧 Running: ${command} ${args.join(' ')}`, 'blue');
    
    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: process.platform === 'win32',
      ...options
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve(code);
      } else {
        reject(new Error(`Command failed with exit code ${code}`));
      }
    });

    child.on('error', (error) => {
      reject(error);
    });
  });
}

// Check if command exists
function commandExists(command) {
  return new Promise((resolve) => {
    exec(`where ${command}`, { shell: process.platform === 'win32' ? 'cmd.exe' : 'bash' }, (error) => {
      resolve(!error);
    });
  });
}

// Check requirements
async function checkRequirements() {
  logStep('Checking requirements...');

  const requirements = [
    { name: 'npm', command: 'npm' },
    { name: 'Supabase CLI', command: 'supabase', install: 'npm install -g supabase' },
    { name: 'Firebase CLI', command: 'firebase', install: 'npm install -g firebase-tools' }
  ];

  for (const req of requirements) {
    const exists = await commandExists(req.command);
    if (!exists) {
      if (req.install) {
        log(`${req.name} is not installed. Installing...`, 'yellow');
        try {
          await executeCommand('npm', ['install', '-g', req.command.split(' ')[0]]);
          logSuccess(`${req.name} installed successfully`);
        } catch (error) {
          logError(`Failed to install ${req.name}: ${error.message}`);
          process.exit(1);
        }
      } else {
        logError(`${req.name} is not installed. Please install it manually.`);
        process.exit(1);
      }
    }
  }

  logSuccess('All requirements met');
}

// Setup environment
async function setupEnvironment() {
  logStep('Setting up environment...');

  const envPath = path.join(process.cwd(), '.env');
  const envExamplePath = path.join(process.cwd(), '.env.example');

  if (!fs.existsSync(envPath)) {
    if (fs.existsSync(envExamplePath)) {
      fs.copyFileSync(envExamplePath, envPath);
      logSuccess('Created .env file from .env.example');
      logWarning('Please update the environment variables in .env before continuing');
      
      return new Promise((resolve) => {
        rl.question('Press Enter to continue or Ctrl+C to exit... ', () => {
          resolve();
        });
      });
    } else {
      logError('.env.example file not found');
      process.exit(1);
    }
  }

  logSuccess('Environment setup complete');
}

// Deploy Supabase backend
async function deploySupabase() {
  logStep('Deploying Supabase backend...');

  const supabaseDir = path.join(process.cwd(), 'supabase');
  process.chdir(supabaseDir);

  try {
    // Check if linked
    try {
      await executeCommand('supabase', ['status']);
    } catch (error) {
      log('🔗 Linking to Supabase project...', 'blue');
      await executeCommand('supabase', ['link']);
    }

    // Push database schema
    log('📊 Pushing database schema...', 'blue');
    await executeCommand('supabase', ['db', 'push']);

    // Deploy Edge Functions
    log('⚡ Deploying Edge Functions...', 'blue');
    await executeCommand('supabase', ['functions', 'deploy', '--no-verify-jwt']);

    // Set secrets if environment variable exists
    if (process.env.ROBOFLOW_API_KEY) {
      log('🔐 Setting Roboflow API key...', 'blue');
      await executeCommand('supabase', ['secrets', 'set', `ROBOFLOW_API_KEY=${process.env.ROBOFLOW_API_KEY}`]);
    }

    logSuccess('Supabase deployment complete');
  } finally {
    process.chdir('..');
  }
}

// Deploy frontend
async function deployFrontend() {
  logStep('Building and deploying frontend...');

  // Install dependencies
  log('📦 Installing dependencies...', 'blue');
  await executeCommand('npm', ['install']);

  // Build application
  log('🔨 Building application...', 'blue');
  await executeCommand('npm', ['run', 'build']);

  // Deploy to Firebase Hosting
  log('🌐 Deploying to Firebase Hosting...', 'blue');
  await executeCommand('firebase', ['deploy', '--only', 'hosting']);

  logSuccess('Frontend deployment complete');
}

// Run tests
async function runTests() {
  logStep('Running tests...');

  try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    if (packageJson.scripts && packageJson.scripts.test) {
      await executeCommand('npm', ['test', '--', '--watchAll=false']);
    } else {
      logWarning('No tests found');
    }
  } catch (error) {
    logWarning('Error running tests or no tests found');
  }

  logSuccess('Tests complete');
}

// Interactive menu
async function interactiveMenu() {
  log('🎯 GMShooter v2 Deployment Script', 'bright');
  log('==================================', 'bright');
  log('');

  log('What would you like to deploy?');
  log('1) Backend (Supabase) only');
  log('2) Frontend only');
  log('3) Both (recommended)');
  log('4) Run tests only');
  log('5) Full deployment with tests');
  log('');

  return new Promise((resolve) => {
    rl.question('Enter your choice (1-5): ', (choice) => {
      resolve(choice);
    });
  });
}

// Main deployment function
async function main() {
  const command = process.argv[2];

  try {
    if (command === 'help' || command === '-h' || command === '--help') {
      log('Usage: node deploy.js [command]', 'bright');
      log('');
      log('Commands:', 'bright');
      log('  supabase   Deploy Supabase backend only');
      log('  frontend   Deploy frontend only');
      log('  test       Run tests only');
      log('  full       Full deployment with tests');
      log('  help       Show this help message');
      log('');
      log('If no command is provided, the interactive deployment wizard will start.');
      return;
    }

    await checkRequirements();
    await setupEnvironment();

    let choice = command;
    if (!choice) {
      choice = await interactiveMenu();
    }

    switch (choice) {
      case '1':
      case 'supabase':
        await deploySupabase();
        break;
      case '2':
      case 'frontend':
        await deployFrontend();
        break;
      case '3':
      case 'both':
        await deploySupabase();
        await deployFrontend();
        break;
      case '4':
      case 'test':
        await runTests();
        break;
      case '5':
      case 'full':
        await runTests();
        await deploySupabase();
        await deployFrontend();
        break;
      default:
        logError('Invalid choice');
        process.exit(1);
    }

    log('');
    log('🎉 Deployment completed successfully!', 'bright');
    log('');
    log('Next steps:', 'bright');
    log('1. Update your environment variables if not already done');
    log('2. Test the application at your Firebase Hosting URL');
    log('3. Monitor the Supabase dashboard for any issues');
    log('4. Check the Edge Functions logs for debugging');
    log('');
    log('Useful commands:', 'bright');
    log('- View Supabase logs: supabase functions logs');
    log('- View database: supabase db studio');
    log('- Local development: npm start');

  } catch (error) {
    logError(`Deployment failed: ${error.message}`);
    process.exit(1);
  } finally {
    rl.close();
  }
}

// Handle process termination
process.on('SIGINT', () => {
  log('\n🛑 Deployment cancelled by user', 'yellow');
  rl.close();
  process.exit(0);
});

// Run main function
if (require.main === module) {
  main();
}

module.exports = {
  checkRequirements,
  setupEnvironment,
  deploySupabase,
  deployFrontend,
  runTests
};