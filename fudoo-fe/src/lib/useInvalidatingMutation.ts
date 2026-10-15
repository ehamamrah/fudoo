import { useMutation, useQueryClient, type QueryKey } from "@tanstack/react-query";

export function useInvalidatingMutation<TInput, TResult>(
  mutationFn: (input: TInput) => Promise<TResult>,
  keys: QueryKey[],
) {
  const client = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => Promise.all(keys.map((queryKey) => client.invalidateQueries({ queryKey }))),
  });
}
