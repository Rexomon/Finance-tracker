import { useToast } from "primevue/usetoast";

type ToastSeverity = "success" | "info" | "warn" | "error";

export function useGlobalToast() {
  const toast = useToast();

  const showToast = (
    severity: ToastSeverity,
    summary: string,
    detail: string,
  ) => {
    toast.add({ severity, summary, detail, life: 3000 });
  };

  const showSuccessToast = (detail: string) => {
    showToast("success", "Success", detail);
  };

  const showErrorToast = (detail: string) => {
    showToast("error", "Error", detail);
  };

  const showInfoToast = (detail: string) => {
    showToast("info", "Info", detail);
  };

  const showWarnToast = (detail: string) => {
    showToast("warn", "Warning", detail);
  };

  return {
    showSuccessToast,
    showErrorToast,
    showInfoToast,
    showWarnToast,
  };
}
