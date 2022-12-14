import BuildConfig from './build/BuildConfig.js';
import Builder from './build/Builder.js';
import inquirer from 'inquirer';
import * as url from 'url';
import path from 'path';
import fs from 'fs';
const TEMPLATE_CODE =
    '#pragma region VEX Autonomous Creator Generated Robot Configuration\n#include <stdio.h>\n#include <stdlib.h>\n#include <stdbool.h>\n#include <math.h>\n#include <string.h>\n\n#include "vex.h"\n\nusing namespace vex;\n\nbrain Brain;\n\n#define waitUntil(condition)\n\ndo {\n    wait(5, msec);\n  } while (!(condition))\n\n#define repeat(iterations)\n  for (int iterator = 0; iterator < iterations; iterator++)\n\n{MOTORS}\n#pragma endregion VEX Autonomous Creator Generated Robot Configuration\n\nint main() {\n{ACTIONS}}';
function CREATOR_CPP() {
    return fs.readFileSync(path.join(__dirname, '../../../creator.cpp')).toString();
}
function CREATOR_PY() {
    return fs.readFileSync(path.join(__dirname, '../../../creator.py')).toString();
}

class Action {
    action;
    value;
    args;
    constructor(action, value, args) {
        this.action = action;
        this.value = value;
        if (args) this.args = args;
    }
    getAction() {
        return this.action;
    }
    getValue() {
        return this.value;
    }
    getArgs() {
        return this.args;
    }
}
class IAction {
    config;
    action;
    constructor(config, action) {
        this.config = config;
        this.action = action;
    }
}
class MoveAction extends IAction {
    constructor(config, action) {
        super(config, action);
    }
    build() {
        if (this.config.getPorts().drive.type === 'regular-drive') {
            return `Drivetrain.driveFor(forward, ${this.action.getValue()}, mm);`;
        } else if (this.config.getPorts().drive.type === 'x-drive') {
            return `move(${this.action.getValue()});`;
        } else {
            throw new Error('Unknown drive type: ' + this.config.getPorts().drive.type);
        }
    }
}
class TurnAction extends IAction {
    constructor(config, action) {
        super(config, action);
    }
    build() {
        if (this.config.getPorts().drive.type === 'regular-drive') {
            const args = this.action.getArgs();
            if (!args) throw new Error('Invalid Input: Turn action has no arguments');
            const built = `Drivetrain.turnFor(${args[0]}, ${this.action.getValue()}, degrees);`;
            return built;
        } else if (this.config.getPorts().drive.type === 'x-drive') {
            return `turn(${this.action.getValue()});`;
        } else {
            throw new Error('Unknown drive type: ' + this.config.getPorts().drive.type);
        }
    }
}
class WaitAction extends IAction {
    constructor(config, action) {
        super(config, action);
    }
    build() {
        return `wait(${this.action.getValue() * 10}, msec);`;
    }
}
class RunMotorAction extends IAction {
    constructor(config, action) {
        super(config, action);
    }
    build() {
        const args = this.action.getArgs();
        if (!args) throw new Error('Invalid Input: RunMotor action has no arguments');
        let power = args[1];
        const motorId = args[0];
        const motor = this.config.getPorts().motors.find((m) => m.name === motorId);
        if (!motor) throw new Error(`Invalid Input: Motor with id ${motorId} not found`);
        if (!power) power = 100;
        const built = `motor_${motorId}.setVelocity(${power}, percent);\n  motor_${motorId}.spinToPosition(${
            this.action.getValue() * 10
        }, degrees);`;
        return built;
    }
}
export default class Builder {
    actions;
    config;
    code;
    constructor(config) {
        this.config = config;
        this.code = config.getCreatorCode();
        this.actions = new Map();
        this.actions.set('move', MoveAction);
        this.actions.set('turn', TurnAction);
        this.actions.set('wait', WaitAction);
        this.actions.set('run_motor', RunMotorAction);
    }
    buildCreator() {
        const name = `${this.config.getOutputDir()}/autonomous-creator.${this.config.getCreatorCodeExtension()}`;
        fs.writeFileSync(name, this.code);
    }
    build() {
        const input = this.config.getInputFile();
        this.prepareInputFile(input);
        const templateCode = TEMPLATE_CODE;
        const actions = this.parseInput(input);
        let actionCode = '';
        const ports = this.config.getPorts();
        let motors = '';
        const drive = ports.drive;
        const alwaysRunning = ports.always_running;
        alwaysRunning.forEach((port) => {
            actionCode += `  always_running_${port.port}.set_velocity(100, PERCENT);\n  always_running_${port.port}.spin(FORWARD);\n`;
        });
        actions.forEach((action) => {
            const code = this.parseAction(action);
            actionCode += '  ' + code + '\n';
        });
        if (this.config.getPorts().drive.type === 'regular-drive') {
            const left = drive.left;
            const right = drive.right;
            motors += `motor left_drive = motor(PORT${left.port}, ratio18_1, ${left.reverse ? 'true' : 'false'});\n`;
            motors += `motor right_drive = motor(PORT${right.port}, ratio18_1, ${right.reverse ? 'true' : 'false'});\n`;
            motors += `drivetrain Drivetrain = drivetrain(left_drive, right_drive, 319.19, 295, 40, mm, 1);\n`;
        } else if (this.config.getPorts().drive.type === 'x-drive') {
            const front = drive.front;
            const back = drive.back;
            const front_right = front.right;
            const front_left = front.left;
            const back_right = back.right;
            const back_left = back.left;
            motors += `motor front_right_drive = motor(PORT${front_right.port}, ratio18_1, ${
                front_right.reverse ? 'true' : 'false'
            });\n`;
            motors += `motor front_left_drive = motor(PORT${front_left.port}, ratio18_1, ${
                front_left.reverse ? 'true' : 'false'
            });\n`;
            motors += `motor back_right_drive = motor(PORT${back_right.port}, ratio18_1, ${
                back_right.reverse ? 'true' : 'false'
            });\n`;
            motors += `motor back_left_drive = motor(PORT${back_left.port}, ratio18_1, ${
                back_left.reverse ? 'true' : 'false'
            });\n`;
            const mm_to_turns = this.config.getPorts().drive.config.wheel_size * Math.PI * (18 / 1);
            motors += `void move(int mm) {\n  int amount = mm / ${mm_to_turns};\n  front_right_drive.spinFor(forward, amount, turns);\n  front_left_drive.spinFor(forward, amount, turns);\n  back_right_drive.spinFor(forward, amount, turns);\n  back_left_drive.spinFor(forward, amount, turns);\n}\n`;
            motors += `void turn(int deg) {\n  int opposite = deg * -1;\n  bool left = deg < 0;\n  if (left) {\n    front_left_drive.spinFor(forward, opposite, degrees);\n    back_left_drive.spinFor(forward, opposite, degrees);\n    front_right_drive.spinFor(forward, deg, degrees);\n    back_right_drive.spinFor(forward, deg, degrees);\n  } else {\n    front_right_drive.spinFor(forward, opposite, degrees);\n    back_right_drive.spinFor(forward, opposite, degrees);\n    front_left_drive.spinFor(forward, deg, degrees);\n    back_left_drive.spinFor(forward, deg, degrees);\n  }\n}\n`;
        }
        alwaysRunning.forEach((port) => {
            motors += `motor always_running_${port.port} = motor(PORT${port.port}, ratio18_1, ${
                port.reverse ? 'true' : 'false'
            });\n`;
        });
        this.config.getPorts().motors.forEach((motor) => {
            motors += `motor motor_${motor.name} = motor(PORT${motor.port}, ratio18_1, ${
                motor.reverse ? 'true' : 'false'
            });\n`;
        });
        const code = templateCode.replace('{MOTORS}', motors).replace('{ACTIONS}', actionCode);
        const name = `${this.config.getOutputDir()}/autonomous-creator-output.cpp`;
        fs.writeFileSync(name, code);
    }
    parseInput(input) {
        const actions = [];
        const data = JSON.parse(fs.readFileSync(input).toString());
        let i = 0;
        data.code.forEach((action) => {
            actions[i] = new Action(action.action, action.value, action.args);
            i += 1;
        });
        return actions;
    }
    prepareInputFile(input) {
        const replacements = [
            {
                text: /True/g,
                replacement: 'true',
            },
            {
                text: /False/g,
                replacement: 'false',
            },
            {
                text: /\'/g,
                replacement: '"',
            },
            {
                text: /None/g,
                replacement: 'null',
            },
        ];
        let data = fs.readFileSync(input).toString();
        for (const replacement of replacements) data = data.replace(replacement.text, replacement.replacement);
        fs.writeFileSync(input, data);
    }
    parseAction(action) {
        const key = action.getAction();
        const actionClass = this.actions.get(key);
        if (!actionClass) throw new Error(`Invalid action: ${key}`);
        const instance = new actionClass(this.config, action);
        return instance.build();
    }
}
class BuildConfig {
    code_extension;
    creator_code;
    output_dir;
    input_file;
    ports;
    wheel_diameter;
    config;
    constructor(code_extension, creator_code, output_dir, input_file, ports, wheel_diameter, config) {
        this.code_extension = code_extension;
        this.creator_code = creator_code;
        this.output_dir = output_dir;
        this.input_file = input_file;
        this.ports = ports;
        this.wheel_diameter = wheel_diameter;
        this.config = config;
        if (!fs.existsSync(this.output_dir)) fs.mkdirSync(this.output_dir);
    }
    getCreatorCodeExtension() {
        switch (this.code_extension) {
            case 'py':
                return this.code_extension;
            case 'cpp':
                return this.code_extension;
            default:
                throw new Error('Unknown file extension: ' + this.code_extension);
        }
    }
    getCreatorCode() {
        return this.creator_code;
    }
    getOutputDir() {
        return this.output_dir;
    }
    getInputFile() {
        return this.input_file;
    }
    getPorts() {
        return this.ports;
    }
    getWheelDiameter() {
        return this.wheel_diameter;
    }
    getConfig() {
        return this.config;
    }
}
async function main(builder, config) {
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
    const ports = config.ports;
    const ext = 'py';
    let creator = ext === 'py' ? CREATOR_PY() : CREATOR_CPP();
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
