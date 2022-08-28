import fs from 'fs';

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

export default class BuildConfig {
    private readonly code_extension: string;
    private readonly creator_code: string;
    private readonly output_dir: string;

    private readonly input_file: string;

    private readonly ports: {
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
    };

    private readonly wheel_diameter: number;

    private readonly config: any;

    constructor(
        code_extension: string,
        creator_code: string,
        output_dir: string,
        input_file: string,
        ports: {
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
        },
        wheel_diameter: number,
        config: any,
    ) {
        this.code_extension = code_extension;
        this.creator_code = creator_code;
        this.output_dir = output_dir;

        this.input_file = input_file;

        this.ports = ports;

        this.wheel_diameter = wheel_diameter;

        this.config = config;

        if (!fs.existsSync(this.output_dir)) fs.mkdirSync(this.output_dir);
    }

    public getCreatorCodeExtension(): string {
        switch (this.code_extension) {
            case 'py':
                return this.code_extension;
            case 'cpp':
                return this.code_extension;
            default:
                throw new Error('Unknown file extension: ' + this.code_extension);
        }
    }

    public getCreatorCode(): string {
        return this.creator_code;
    }

    public getOutputDir(): string {
        return this.output_dir;
    }

    public getInputFile(): string {
        return this.input_file;
    }

    public getPorts(): {
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
    } {
        return this.ports;
    }

    public getWheelDiameter(): number {
        return this.wheel_diameter;
    }

    public getConfig(): any {
        return this.config;
    }
}
