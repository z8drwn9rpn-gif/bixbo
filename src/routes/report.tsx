import { createFileRoute } from "@tanstack/react-router";
import { HealthReportPageFinal } from "@/components/HealthReportPageFinal";

export const Route = createFileRoute("/report")({ component: HealthReportPageFinal });
