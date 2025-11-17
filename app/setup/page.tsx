'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAccount, useWalletClient, usePublicClient } from 'wagmi';
import { usePrivy } from '@privy-io/react-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, Loader2, Shield, DollarSign, Key, ArrowRight } from 'lucide-react';
import { useProxyWallet } from '@/hooks/useProxyWallet';
import { useApiCredentials } from '@/hooks/useApiCredentials';
import { POLYGON_USDC_ADDRESS, POLYMARKET_CLOB_ADDRESS, USDC_DECIMALS } from '@/lib/constants';
import { approveTokenViaRelayer } from '@/lib/polymarket/relayerClient';
import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits } from 'viem';
import { useToast } from '@/hooks/use-toast';

// USDC ERC20 ABI
const USDC_ABI = [
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ type: 'bool' }],
  },
  {
    name: 'allowance',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ type: 'uint256' }],
  },
] as const;

type SetupStep = {
  id: number;
  title: string;
  description: string;
  icon: React.ReactNode;
  status: 'pending' | 'in-progress' | 'completed' | 'error';
  action?: () => Promise<void>;
};

export default function TradingWalletSetupPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { address, isConnected } = useAccount();
  const { authenticated, user } = usePrivy();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  
  const {
    proxyWalletAddress,
    hasProxyWallet,
    isLoadingProxy,
    createProxyWallet,
    isCreatingProxy,
    refetchProxy,
  } = useProxyWallet();
  
  const {
    credentials,
    generateCredentials,
    isGenerating,
  } = useApiCredentials();

  const isWalletConnected = isConnected || authenticated;
  const displayAddress = address || user?.wallet?.address;

  // Check USDC allowance
  const allowanceOwner = proxyWalletAddress || displayAddress;
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: POLYGON_USDC_ADDRESS,
    abi: USDC_ABI,
    functionName: 'allowance',
    args: allowanceOwner && [allowanceOwner, POLYMARKET_CLOB_ADDRESS],
    query: {
      enabled: !!allowanceOwner,
    },
  });

  const { writeContract: approveUsdc, data: approvalTxHash } = useWriteContract();
  const { isLoading: isApproving } = useWaitForTransactionReceipt({
    hash: approvalTxHash,
  });

  const [steps, setSteps] = useState<SetupStep[]>([]);

  // Initialize steps
  useEffect(() => {
    setSteps([
      {
        id: 1,
        title: 'Deploy Safe Wallet',
        description: 'Create a secure wallet for gasless trading on Polygon',
        icon: <Shield className="h-6 w-6" />,
        status: hasProxyWallet ? 'completed' : isCreatingProxy ? 'in-progress' : 'pending',
        action: async () => {
          if (!walletClient) {
            throw new Error('Wallet not connected');
          }
          await createProxyWallet('metamask');
          await refetchProxy();
        },
      },
      {
        id: 2,
        title: 'Approve USDC',
        description: 'Allow Polymarket to use your USDC for trading (gasless)',
        icon: <DollarSign className="h-6 w-6" />,
        status: allowance && BigInt(allowance.toString()) > BigInt(0) ? 'completed' : (isApproving ? 'in-progress' : 'pending'),
        action: async () => {
          if (!walletClient || !allowanceOwner) {
            throw new Error('Wallet not connected');
          }
          
          // Try relayer first (gasless), fallback to direct approval
          try {
            const maxAmount = parseUnits('1000000', USDC_DECIMALS); // 1M USDC max
            await approveTokenViaRelayer(walletClient, POLYGON_USDC_ADDRESS, POLYMARKET_CLOB_ADDRESS, maxAmount);
            toast({
              title: 'USDC Approved',
              description: 'USDC approval completed via gasless relayer',
            });
          } catch (relayerError) {
            console.warn('Relayer approval failed, using direct approval:', relayerError);
            // Fallback to direct approval
            const maxAmount = parseUnits('1000000', USDC_DECIMALS);
            approveUsdc({
              address: POLYGON_USDC_ADDRESS,
              abi: USDC_ABI,
              functionName: 'approve',
              args: [POLYMARKET_CLOB_ADDRESS, maxAmount],
            });
          }
          await refetchAllowance();
        },
      },
      {
        id: 3,
        title: 'Generate API Keys',
        description: 'One-time signature to derive and cache your Polymarket API credentials',
        icon: <Key className="h-6 w-6" />,
        status: credentials ? 'completed' : (isGenerating ? 'in-progress' : 'pending'),
        action: async () => {
          await generateCredentials();
        },
      },
    ]);
  }, [
    hasProxyWallet,
    isCreatingProxy,
    allowance,
    isApproving,
    credentials,
    isGenerating,
    walletClient,
    allowanceOwner,
    createProxyWallet,
    refetchProxy,
    refetchAllowance,
    generateCredentials,
    approveUsdc,
  ]);

  // Redirect if not connected
  useEffect(() => {
    if (!isWalletConnected) {
      router.push('/');
    }
  }, [isWalletConnected, router]);

  // Auto-complete steps when conditions are met
  useEffect(() => {
    if (hasProxyWallet && steps[0]?.status !== 'completed') {
      setSteps((prev) => {
        const updated = [...prev];
        updated[0] = { ...updated[0], status: 'completed' };
        return updated;
      });
    }
  }, [hasProxyWallet, steps]);

  useEffect(() => {
    if (allowance && BigInt(allowance.toString()) > BigInt(0) && steps[1]?.status !== 'completed') {
      setSteps((prev) => {
        const updated = [...prev];
        updated[1] = { ...updated[1], status: 'completed' };
        return updated;
      });
    }
  }, [allowance, steps]);

  useEffect(() => {
    if (credentials && steps[2]?.status !== 'completed') {
      setSteps((prev) => {
        const updated = [...prev];
        updated[2] = { ...updated[2], status: 'completed' };
        return updated;
      });
    }
  }, [credentials, steps]);

  // Check if all steps are completed
  const allStepsCompleted = steps.every((step) => step.status === 'completed');

  // Auto-redirect when all steps are completed
  useEffect(() => {
    if (allStepsCompleted) {
      const timer = setTimeout(() => {
        router.push('/');
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [allStepsCompleted, router]);

  const handleStepAction = async (step: SetupStep) => {
    if (!step.action || step.status === 'completed' || step.status === 'in-progress') {
      return;
    }

    setSteps((prev) => {
      const updated = [...prev];
      const stepIndex = updated.findIndex((s) => s.id === step.id);
      if (stepIndex !== -1) {
        updated[stepIndex] = { ...updated[stepIndex], status: 'in-progress' };
      }
      return updated;
    });

    try {
      await step.action();
      setSteps((prev) => {
        const updated = [...prev];
        const stepIndex = updated.findIndex((s) => s.id === step.id);
        if (stepIndex !== -1) {
          updated[stepIndex] = { ...updated[stepIndex], status: 'completed' };
        }
        return updated;
      });
    } catch (error) {
      console.error(`Step ${step.id} failed:`, error);
      setSteps((prev) => {
        const updated = [...prev];
        const stepIndex = updated.findIndex((s) => s.id === step.id);
        if (stepIndex !== -1) {
          updated[stepIndex] = { ...updated[stepIndex], status: 'error' };
        }
        return updated;
      });
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      });
    }
  };

  if (!isWalletConnected) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-white">Trading Wallet Setup</h1>
          <p className="text-zinc-400">3 quick steps to start trading gasless</p>
        </div>

        <div className="space-y-4">
          {steps.map((step, index) => (
            <Card
              key={step.id}
              className={`border-2 transition-all ${
                step.status === 'completed'
                  ? 'border-green-500/50 bg-green-500/5'
                  : step.status === 'in-progress'
                  ? 'border-blue-500/50 bg-blue-500/5'
                  : step.status === 'error'
                  ? 'border-red-500/50 bg-red-500/5'
                  : 'border-zinc-800 bg-zinc-900/50'
              }`}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div
                      className={`p-3 rounded-lg ${
                        step.status === 'completed'
                          ? 'bg-green-500/20 text-green-400'
                          : step.status === 'in-progress'
                          ? 'bg-blue-500/20 text-blue-400'
                          : step.status === 'error'
                          ? 'bg-red-500/20 text-red-400'
                          : 'bg-zinc-800 text-zinc-400'
                      }`}
                    >
                      {step.status === 'completed' ? (
                        <CheckCircle2 className="h-6 w-6" />
                      ) : step.status === 'in-progress' ? (
                        <Loader2 className="h-6 w-6 animate-spin" />
                      ) : (
                        step.icon
                      )}
                    </div>
                    <div>
                      <CardTitle className="text-white flex items-center gap-2">
                        <span className="text-zinc-400">{step.id}.</span>
                        {step.title}
                      </CardTitle>
                      <CardDescription className="text-zinc-400 mt-1">
                        {step.description}
                      </CardDescription>
                    </div>
                  </div>
                  {step.status === 'completed' ? (
                    <CheckCircle2 className="h-6 w-6 text-green-400" />
                  ) : step.status === 'pending' ? (
                    <Button
                      onClick={() => handleStepAction(step)}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white"
                    >
                      {step.id === 1 ? 'Deploy' : step.id === 2 ? 'Approve' : 'Generate'}
                    </Button>
                  ) : step.status === 'error' ? (
                    <Button
                      onClick={() => handleStepAction(step)}
                      variant="destructive"
                    >
                      Retry
                    </Button>
                  ) : null}
                </div>
              </CardHeader>
              {step.id === 1 && proxyWalletAddress && (
                <CardContent>
                  <div className="bg-zinc-800/50 rounded-lg p-3">
                    <p className="text-xs text-zinc-400 mb-1">Safe Wallet Address</p>
                    <p className="text-sm font-mono text-white">{proxyWalletAddress}</p>
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>

        {allStepsCompleted && (
          <Card className="border-green-500/50 bg-green-500/5">
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <CheckCircle2 className="h-12 w-12 text-green-400 mx-auto" />
                <div>
                  <h3 className="text-xl font-bold text-white mb-2">Setup Complete!</h3>
                  <p className="text-zinc-400">Redirecting to home page...</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

