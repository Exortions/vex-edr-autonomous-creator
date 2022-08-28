import BuildConfig from './BuildConfig.js';
import fs from 'fs';

import * as Static from '../util/static.js';

class Action {
    private readonly action: any;
    private readonly value: number;

    private args?: string[];

    constructor(action: string, value: number, args?: any[]) {
        this.action = action;
        this.value = value;

        if (args) this.args = args;
    }

    public getAction(): string {
        return this.action;
    }

    public getValue(): number {
        return this.value;
    }

    public getArgs(): any[] | undefined {
        return this.args;
    }
}

abstract class IAction {
    protected readonly config: BuildConfig;
    protected readonly action: Action;

    constructor(config: BuildConfig, action: Action) {
        this.config = config;
        this.action = action;
    }

    abstract build(): string;
}

class MoveAction extends IAction {
    constructor(config: BuildConfig, action: Action) {
        super(config, action);
    }

    public build(): string {
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
    constructor(config: BuildConfig, action: Action) {
        super(config, action);
    }

    public build(): string {
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
    constructor(config: BuildConfig, action: Action) {
        super(config, action);
    }

    public build(): string {
        return `wait(${this.action.getValue() * 10}, msec);`;
    }
}

class RunMotorAction extends IAction {
    constructor(config: BuildConfig, action: Action) {
        super(config, action);
    }

    public build(): string {
        const args = this.action.getArgs();

        if (!args) throw new Error('Invalid Input: RunMotor action has no arguments');

        let power: number = args[1];

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
    private readonly actions: Map<string, any>;

    private readonly config: BuildConfig;
    private readonly code: string;

    constructor(config: BuildConfig) {
        this.config = config;

        this.code = config.getCreatorCode();

        this.actions = new Map();

        this.actions.set('move', MoveAction);
        this.actions.set('turn', TurnAction);
        this.actions.set('wait', WaitAction);
        this.actions.set('run_motor', RunMotorAction);
    }

    public buildCreator(): void {
        const name = `${this.config.getOutputDir()}/autonomous-creator.${this.config.getCreatorCodeExtension()}`;

        fs.writeFileSync(name, this.code);
    }

    public build(): void {
        const input: string = this.config.getInputFile();

        this.prepareInputFile(input);

        const templateCode = Static.TEMPLATE_CODE;

        const actions: Action[] = this.parseInput(input);
        let actionCode = '';

        const ports = this.config.getPorts();

        let motors = '';

        const drive = ports.drive;
        const alwaysRunning = ports.always_running;

        alwaysRunning.forEach((port: any) => {
            actionCode += `  always_running_${port.port}.set_velocity(100, PERCENT);\n  always_running_${port.port}.spin(FORWARD);\n`;
        });

        actions.forEach((action: Action) => {
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

        alwaysRunning.forEach((port: { port: string; reverse: boolean }) => {
            motors += `motor always_running_${port.port} = motor(PORT${port.port}, ratio18_1, ${
                port.reverse ? 'true' : 'false'
            });\n`;
        });

        this.config
            .getPorts()
            .motors.forEach((motor: { name: string; port: string; reverse: boolean; gear: string }) => {
                motors += `motor motor_${motor.name} = motor(PORT${motor.port}, ratio18_1, ${
                    motor.reverse ? 'true' : 'false'
                });\n`;
            });

        const code = templateCode.replace('{MOTORS}', motors).replace('{ACTIONS}', actionCode);

        const name = `${this.config.getOutputDir()}/autonomous-creator-output.cpp`;

        fs.writeFileSync(name, code);
    }

    private parseInput(input: string): Action[] {
        const actions: Action[] = [];

        const data: { code: { action: string; value: number; args?: string[] }[] } = JSON.parse(
            fs.readFileSync(input).toString(),
        );

        let i: number = 0;

        data.code.forEach((action: { action: string; value: number; args?: string[] }) => {
            actions[i] = new Action(action.action, action.value, action.args);

            i += 1;
        });

        return actions;
    }

    private prepareInputFile(input: string) {
        const replacements: { text: RegExp; replacement: string }[] = [
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

        let data: string = fs.readFileSync(input).toString();

        for (const replacement of replacements) data = data.replace(replacement.text, replacement.replacement);

        fs.writeFileSync(input, data);
    }

    private parseAction(action: Action): string {
        const key = action.getAction();
        const actionClass = this.actions.get(key);

        if (!actionClass) throw new Error(`Invalid action: ${key}`);

        const instance = new actionClass(this.config, action);

        return instance.build();
    }
}
