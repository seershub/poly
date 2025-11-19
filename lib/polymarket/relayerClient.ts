/**
 * Polymarket Builder Relayer Client Integration
 * 
 * Per Polymarket docs: https://docs.polymarket.com/developers/builders/relayer-client
 * 
 * The Relayer Client allows builders to:
 * - Execute gasless transactions (Polymarket pays gas fees)
 * - Deploy Safe Wallets for users automatically
 * - Set token approvals for trading
 * - Execute CTF operations (split, merge, redeem, convert)
 */

// @polymarket/builder-relayer-client may not be published yet
// Using dynamic import to handle missing package gracefully
import { RelayClient } from '@polymarket/builder-relayer-client';
import { BuilderConfig, BuilderApiKeyCreds } from '@polymarket/builder-signing-sdk';
import { ethers } from 'ethers';
import type { WalletClient } from 'viem';
import { POLYGON_CHAIN_ID, POLYMARKET_RELAYER_URL } from '@/lib/constants';
import { walletClientToSigner } from '@/lib/ethersAdapter';

// Relayer URL - Per Polymarket docs
const RELAYER_URL = POLYMARKET_RELAYER_URL;

/**
 * Type definitions per Polymarket docs
 * https://docs.polymarket.com/developers/builders/relayer-client#typescript-types
 */
export interface SafeTransaction {
  to: string;
  operation: number; // OperationType.Call (0) or OperationType.DelegateCall (1)
  data: string;
  value: string;
}

/**
 * OperationType enum per Polymarket docs
 */
export enum OperationType {
  Call = 0,
  DelegateCall = 1,
}

/**
 * Get builder configuration from environment variables
 * Per Polymarket docs: Builder credentials are required for relayer access
 * 
 * Priority:
 * 1. Remote signing server (NEXT_PUBLIC_BUILDER_SIGNING_SERVER_URL) - RECOMMENDED
 * 2. Direct credentials (POLY_BUILDER_*) - Server-side only, less secure
 */
function getBuilderConfig(): BuilderConfig | undefined {
  // Client-side accessible: Signing server URL (for remote signing)
  // Per Polymarket docs: Use Builder Signing Server for secure remote signing
  // Format: http://localhost:5001/sign (local) or https://your-server.com/sign (production)
  const signingServerUrl = process.env.NEXT_PUBLIC_BUILDER_SIGNING_SERVER_URL;

  // Priority 1: Remote signing (RECOMMENDED - more secure)
  if (signingServerUrl) {
    console.log('Using Builder Signing Server for remote signing:', signingServerUrl);
    return new BuilderConfig({
      remoteBuilderConfig: { url: signingServerUrl },
    });
  }

  // Priority 2: Direct credentials (server-side only, less secure)
  const builderApiKey = typeof window === 'undefined' ? process.env.POLY_BUILDER_API_KEY : undefined;
  const builderSecret = typeof window === 'undefined' ? process.env.POLY_BUILDER_SECRET : undefined;
  const builderPassphrase = typeof window === 'undefined' ? process.env.POLY_BUILDER_PASSPHRASE : undefined;

  if (builderApiKey && builderSecret && builderPassphrase) {
    console.warn('Using direct builder credentials (server-side only). Consider using Builder Signing Server for better security.');
    const builderCreds: BuilderApiKeyCreds = {
      key: builderApiKey,
      secret: builderSecret,
      passphrase: builderPassphrase,
    };
    return new BuilderConfig({
      localBuilderCreds: builderCreds,
    });
  }

  // No builder config - relayer features won't work
  console.warn('Builder credentials not configured. Relayer features (gasless transactions, Safe deployment) will not be available.');
  console.warn('To enable relayer features, either:');
  console.warn('  1. Set NEXT_PUBLIC_BUILDER_SIGNING_SERVER_URL (recommended)');
  console.warn('  2. Set POLY_BUILDER_API_KEY, POLY_BUILDER_SECRET, POLY_BUILDER_PASSPHRASE (server-side only)');
  return undefined;
}

/**
 * Initialize Polymarket Relayer Client
 * Per Polymarket docs: Relayer client enables gasless transactions and Safe Wallet deployment
 * 
 * @param walletClient - Wagmi wallet client (converted to ethers signer)
 * @returns RelayClient instance or null if builder config is not available
 */
