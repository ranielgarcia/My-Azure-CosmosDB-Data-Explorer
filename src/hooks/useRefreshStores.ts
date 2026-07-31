import { useMutation, useQueryClient } from "@tanstack/react-query";
import { refreshStores } from "@/services/tables";

export function useRefreshStores() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: refreshStores,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stores"] });
      queryClient.invalidateQueries({ queryKey: ["store"] });
    },
  });
}
