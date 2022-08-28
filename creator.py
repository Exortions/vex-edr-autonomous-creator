#region VEX EDR Autonomous Creator Generated Configuration
from vex import *
import math

joystick = Controller(PRIMARY)
brain=Brain()

wait(30, MSEC)

#endregion VEX EDR Autonomous Creator Generated Configuration
from vex import *

#{CONFIGURATION}

if config == None:
    print('Failed to inject configuration, exiting...')
    exit(1)

print(config)

def getGearRatioFromString(string: str):
    if string == '18:1':
        return GearSetting.RATIO_18_1
    elif string == '36:1':
        return GearSetting.RATIO_36_1
    elif string == '6:1':
        return GearSetting.RATIO_6_1
    else:
        raise Exception('Invalid gear ratio')

def getPortFromNum(num: int):
    if num == 1:
        return Ports.PORT1
    elif num == 2:
        return Ports.PORT2
    elif num == 3:
        return Ports.PORT3
    elif num == 4:
        return Ports.PORT4
    elif num == 5:
        return Ports.PORT5
    elif num == 6:
        return Ports.PORT6
    elif num == 7:
        return Ports.PORT7
    elif num == 8:
        return Ports.PORT8
    elif num == 9:
        return Ports.PORT9
    elif num == 10:
        return Ports.PORT10
    elif num == 11:
        return Ports.PORT11
    elif num == 12:
        return Ports.PORT12
    else:
        raise Exception('Invalid port number')

def mm_to_turns(wheel_diameter: int, mm: int, gear_ratio: int) -> int:
    return mm / ((wheel_diameter * math.pi) * gear_ratio)

class Drive:

    right_motor = None
    left_motor = None

    train = None

    def __init__(self) -> None:
        right = config['drive']['right']
        left = config['drive']['left']

        self.right_motor = Motor(getPortFromNum(right['port']), getGearRatioFromString(right['gear']), right['reverse'])
        self.left_motor = Motor(getPortFromNum(left['port']), getGearRatioFromString(left['gear']), left['reverse'])

        self.train = DriveTrain(self.left_motor, self.right_motor, config['drive']['config']['wheel_circumference'], config['drive']['config']['track_width'], config['drive']['config']['wheelbase'], MM, 1)
    
    def drive(self, forward: bool, distance: int):
        self.train.drive_for((FORWARD if forward else REVERSE), distance, MM)
    
    def turn(self, left: bool, degrees: int):
        self.train.turn_for((LEFT if left else RIGHT), degrees, DEGREES)

class XDrive:

    front_right_motor = None
    front_left_motor = None
    rear_right_motor = None
    rear_left_motor = None

    def __init__(self) -> None:
        front = config['drive']['front']
        rear = config['drive']['back']

        self.front_right_motor = self.create_motor(front['right'])
        self.front_left_motor = self.create_motor(front['left'])
        self.rear_right_motor = self.create_motor(rear['right'])
        self.rear_left_motor = self.create_motor(rear['left'])

    def create_motor(self, motor: dict) -> Motor:
        return Motor(getPortFromNum(motor['port']), getGearRatioFromString(motor['gear']), motor['reverse'])

    def drive(self, forward: bool, distance: int):
        def spin(motor):
            motor.spin_for(FORWARD if forward else REVERSE, mm_to_turns(config['drive']['config']['wheel_diameter'], distance, config['drive']['config']['gear_ratio']), TURNS)

        spin(self.fron6t_right_motor)
        spin(self.front_left_motor)
        spin(self.rear_right_motor)
        spin(self.rear_left_motor)

    def turn(self, left: bool, degrees: int):
        left = degrees < 0

        degrees_opposite = degrees * -1
        
        if left:
            self.front_left_motor.spin_for(FORWARD, degrees_opposite, DEGREES)
            self.rear_left_motor.spin_for(FORWARD, degrees_opposite, DEGREES)
            self.front_right_motor.spin_for(FORWARD, degrees, DEGREES)
            self.rear_right_motor.spin_for(FORWARD, degrees, DEGREES)
        else:
            self.front_left_motor.spin_for(FORWARD, degrees, DEGREES)
            self.rear_left_motor.spin_for(FORWARD, degrees, DEGREES)
            self.front_right_motor.spin_for(FORWARD, degrees_opposite, DEGREES)
            self.rear_right_motor.spin_for(FORWARD, degrees_opposite, DEGREES)

