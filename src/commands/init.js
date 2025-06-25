import { Command } from 'commander';

const init = new Command('init')
    .description('Create a new dev.yml configuration file in the current directory')
    .action(() => {
        console.log('Initializing dev.yml...');
    });

export default init; 