import { createFileRoute } from "@tanstack/react-router";
import { HealthReportPageV3 } from "@/components/HealthReportPageV3";

export const Route = createFileRoute("/report")({ component: HealthReportPageV3 });
