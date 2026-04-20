import { Box, Button } from "@mui/material";
import { BLEMIDIUtils } from "./bleMidiUtils";
import { MIDIMessageUtils } from "./midiMessageUtils";

export const WebBluetoothIndex = () => {


  async function connect() {
    const bleMIDIUtls = new BLEMIDIUtils()
    const midiMsgUtls = new MIDIMessageUtils();

    bleMIDIUtls.setMIDIParser(midiMsgUtls.parseMIDIMessage.bind(midiMsgUtls));
    let state = bleMIDIUtls.getDeviceConnected();
    bleMIDIUtls.setMidiEventHandleCallback( (event) => {
      const e = event as any
      console.log(e.detail.data)
      // dispParsedMIDI(event);
      // dispParsedMIDIExp(event);
      // window.clearTimeout(timerId);
      // if(dispState == "remove") {
      //   timerId = window.setTimeout(() => {
      //     clearToDefault();
      //     document.querySelector("#disp-input-port").innerText="";
      //   }, dispClearDuration);
      // }
    });

    // bleMIDIUtls.setConnectedBleCallback( event => {
    //   document.getElementById("ble-icon").innerHTML = "bluetooth_connected";
    //   document.getElementById("start-ble").classList.add('ble-connected');
    //   updateFavicon();
    // });
    // bleMIDIUtls.setDisconnectedBleCallback( event => {
    //   document.getElementById("ble-icon").innerHTML = "bluetooth";
    //   document.getElementById("start-ble").classList.remove('ble-connected');
    //   updateFavicon();
    // });
    // document.querySelector("#start-ble").addEventListener("mousedown", event => {
    //   let state = bleMIDIUtls.getDeviceConnected();
    //   if(state == false) {
    //     bleMIDIUtls.startBle.bind(bleMIDIUtls)(event);
    //   } else {
    //     bleMIDIUtls.endBle.bind(bleMIDIUtls)(event);
    //   }
    // }, false);

    bleMIDIUtls.startBle()
  }

  async function disconnect() {
  }

  return (
    <>
      <Box bgcolor={"#faa"} width={1} height={1}>
        <Button onClick={() => connect()}>
          Connect
        </Button>
        <Button onClick={() => disconnect()}>
          Disconnect
        </Button>
      </Box>
    </>
  )
}