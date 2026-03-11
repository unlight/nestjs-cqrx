// materializer.js - Minimal example for testing
// Simply logs events to console and file

import { createWriteStream } from 'fs';

const logStream = createWriteStream('events.log', { flags: 'a' });

process.stdin.on('data', data => {
  const lines = data.toString().split('\n');

  lines.forEach(line => {
    if (line.trim()) {
      try {
        const event = JSON.parse(line);
        const logEntry = {
          timestamp: new Date().toISOString(),
          ...event,
        };

        // Log to console
        console.log(JSON.stringify(logEntry, null, 2));

        // Write to file
        logStream.write(JSON.stringify(logEntry) + '\n');
      } catch (error) {
        console.error('Parse error:', error.message, 'Data:', line);
      }
    }
  });
});

process.stdin.on('end', () => {
  logStream.end();
  console.log('Stdin closed');
});

// Keep process alive
process.stdin.resume();
