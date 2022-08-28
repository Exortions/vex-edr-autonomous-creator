import path from 'path';
import fs from 'fs';

import * as url from 'url';

const __dirname = url.fileURLToPath(new URL(import.meta.url));

export const TEMPLATE_CODE =
    '#pragma region VEX Autonomous Creator Generated Robot Configuration\n#include <stdio.h>\n#include <stdlib.h>\n#include <stdbool.h>\n#include <math.h>\n#include <string.h>\n\n#include "vex.h"\n\nusing namespace vex;\n\nbrain Brain;\n\n#define waitUntil(condition)\n\ndo {\n    wait(5, msec);\n  } while (!(condition))\n\n#define repeat(iterations)\n  for (int iterator = 0; iterator < iterations; iterator++)\n\n{MOTORS}\n#pragma endregion VEX Autonomous Creator Generated Robot Configuration\n\nint main() {\n{ACTIONS}}';

export function CREATOR_CPP(): string {
    return fs.readFileSync(path.join(__dirname, '../../../creator.cpp')).toString();
}

export function CREATOR_PY(): string {
    return fs.readFileSync(path.join(__dirname, '../../../creator.py')).toString();
}
