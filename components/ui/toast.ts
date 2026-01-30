import { toast as baseToast } from "@/components/ui/toast/use-toast";

type ToastPayload = {
  title: string;
  subtitle?: string;
  duration?: number; // ✅ novo
};

export const toast = {
  success({ title, subtitle, duration }: ToastPayload) {
    baseToast({ title, description: subtitle, variant: "success", duration });
  },
  error({ title, subtitle, duration }: ToastPayload) {
    baseToast({ title, description: subtitle, variant: "error", duration });
  },
  warning({ title, subtitle, duration }: ToastPayload) {
    baseToast({ title, description: subtitle, variant: "warning", duration });
  },
};
