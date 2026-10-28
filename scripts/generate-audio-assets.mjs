import fs from 'node:fs';
import path from 'node:path';

const sampleRate = 16000;
const outputDirectory = path.resolve('assets/audio');

const makeWave = ({ duration, sample }) => {
  const sampleCount = Math.floor(sampleRate * duration);
  const dataSize = sampleCount * 2;
  const buffer = Buffer.alloc(44 + dataSize);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVEfmt ', 8);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);
  for (let index = 0; index < sampleCount; index += 1) {
    const time = index / sampleRate;
    const value = Math.max(-1, Math.min(1, sample(time, duration)));
    buffer.writeInt16LE(Math.round(value * 32767), 44 + index * 2);
  }
  return buffer;
};

const envelope = (time, duration) => Math.min(1, time * 22) * Math.min(1, (duration - time) * 10);

fs.mkdirSync(outputDirectory, { recursive: true });
fs.writeFileSync(path.join(outputDirectory, 'dice.wav'), makeWave({
  duration: 0.32,
  sample: (time, duration) => envelope(time, duration) * 0.25
    * (Math.sin(2 * Math.PI * (150 - time * 180) * time) + Math.sin(2 * Math.PI * 93 * time)),
}));
fs.writeFileSync(path.join(outputDirectory, 'challenge.wav'), makeWave({
  duration: 0.55,
  sample: (time, duration) => {
    const note = time < 0.18 ? 523.25 : time < 0.36 ? 659.25 : 783.99;
    return envelope(time, duration) * 0.32 * Math.sin(2 * Math.PI * note * time);
  },
}));
fs.writeFileSync(path.join(outputDirectory, 'ambient.wav'), makeWave({
  duration: 4,
  sample: (time, duration) => {
    const notes = [130.81, 164.81, 196, 261.63];
    const pulse = 0.55 + 0.45 * Math.sin(Math.PI * 2 * time / duration);
    return notes.reduce((sum, note) => sum + Math.sin(2 * Math.PI * note * time), 0)
      * 0.045 * pulse;
  },
}));
