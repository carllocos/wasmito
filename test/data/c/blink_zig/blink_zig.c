extern void pin_mode(unsigned int pin, unsigned int mode);
extern void digital_write(unsigned int pin, unsigned int state);
extern void delay(unsigned int ms);

int main() {
    unsigned int LED = 10;
    unsigned int OUTPUT = 2;
    unsigned int ON = 1;
    unsigned int OFF = 0;
    unsigned int SLEEP = 2000;

    pin_mode(LED, OUTPUT);

    while (1) {
        digital_write(LED, ON);
        delay(SLEEP);
        digital_write(LED, OFF);
        delay(SLEEP);
    }
}
