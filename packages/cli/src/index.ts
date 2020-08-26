#!/usr/bin/env node

import mkdirp from 'mkdirp';

import {
  execSync,
} from 'child_process';

import {
  copyFileSync,
  mkdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from 'fs';

import {
  dirname,
  join,
} from 'path';

import {
  Command,
} from 'commander';

const createRootDirectory = (name: string): string => {
  const root = join(process.cwd(), name);

  const make = () => mkdirSync(root);

  try {
    const stat = statSync(root);

    if (stat.isDirectory()) {
      throw new Error(`Directory ${name} already exists`);
    }

    make();

    return root;
  } catch (error) {
    if (error.code === 'ENOENT') {
      make();

      return root;
    }

    throw error;
  }
};

const createFileManager = (root: string, prefix: string = 'js'): { [key: string]: Function } => (
  {
    copyFile(file: string): void {
      if (!/\.{1}ts|js$/.test(file)) {
        file = `${file}.${prefix}`;
      }

      const source = join(__dirname, '..', 'templates', prefix, file);
      const destination = join(root, file);

      const dir = dirname(destination);

      mkdirp.sync(dir);

      copyFileSync(source, destination);
    },
  }
);

const program = new Command();
program.version('0.0.1');

program
  .command('init <name>')
  .description('Initialize an Ananke service')
  .option('-t, --type <type>', 'Whether you want plain "js" or "ts" project generated. Defaults to "ts"', 'ts')
  .option('-p, --packages [package...]', 'Additional @ananke scoped packages to install ex: config-ssm-convict')
  .action((name, cmd) => {
    const isTypescript = cmd.type === 'ts';

    // Create the root dir
    const root = createRootDirectory(name);

    // Move into the new dir
    process.chdir(root);

    const fileManager = createFileManager(root, cmd.type);

    // Initiate NPM'ness
    execSync('npm init --yes');

    // Install deps
    const devDeps = [
      '@ananke/serverless',
      'serverless-offline',
      'serverless-pseudo-parameters',
      'aws-sdk',
    ];

    if (isTypescript) {
      devDeps.push(
        '@tsconfig/node12',
        'typescript',
      );
    }

    execSync('npm install --save @ananke/runtime @ananke/config-ssm-convict @ananke/sequelize mysql2');
    execSync(`npm install --save-dev ${devDeps.join(' ')}`);

    if (isTypescript) {
      const packagePath = join(root, 'package.json');

      const packageJson = JSON.parse(
        readFileSync(packagePath).toString(),
      );

      // Setup build script
      packageJson.scripts.build = 'tsc';

      writeFileSync(
        packagePath,
        JSON.stringify(packageJson, null, 4),
      );
    }

    // Copy files
    fileManager.copyFile('tsconfig.json');
    fileManager.copyFile('serverless.yml');

    // Ensure src/ dir exists
    mkdirp.sync(join(root, 'src'));

    fileManager.copyFile('src/context');
    fileManager.copyFile('src/functions/authenticator');
    fileManager.copyFile('src/functions/rpc/hello.world');
    fileManager.copyFile('src/models/index');
    fileManager.copyFile('src/models/member');

    if (isTypescript) {
      fileManager.copyFile('src/global.d.ts');
    }

    execSync('npm run build');
  });

program.parse(process.argv);

