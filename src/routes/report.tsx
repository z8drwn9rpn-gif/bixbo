import { createFileRoute } from "@tanstack/react-router";
import { HealthReportPageAudited } from "@/components/HealthReportPageAudited";

export const Route = createFileRoute("/report")({ component: HealthReportPageAudited });
