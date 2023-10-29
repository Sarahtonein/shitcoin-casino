import { ethers } from 'ethers';
import fetch from 'node-fetch';
import play from 'play-sound';
import { config } from 'dotenv';

config();  // Load the environment variables first

// Define stuff
const BSC_RPC_URL = 'https://bsc-dataseed.binance.org/';
const FACTORY_ADDRESS = '0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73'; 
const PRIVATE_KEY = process.env.PRIVATE_KEY;

if (!PRIVATE_KEY) {
    throw new Error("PRIVATE_KEY not found in environment variables.");
}

const FACTORY_ABI = [
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "token0",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "token1",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "pair",
        "type": "address"
      }
    ],
    "name": "PairCreated",
    "type": "event"
  }
];

const PAIR_ABI = [
    {
      "constant":true,
      "inputs":[],
      "name":"getReserves",
      "outputs":[
        {"internalType":"uint112","name":"_reserve0","type":"uint112"},
        {"internalType":"uint112","name":"_reserve1","type":"uint112"},
        {"internalType":"uint32","name":"_blockTimestampLast","type":"uint32"}
      ],
      "payable":false,
      "stateMutability":"view",
      "type":"function"
    }
  ];


//Functions


//Get BNB Price via API Call  
async function getBNBUSDPrice() {
    const response = await fetch("https://api.binance.com/api/v3/ticker/price?symbol=BNBUSDT");
    const data = await response.json();
    return parseFloat(data.price);
}

//When contract factory fires PairCreated event we log to the console
//And play some music to alert the human :) 
async function monitorLiquidity() {
    const provider = new ethers.providers.JsonRpcProvider(BSC_RPC_URL);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    const factoryContract = new ethers.Contract(FACTORY_ADDRESS, FACTORY_ABI, wallet);

    console.log("Monitoring for liquidity events on BSC...");

    factoryContract.on('PairCreated', async (token0, token1, pairAddress) => {
        console.log("New liquidity pool created!");
        console.log("Token 0:", token0);
        console.log("Token 1:", token1);
        console.log("Pair address:", pairAddress);

        play.sound('./papa-roach-last-resort-uncensored-and-lyrics-8gjda5zIx_g.mp3', (err) => {
          if (err) throw err;

        })

        const pairContract = new ethers.Contract(pairAddress, PAIR_ABI, wallet);
        const reserves = await pairContract.getReserves();

        let bnbReserve;
        if(token0.toLowerCase() === "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c") {  // BNB address on BSC
            bnbReserve = reserves._reserve0;
        } else if(token1.toLowerCase() === "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c") {
            bnbReserve = reserves._reserve1;
        }

        if (bnbReserve) {
            const bnbPriceInUSD = await getBNBUSDPrice();
            const usdValue = bnbPriceInUSD * ethers.utils.formatEther(bnbReserve);
            console.log("USD value of BNB liquidity added:", usdValue);
        } else {
            console.log("BNB is not part of this pair.");
        }
    });
}

monitorLiquidity();
config();