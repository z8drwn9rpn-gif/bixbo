import { createFileRoute } from "@tanstack/react-router";
import { HealthReportPageV2 } from "@/components/HealthReportPageV2";

export const Route = createFileRoute("/report")({ component: HealthReportPageV2 });
