export class MIDIMessageUtils {
  itnl2Key: { [key: string]: number } = {}; // string -> number のマッピング
  private key2Itnl: string[];
  private timerId: number;

  constructor() {
    this.itnl2Key = {};
    this.key2Itnl = [];
    this.timerId = 0;

    const key = {
      note: ['C', 'D', 'E', 'F', 'G', 'A', 'B'],
      order: ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'],
    };

    for (let i = 24, j = 0, number = 1; i <= 108; i++) {
      this.itnl2Key[`${key.order[j]}${number}`] = i;
      this.key2Itnl[i] = `${key.order[j]}${number}`;
      j++;
      if (j === key.order.length) {
        j = 0;
        number++;
      }
    }

    this.itnl2Key['A0'] = 21;
    this.key2Itnl[21] = 'A0';
    this.itnl2Key['A#0'] = 22;
    this.key2Itnl[22] = 'A#0';
    this.itnl2Key['B0'] = 23;
    this.key2Itnl[23] = 'B0';
  }

  convertKey2Itnl(keyno: number): string | undefined {
    return this.key2Itnl[keyno];
  }

  convertItnl2Key(itnl: string): number | undefined {
    return this.itnl2Key[itnl];
  }

  parseMIDIMessage(msg: number[]): Record<string, any> {
    const event: Record<string, any> = {};

    if (!Array.isArray(msg)) {
      event.type = 'notObject';
      event.subType = 'unknown';
      event.data = msg;
      return event;
    }

    const msg16 = msg.map((byte) => byte.toString(16));
    const eventTypeByte = msg16[0];
    event.raw = msg;

    if (eventTypeByte.startsWith('f')) {
      this.handleSystemMessages(event, eventTypeByte);
    } else {
      this.handleChannelMessages(event, msg, msg16);
    }

    return {
      type: event.type,
      subType: event.subType,
      data: event.raw,
      property: event,
    };
  }

  private handleSystemMessages(event: Record<string, any>, eventTypeByte: string) {
    const systemMessages: Record<string, string> = {
      'f0': 'SysEx',
      'f1': 'midiTimecode',
      'f2': 'songPosition',
      'f3': 'songSelect',
      'f4': 'undefined',
      'f5': 'undefined',
      'f6': 'tuningRequest',
      'f7': 'endOfSystemExclusive',
      'f8': 'MIDIClock',
      'f9': 'undefined',
      'fa': 'start',
      'fb': 'continue',
      'fc': 'stop',
      'fd': 'undefined',
      'fe': 'activeSensing',
      'ff': 'reset',
    };

    event.type = eventTypeByte === 'f8' ? 'systemRealtime' : 'systemCommon';
    event.subType = systemMessages[eventTypeByte] || 'unknown';
  }

  private handleChannelMessages(event: Record<string, any>, msg: number[], msg16: string[]) {
    event.type = 'channel';
    event.statusNum = msg16[0][0].toLowerCase();
    event.channel = parseInt(msg16[0][1], 16);

    const noteNumber = msg[1];
    const velocity = msg[2];

    switch (event.statusNum) {
      case '8':
        event.subType = 'noteOff';
        event.noteNumber = noteNumber;
        event.velocity = velocity;
        event.frequency = 440.0 * Math.pow(2.0, (noteNumber - 69.0) / 12.0);
        event.itnl = this.convertKey2Itnl(noteNumber);
        break;
      case '9':
        event.subType = 'noteOn';
        event.noteNumber = noteNumber;
        event.velocity = velocity;
        event.frequency = 440.0 * Math.pow(2.0, (noteNumber - 69.0) / 12.0);
        event.itnl = this.convertKey2Itnl(noteNumber);
        if (velocity === 0) event.subType = 'noteOff';
        break;
      default:
        event.subType = 'unknown';
        break;
    }
  }
}
