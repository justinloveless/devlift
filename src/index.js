import { program } from "commander"; // or const { program } = require('commander'); for CommonJS
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import installCommand from './commands/install.js';
import initCommand from './commands/init.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));

program
    .version(pkg.version)
    .description(pkg.description);

program.addCommand(installCommand);
program.addCommand(initCommand);

program.parse(process.argv);
