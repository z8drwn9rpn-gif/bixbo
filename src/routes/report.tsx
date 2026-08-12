import { createFileRoute } from "@tanstack/react-router";
import { HealthReportPage } from "@/components/HealthReportPage";

export const Route = createFileRoute("/report")({ component: HealthReportPage });
