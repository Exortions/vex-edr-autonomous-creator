import BuildConfig from './build/BuildConfig.js';
import Builder from './build/Builder.js';
import inquirer from 'inquirer';
import fs from 'fs';

import * as Static from './util/static.js';

async function main(builder: Builder, config: BuildConfig) {
    const res = await inquirer.prompt([
        {
            type: 'list',
            name: 'action',
            message: 'What action would you like to do?',
            choices: ['Build Autonomous', 'Create Compiler Program', 'Reload', 'Exit'],
        },
    ]);

    if (res.action === 'Build Autonomous') {
        builder.build();
        console.log(
            'Successfully built autonomous program to ' + config.getOutputDir() + '/autonomous-creator-output.cpp',
        );
    } else if (res.action === 'Create Compiler Program') {
        builder.buildCreator();
        console.log(
            'Successfully built compiler program to ' +
                config.getOutputDir() +
                '/autonomous-creator.' +
                config.getCreatorCodeExtension(),
        );
    } else if (res.action === 'Reload') {
        console.log('Reloading...');
        await start();
    } else process.exit(0);

    await main(builder, config);
}

async function start() {
    const configFile = fs.readFileSync('data/config.json').toString();
    const config = JSON.parse(configFile);

    type Port = {
        port: string;
        reverse: boolean;
        gear: '18:1' | '36:1' | '6:1';
    };

    type Motor = {
        name: string;
        port: string;
        reverse: boolean;
        gear: '18:1' | '36:1' | '6:1';
    };

    const ports: {
        drive: {
            type: 'regular-drive' | 'x-drive';
            config: {
                wheel_circumference: number;
                wheel_size: number;
                track_width: number;
                wheelbase: number;
                gear_ratio: number;
            };
            front: { left: Port; right: Port };
            back: { left: Port; right: Port };
            left: Port;
            right: Port;
        };
        always_running: Port[];
        motors: Motor[];
    } = config.ports;

    const ext = 'py';

    let creator = ext === 'py' ? Static.CREATOR_PY() : Static.CREATOR_CPP();

    if (ext === 'py') {
        let configuration = JSON.stringify(config.ports);

        configuration = configuration.replace(/true/g, 'True');
        configuration = configuration.replace(/false/g, 'False');
        configuration = configuration.replace(/\"/g, "'");
        configuration = configuration.replace(/null/g, 'None');

        creator = creator.replace(/#{CONFIGURATION}/g, `config = ${configuration}`);
    }

    const buildConfig = new BuildConfig(
        ext,
        creator,
        config.output_dir,
        config.input_file,
        ports,
        config.wheel_diameter,
        config,
    );

    if (!fs.existsSync(buildConfig.getOutputDir())) fs.mkdirSync(buildConfig.getOutputDir());

    const builder = new Builder(buildConfig);

    await main(builder, buildConfig);
}

(async () => {
    await start();
})();