export async function initializeRelayerClient(walletClient: WalletClient): Promise<any> {
  try {
    // Convert wagmi WalletClient to ethers Signer (required for RelayClient)
    const signer = walletClientToSigner(walletClient);

    // Get builder configuration
    const builderConfig = getBuilderConfig();

    if (!builderConfig) {
      console.warn('Builder config not available. Relayer features disabled.');
      return null;
    }

    // DEBUG: Log the module structure to understand the import issue
    // @ts-ignore
    console.log('Relayer Module Import Debug:', {
      RelayClient,
      typeofRelayClient: typeof RelayClient,
      isConstructor: typeof RelayClient === 'function' && !!RelayClient.prototype && !!RelayClient.prototype.constructor
    });

    // Handle potential import mismatch (ESM vs CommonJS)
  }

    // Per Polymarket docs: RelayClient(relayerUrl, chainId, wallet, builderConfig)
    // IMPORTANT: The builderConfig must be passed as the 4th argument
    // @ts-ignore
    const client = new ClientConstructor(
    RELAYER_URL,
    POLYGON_CHAIN_ID,
    signer,
    builderConfig
  );

  console.log('Relayer client initialized successfully with config:', {
    hasRemote: !!builderConfig.remoteBuilderConfig,
    remoteUrl: builderConfig.remoteBuilderConfig?.url,
    hasLocal: !!builderConfig.localBuilderCreds
  });

  return client;
} catch (error) {
  console.error('Error initializing relayer client:', error);
  return null;
}
}

/**
 * Deploy Safe Wallet for user via Polymarket Relayer
 * Per Polymarket docs: Polymarket pays for all gas fees
 * 
 * @param walletClient - Wagmi wallet client
 * @returns The deployed Safe Wallet address
 */
export async function deploySafeWalletViaRelayer(
  walletClient: WalletClient
): Promise<string> {
  const relayerClient = await initializeRelayerClient(walletClient);

  if (!relayerClient) {
    throw new Error('Relayer client not available. Builder credentials required.');
  }

  try {
    console.log('Deploying Safe Wallet via Polymarket Relayer...');

    // Per Polymarket docs: deploySafe() deploys a Safe wallet, Polymarket pays gas
    // https://docs.polymarket.com/developers/builders/relayer-client#deploying-safe-wallets
    const response = await relayerClient.deploySafe();
    const result = await response.wait();

    if (result && result.proxyAddress) {
      console.log('Safe Wallet deployed successfully:', {
        transactionHash: result.transactionHash,
        safeAddress: result.proxyAddress,
      });
      return result.proxyAddress;
    } else {
      throw new Error('Safe deployment failed');
    }
  } catch (error) {
    console.error('Error deploying Safe Wallet:', error);
    throw error;
  }
}

/**
 * Set token approval via Polymarket Relayer (gasless)
 * Per Polymarket docs: Execute token approvals without user paying gas
 * 
 * @param walletClient - Wagmi wallet client
 * @param tokenAddress - Token address (e.g., USDC)
 * @param spenderAddress - Address to approve (e.g., CLOB contract or CTF)
 * @param amount - Approval amount (use MaxUint256 for unlimited)
 */
export async function approveTokenViaRelayer(
  walletClient: WalletClient,
  tokenAddress: string,
  spenderAddress: string,
  amount: bigint = BigInt(ethers.constants.MaxUint256.toString())
): Promise<string> {
  const relayerClient = await initializeRelayerClient(walletClient);

  if (!relayerClient) {
    throw new Error('Relayer client not available. Builder credentials required.');
  }

  try {
    // Per Polymarket docs: Create approval transaction
    const erc20Interface = new ethers.utils.Interface([
      {
        constant: false,
        inputs: [
          { name: '_spender', type: 'address' },
          { name: '_value', type: 'uint256' },
        ],
        name: 'approve',
        outputs: [{ name: '', type: 'bool' }],
        payable: false,
        stateMutability: 'nonpayable',
        type: 'function',
      },
    ]);

    const approvalData = erc20Interface.encodeFunctionData('approve', [
      spenderAddress,
      amount.toString(),
    ]);

    // Per Polymarket docs: Execute Safe transaction via relayer
    // Using our own type definitions (per Polymarket docs interface)
    const approvalTx: SafeTransaction = {
      to: tokenAddress,
      operation: OperationType.Call, // OperationType.Call = 0
      data: approvalData,
      value: '0',
    };

    console.log('Executing token approval via relayer:', {
      token: tokenAddress,
      spender: spenderAddress,
      amount: amount.toString(),
    });

    const response = await relayerClient.executeSafeTransactions(
      [approvalTx],
      `Approve ${tokenAddress} for ${spenderAddress}`
    );

    const result = await response.wait();

    if (result && result.transactionHash) {
      console.log('Token approval completed:', result.transactionHash);
      return result.transactionHash;
    } else {
      throw new Error('Token approval failed');
    }
  } catch (error) {
    console.error('Error approving token via relayer:', error);
    throw error;
  }
}

