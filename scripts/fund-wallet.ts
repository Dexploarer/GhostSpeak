import { createSolanaRpc } from '@solana/rpc';
import { address } from '@solana/addresses';
import { createKeyPairSignerFromBytes } from '@solana/kit';
import fs from 'fs';
import path from 'path';
import nacl from 'tweetnacl';

const WALLET_FILE = 'devnet-wallet-keypair.json';
const AIRDROP_AMOUNT_SOL = 5;
const LAMPORTS_PER_SOL = 1_000_000_000;

async function main() {
    const walletPath = path.resolve(process.cwd(), WALLET_FILE);
    let secretKey: Uint8Array;

    if (fs.existsSync(walletPath)) {
        console.log(`Loading wallet from ${WALLET_FILE}...`);
        const content = fs.readFileSync(walletPath, 'utf-8');
        const arr = JSON.parse(content);
        secretKey = new Uint8Array(arr);
    } else {
        console.log(`Generating new wallet...`);
        const kp = nacl.sign.keyPair();
        secretKey = kp.secretKey;
        fs.writeFileSync(walletPath, JSON.stringify(Array.from(secretKey)));
        console.log(`Saved wallet to ${WALLET_FILE}`);
    }

    const signer = await createKeyPairSignerFromBytes(secretKey);
    const publicKeyStr = signer.address.toString();

    console.log(`Wallet Address: ${publicKeyStr}`);

    const rpc = createSolanaRpc('https://api.devnet.solana.com');

    // Check balance
    const balance = await rpc.getBalance(address(publicKeyStr)).send();
    console.log(`Current Balance: ${(Number(balance.value) / LAMPORTS_PER_SOL).toFixed(2)} SOL`);

    console.log(`Requesting airdrop of ${AIRDROP_AMOUNT_SOL} SOL...`);

    try {
        const amount = BigInt(AIRDROP_AMOUNT_SOL) * BigInt(LAMPORTS_PER_SOL) as any;
        const signature = await rpc.requestAirdrop(address(publicKeyStr), amount).send();
        console.log(`Airdrop requested! Signature: ${signature}`);
        console.log(`You can check transaction at: https://explorer.solana.com/tx/${signature}?cluster=devnet`);
    } catch (e) {
        console.error("Airdrop request for 5 SOL failed. Retrying with 1 SOL...");
        try {
            const amount = BigInt(1) * BigInt(LAMPORTS_PER_SOL) as any;
            const signature = await rpc.requestAirdrop(address(publicKeyStr), amount).send();
            console.log(`Airdrop (1 SOL) requested! Signature: ${signature}`);
        } catch (e2) {
            console.error("Airdrop failed:", e2);
            console.log("Note: The Devnet faucet often has rate limits or IP limits. Try again later or use the web faucet.");
        }
    }
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
