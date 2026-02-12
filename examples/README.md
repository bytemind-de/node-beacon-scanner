# Test BLE Scanner

To test the scanner first make sure your Bluetooth service is running:
- `sudo systemctl status bluetooth`

If necessary, remove the software-lock:
- `sudo rfkill unblock bluetooth`
- to re-enable: `sudo rfkill block bluetooth`

Enable the adapter:
- `sudo hciconfig hci0 up`

In a new terminal open Bluetooth control:
- `sudo bluetoothctl` and then switch on the power: `power on`
- to leave: `power off` then `exit`

Run the test script:
- `node test-scanner.js` 