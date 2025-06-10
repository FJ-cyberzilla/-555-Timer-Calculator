from rich.console import Console
from rich.progress import track
from rich.live import Live
from rich.text import Text
from time import sleep

console = Console()

def select_transistor(load_current_ma):
    if load_current_ma > 1500:
        return "IRFZ44N MOSFET (Power MOSFET for high current loads)"
    elif load_current_ma > 800:
        return "D13007 (High voltage, high current NPN transistor)"
    elif load_current_ma > 500:
        return "TIP41 (Power NPN transistor)"
    elif load_current_ma > 300:
        return "TIP42 (Power PNP transistor)"
    elif load_current_ma > 150:
        return "D13003 (Medium power NPN transistor)"
    elif load_current_ma > 100:
        return "BC331 (Small signal NPN transistor)"
    elif load_current_ma > 50:
        return "BC327 (Small signal PNP transistor)"
    elif load_current_ma > 20:
        return "BC548 (Low power NPN transistor)"
    elif load_current_ma > 10:
        return "S9018 (Low power NPN transistor)"
    else:
        return "BC548 (General purpose low current NPN transistor)"

def typing_effect(text, delay=0.07):
    for char in text:
        console.print(char, style="bold blue", end="", highlight=False)
        sleep(delay)
    console.print("")  # newline

def calculate_555(delay_s, voltage_v, load_current_ma):
    console.print("\n[bold cyan]=== 555 TIMER CONFIGURATION ===[/bold cyan]\n")

    R = 100_000  # 100kΩ fixed resistor
    C = delay_s / (1.1 * R)
    C_micro = C * 1e6

    for step in track(range(3), description="Calculating components..."):
        sleep(0.6)

    transistor = select_transistor(load_current_ma)

    console.print(f"\n[bold white]Delay:[/bold white] [green]{delay_s} s[/green]")
    console.print(f"[bold white]Voltage:[/bold white] [yellow]{voltage_v} V[/yellow]")
    console.print(f"[bold white]Load Current:[/bold white] [magenta]{load_current_ma} mA[/magenta]")
    console.print(f"[bold white]Recommended Transistor:[/bold white] [bold cyan]{transistor}[/bold cyan]")
    console.print(f"[bold white]Required Capacitor:[/bold white] [bold green]{C_micro:.1f} µF[/bold green] for 100kΩ resistor")

    console.print("\n[bold blue]=== FULL COMPONENT LIST ===[/bold blue]")
    console.print("• [cyan]IC 555 Timer[/cyan] (Monostable Mode)")
    console.print("• [cyan]Resistor[/cyan]: 100kΩ")
    console.print(f"• [cyan]Capacitor[/cyan]: {C_micro:.1f} µF")
    console.print(f"• [cyan]Transistor[/cyan]: {transistor}")
    console.print("• [cyan]Relay[/cyan]: 12V SPDT, ~30mA coil")
    console.print("• [cyan]Diode[/cyan]: 1N4007 (Flyback protection)")
    console.print("• [cyan]Indicator LED[/cyan]: 2V with 470Ω resistor")
    console.print("• [cyan]Push Button[/cyan]: Momentary NO")
    console.print("• [cyan]Power[/cyan]: 12V DC")

    console.print("\n[bold red]=== 555 PIN TO PIN WIRING ===[/bold red]")
    console.print("Pin 1 (GND): [green]Connect to battery negative[/green]")
    console.print("Pin 2 (Trigger): [green]Push button to ground[/green]")
    console.print("Pin 3 (Output): [green]To transistor base via 1kΩ resistor[/green]")
    console.print("Pin 4 (Reset): [green]Tie to VCC (12V)[/green]")
    console.print("Pin 5 (Control Voltage): [green]0.01µF capacitor to ground[/green]")
    console.print("Pin 6 (Threshold): [green]Connect to pin 7 and capacitor junction[/green]")
    console.print("Pin 7 (Discharge): [green]Connect to resistor to VCC[/green]")
    console.print("Pin 8 (VCC): [green]Connect to 12V DC[/green]")

    sleep(1)
    console.print()
    typing_effect("Powered by : F.J™ Ceybertronic systems & Friday")

# === Input Section ===
console.print("[bold yellow]Enter 555 Delay Timer Parameters[/bold yellow]\n")
delay = float(console.input("[white]⏱️ Delay (seconds): [/white]"))
voltage = float(console.input("[white]🔋 Voltage (V): [/white]"))
load = int(console.input("[white]⚡ Load Current (mA): [/white]"))

calculate_555(delay, voltage, load)
