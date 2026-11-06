import { useState, useCallback } from 'react';
import { ClientProfile } from '../data/mockData';

export type OptimisticStatus = 'idle' | 'loading' | 'success' | 'error';

export interface UseOptimisticClientUpdateOptions {
  onSuccessToast?: (msg: string) => void;
  onErrorToast?: (msg: string) => void;
}

/**
 * Optimistic UI update hook for member profile modifications.
 * Immediately applies changes locally, dispatches background persistence,
 * and rolls back state with error notification if the operation fails.
 */
export function useOptimisticClientUpdate(
  clients: ClientProfile[],
  setClients: React.Dispatch<React.SetStateAction<ClientProfile[]>>,
  options?: UseOptimisticClientUpdateOptions
) {
  const [status, setStatus] = useState<OptimisticStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const updateClientOptimistically = useCallback(
    async (
      clientId: string,
      delta: Partial<ClientProfile>,
      remoteWriter: (updated: ClientProfile) => Promise<void>
    ) => {
      // 1. Snapshot previous state for rollback
      const previousClients = [...clients];
      const targetClient = clients.find((c) => c.id === clientId);

      if (!targetClient) {
        setStatus('error');
        setErrorMessage('Member tidak ditemukan dalam direktori.');
        options?.onErrorToast?.('Member tidak ditemukan.');
        return;
      }

      const optimisticUpdatedClient: ClientProfile = {
        ...targetClient,
        ...delta
      };

      // 2. Immediate optimistic local update
      setStatus('loading');
      setErrorMessage(null);
      setClients((prev) =>
        prev.map((c) => (c.id === clientId ? optimisticUpdatedClient : c))
      );

      try {
        // 3. Dispatch background write
        await remoteWriter(optimisticUpdatedClient);
        setStatus('success');
        options?.onSuccessToast?.('Data member berhasil diperbarui.');
      } catch (err: any) {
        // 4. Graceful rollback to previous snapshot on failure
        setClients(previousClients);
        setStatus('error');
        const msg = err?.message || 'Gagal menyimpan perubahan ke server. Data dikembalikan.';
        setErrorMessage(msg);
        options?.onErrorToast?.(msg);
      }
    },
    [clients, setClients, options]
  );

  return {
    status,
    errorMessage,
    updateClientOptimistically
  };
}