class DTrain:

    d = None

    def __init__(self, drive_type) -> None:
        if drive_type == 'regular-drive':
            self.d = Drive()
        elif drive_type == 'x-drive':
            self.d = XDrive()
        else:
            raise Exception('Invalid drive type')

    def drive(self, forward: bool, distance: int):
        self.d.drive(forward, distance)
    
    def turn(self, left: bool, degrees: int):
        self.d.turn(left, degrees)

class UI:

    def __init__(self) -> None:
        pass

    def display(self, message: str):
        brain.screen.print(message)
    
    def select(self, message: str, options: list, callback = None) -> str:
        current = options[0]

        while True:
            self.display(message + current)

            if joystick.buttonL1.pressing():
                # Set the current to the option previous to the current
                current = options[(options.index(current) - 1) % len(options)]
        
            if joystick.buttonR1.pressing():
                # Set the current to the option next to the current
                current = options[(options.index(current) + 1) % len(options)]

            if callback != None:
                callback(current)

            if joystick.buttonR2.pressing():
                return current

            wait(250, MSEC)
    
    def select_integer(self, message: str, min: int, max: int, callback = None, start: int = 0, increase=None, decrease=None) -> int:
        current = start

        while True:
            self.display(message + str(current))

            if joystick.buttonL1.pressing():
                # Set the current to the option previous to the current
                current = (current - 1) % (max - min + 1) + min
        
                if decrease != None:
                    decrease(current)

            if joystick.buttonR1.pressing():
                # Set the current to the option next to the current
                current = (current + 1) % (max - min + 1) + min

                if increase != None:
                    increase(current)

            if callback != None:
                callback(current)

            if joystick.buttonR2.pressing():
                return current

            wait(250, MSEC)

def save():
    print('Saved actions: \n----------------')
    print(str(actions))
    print('----------------')

    wait(250, MSEC)

def select_action():
    availiable_actions = ['Move', 'Turn', 'Wait']

    def callback(action: str):
        if joystick.buttonL2.pressing():
            save()

    action = ui.select('Select action: ', availiable_actions, callback)

    return action

def select_value(increase=None, decrease=None) -> int:
    return ui.select_integer('Select value: ', -1000, 1000, start=0, increase=increase, decrease=decrease)

def run() -> None:
    def move_increase():
        drive.drive(True, 10)

    def move_decrease():
        drive.drive(False, 10)

    def turn_increase():
        drive.turn(False, 1)

    def turn_decrease():
        drive.turn(False, -1)

    action = select_action()

    if action == 'Move':
        value = select_value(move_increase, move_decrease)

        wait(100, MSEC)

        actions.append({ 'type': 'move', 'value': value })

        print('Saved move action')
    elif action == 'Turn':
        value = select_value(turn_increase, turn_decrease)

        wait(100, MSEC)

        actions.append({ 'type': 'turn', 'value': value, 'args': [ 'right' ] })

        print('Saved turn action')
    elif action == 'Wait':
        value = select_value()

        wait(100, MSEC)

        actions.append({ 'type': 'wait', 'value': value })

        print('Saved wait action')
    
    wait(50, MSEC)

    run()

drive = DTrain(config['drive']['type'])
actions = []
ui = UI()

def main():
    print('Welcome to the VEX EDR Autonomous Builder!\nPress L1 to decrease/move down, and R1 to increase/move up\nPress R2 to select value\nPress L2 to save')

    run()

main()