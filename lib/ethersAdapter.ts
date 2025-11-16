import { ethers } from 'ethers';
import type { WalletClient } from 'viem';

/**
 * Convert wagmi WalletClient to ethers v5 Signer
 * This is required for Polymarket CLOB client integration
 */
export function walletClientToSigner(walletClient: WalletClient): ethers.providers.JsonRpcSigner {
  const { account, chain } = walletClient;

  if (!account) {
    throw new Error('No account connected');
  }

  if (!chain) {
    throw new Error('No chain connected');
  }

  // Create an ethers Web3Provider (ethers v5) from the window.ethereum
  const ethereum = (window as any).ethereum;

  if (!ethereum) {
    throw new Error('No ethereum provider found');
  }

  const network = {
    chainId: chain.id,
    name: chain.name,
  };

  const provider = new ethers.providers.Web3Provider(ethereum, network);

  // Get the signer from the provider
  return provider.getSigner(account.address);
}
