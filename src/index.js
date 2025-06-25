#!/usr/bin/env node
import { program } from "commander"; // or const { program } = require('commander'); for CommonJS
import pkg from '../package.json' with { type: 'json' };
import installCommand from './commands/install.js';
import initCommand from './commands/init.js';

program
    .version(pkg.version)
    .description(pkg.description);

program.addCommand(installCommand);
program.addCommand(initCommand);

program.parse(process.argv);
