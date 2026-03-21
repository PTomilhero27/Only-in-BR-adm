import { useMutation } from "@tanstack/react-query";
import { magicLinkService } from "./magic-link.service";
import type { ValidateMagicLinkInput } from "./magic-link.schema";

export function useValidateMagicLinkMutation(code: string) {
  return useMutation({
    mutationFn: (input: ValidateMagicLinkInput) =>
      magicLinkService.validate(code, input),
  });
}

export function useCreateMagicLinkMutation(fairId: string) {
  return useMutation({
    mutationFn: () => magicLinkService.create(fairId),
  });
}
