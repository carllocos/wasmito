extern void chip_pin_mode(unsigned int , unsigned int );
extern void chip_digital_write(unsigned int , unsigned int );
extern void chip_delay(unsigned int);

int main() {
    unsigned int LED = 10;
    unsigned int OUTPUT = 2;
    unsigned int ON = 1;
    unsigned int OFF = 0;
    unsigned int  LONG_SLEEP = 3000;
   unsigned int  SHORT_SLEEP = 500;
   unsigned int  MAX_SHORT_SLEEP = 5;

    chip_pin_mode(LED, OUTPUT);

    while (1) {
        for (int i = 0; i < MAX_SHORT_SLEEP; i++) {
            chip_digital_write(LED, ON);
            chip_delay(SHORT_SLEEP);
            chip_digital_write(LED, OFF);
            chip_delay(SHORT_SLEEP);
        }

        chip_digital_write(LED, ON);
        chip_delay(LONG_SLEEP);
    }
}
