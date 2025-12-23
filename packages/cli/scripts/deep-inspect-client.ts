
import { initializeClient } from '../src/utils/client.js';

async function deepInspect() {
  const { client } = await initializeClient('devnet');
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const c = client as any;
  
  console.log('--- Client Agent Property ---');
  console.log('client.agent:', c.agent);
  
  if (c.agent) {
      console.log('client.agent keys:', Object.keys(c.agent));
      console.log('client.agent prototype keys:', Object.getOwnPropertyNames(Object.getPrototypeOf(c.agent)));
  } else {
      console.log('client.agent is Undefined/Null');
  }
}

deepInspect();
