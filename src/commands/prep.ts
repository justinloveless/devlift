import { Command } from 'commander';
import inquirer from 'inquirer';
import fs from 'fs-extra';
import yaml from 'js-yaml';
import chalk from 'chalk';

interface SetupStep {
    type: string;
    name: string;
    command: string;
}

const prep = new Command('prep')
    .alias('init')
    .description('Prepare a new dev.yml configuration file for the current project')
    .action(async () => {
        if (fs.pathExistsSync('dev.yml')) {
            const { overwrite } = await inquirer.prompt([
                {
                    type: 'confirm',
                    name: 'overwrite',
                    message: 'dev.yml already exists. Overwrite?',
                    default: false,
                },
            ]);
            if (!overwrite) {
                console.log('Aborted.');
                return;
            }
        }

        console.log(chalk.cyan("Welcome to the devlift configuration wizard!"));
        const steps: SetupStep[] = [];
        let addAnotherStep = true;

        while (addAnotherStep) {
            const { addStep } = await inquirer.prompt([
                { type: 'confirm', name: 'addStep', message: 'Add a setup step?', default: true }
            ]);

            if (!addStep) {
                addAnotherStep = false;
                continue;
            }

            const step = await inquirer.prompt([
                { type: 'list', name: 'type', message: 'Step type:', choices: ['shell'] },
                { type: 'input', name: 'name', message: 'Name for this step:' },
                { type: 'input', name: 'command', message: 'Command to run:' },
            ]);
            steps.push(step);

            const { addMore } = await inquirer.prompt([
                { type: 'confirm', name: 'addMore', message: 'Add another step?', default: false }
            ]);
            addAnotherStep = addMore;
        }

        const config = {
            version: '1',
            setup_steps: steps,
        };

        const yamlStr = yaml.dump(config);
        fs.writeFileSync('dev.yml', yamlStr);
        console.log(chalk.green('✅ dev.yml created successfully!'));
    });

export default prep; 