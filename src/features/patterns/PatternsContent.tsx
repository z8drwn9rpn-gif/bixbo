import { usePatternsContentModel } from "./usePatternsContentModel";
import { PatternsContentView } from "./PatternsContentView";
export function PatternsContent() { const model = usePatternsContentModel(); return <PatternsContentView model={model} />; }
