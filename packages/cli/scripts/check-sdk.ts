
import * as SDK from '@ghostspeak/sdk';


const modules = Object.keys(SDK).filter(key => key.endsWith('Module'));
console.log('SDK Modules:', modules);

