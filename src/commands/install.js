import { Command } from 'commander';

const install = new Command('install')
    .description('Install and set up a repository from a URL')
    .argument('<repo_url>', 'The URL of the repository to install')
    .option('-y, --yes', 'Skip all interactive prompts')
    .action((repoUrl, options) => {
        console.log(`Installing from ${repoUrl}`);
        if (options.yes) {
            console.log('Skipping prompts.');
        }
    });

export default install; 