import {Button} from "@/components/ui/button";
import {AdvancedSettings} from "../../components/ui/AdvancedSettings";
import {JsonBlock} from "../../components/JsonBlock";
import {KeyValueList} from "../../components/KeyValueList";
import {RunStatusBadge} from "../../components/RunStatus";
import {SectionCard} from "../../components/Section";
import {recordToKeyValueItems} from "../../components/jsonDisplay";
import type {useAgentWorkspace} from "./useAgentWorkspace";
import {Badge} from "@/components/ui/badge";

type Workspace = ReturnType<typeof useAgentWorkspace>;
type AgentRun = NonNullable<Workspace["selectedRunQuery"]["data"]>;

type Props = { run: AgentRun; setTab: (tab: "configure" | "run" | "trace" | "sources" | "output") => void };

export function AgentOutputDetails({run: selectedRun, setTab}: Props) {
    return (

        <SectionCard
            title="Output"
            description="Final generated artifact — separate from Trace."
        >
            <div className="flex gap-ui-sm">
                <div className="flex flex-row gap-ui-xs flex-wrap">
                    <RunStatusBadge status={selectedRun.status}/>
                    <Badge variant="outline">
                        {selectedRun.provider_key}/{selectedRun.model_name}
                    </Badge>
                    <Button variant="ghost" onClick={() => setTab("trace")} type="button">
                        View trace
                    </Button>
                    <Button variant="ghost" onClick={() => setTab("sources")} type="button">
                        View sources
                    </Button>
                </div>

                <p className="whitespace-pre-wrap wrap-break-word text-body-md">
                    {selectedRun.output_text?.trim()
                        ? selectedRun.output_text
                        : selectedRun.output_json
                            ? "Structured JSON output (see Raw below)."
                            : "—"}
                </p>

                {selectedRun.output_json ? (
                    <div className="flex gap-ui-xs">
                        {recordToKeyValueItems(selectedRun.output_json)
                            .length ? (
                            <KeyValueList
                                dense
                                items={recordToKeyValueItems(
                                    selectedRun.output_json
                                )}
                            />
                        ) : null}
                        <AdvancedSettings title="Raw JSON artifact">
                            <JsonBlock data={selectedRun.output_json}/>
                        </AdvancedSettings>
                    </div>
                ) : null}
            </div>
        </SectionCard>

    );
}
