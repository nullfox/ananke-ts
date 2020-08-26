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

const copyFile = (source: string, destination: string): void => {
  const dir = dirname(destination);

  mkdirp.sync(dir);

  copyFileSync(source, destination);
};

const copyCliFile = (file: string, destinationRoot: string): void => {
  copyFile(
    join(__dirname, '..', 'templates', file),
    join(destinationRoot, file),
  );
};

const program = new Command();
program.version('0.0.1');

program
  .command('init <name>')
  .description('Initialize an Ananke service')
  .option('-p, --packages [package...]', 'Additional @ananke scoped packages to install ex: config-ssm-convict')
  .action((name) => {
    // Create the root dir
    const root = createRootDirectory(name);

    // Move into the new dir
    process.chdir(root);

    // Initiate NPM'ness
    execSync('npm init --yes');

    // Install deps
    execSync('npm install --save @ananke/runtime @ananke/config-ssm-convict @ananke/sequelize mysql2');
    execSync('npm install --save-dev @ananke/serverless @tsconfig/node12 serverless-offline serverless-pseudo-parameters typescript aws-sdk');

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

    // Copy files
    copyCliFile('tsconfig.json', root);
    copyCliFile('serverless.yml', root);

    // Ensure src/ dir exists
    mkdirp.sync(join(root, 'src'));

    copyCliFile('src/global.d.ts', root);
    copyCliFile('src/context.ts', root);
    copyCliFile('src/functions/authenticator.ts', root);
    copyCliFile('src/functions/rpc/hello.world.ts', root);
    copyCliFile('src/models/index.ts', root);
    copyCliFile('src/models/member.ts', root);

    execSync('npm run build');
  });

program.parse(process.argv);

