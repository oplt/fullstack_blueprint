import {Button} from "@/components/ui/button";
import {FormField} from "@/components/ui/form-field";
import {datasetCaseDraftSchema, firstSchemaError, parseJsonObject} from "./studioUtils";
import {getQueryErrorMessage} from "../../lib/queryErrors";
import type {AiStudioModel} from "./useAiStudioView";

type Props = { model: AiStudioModel };

export function EvaluationDatasetBuilder({model}: Props) {
    const m = model;
    const {
        datasetForm,
        setDatasetForm,
        createDatasetMutation,
        selectedDatasetId,
        setSelectedDatasetId,
        datasets,
        datasetCaseForm,
        setDatasetCaseForm,
        createDatasetCaseMutation,
        runForm,
        setRunForm,
        selectedTemplateVersions,
        runEvaluationMutation,
        notify
    } = model;
    return (
        <div className="flex gap-ui-sm">

            <p>Evaluation datasets</p>
            <FormField
                label="Dataset name"
                value={datasetForm.name}
                onChange={(event: any) => setDatasetForm((current) => ({...current, name: event.target.value}))}/>
            <FormField
                label="Dataset description"
                value={datasetForm.description}
                onChange={(event: any) => setDatasetForm((current) => ({
                    ...current,
                    description: event.target.value
                }))}/>
            <Button
                variant="outline"
                disabled={createDatasetMutation.isPending || !datasetForm.name.trim()}
                onClick={() => createDatasetMutation.mutate(datasetForm)}
                type="button">
                {createDatasetMutation.isPending ? "Creating..." : "Create evaluation dataset"}
            </Button>
            <FormField
                as="select"
                label="Selected dataset"
                value={selectedDatasetId}
                onChange={(event: any) => setSelectedDatasetId(event.target.value)}>
                {datasets.map((dataset) => (
                    <option key={dataset.id}>
                        {dataset.name}
                    </option>
                ))}
            </FormField>
            <FormField
                label="Case input variables JSON"
                value={datasetCaseForm.input_variables_json}
                onChange={(event: any) => setDatasetCaseForm((current) => ({
                    ...current,
                    input_variables_json: event.target.value
                }))}
                as="textarea"
                rows={4}/>
            <FormField
                label="Retrieval query"
                value={datasetCaseForm.retrieval_query}
                onChange={(event: any) => setDatasetCaseForm((current) => ({
                    ...current,
                    retrieval_query: event.target.value
                }))}/>
            <FormField
                label="Expected chunk IDs"
                description="Comma-separated chunk IDs used to calculate citation hit rate."
                value={datasetCaseForm.expected_chunk_ids}
                onChange={(event: any) => setDatasetCaseForm((current) => ({
                    ...current,
                    expected_chunk_ids: event.target.value
                }))}/>
            <div className="flex flex-row gap-ui-xs flex-wrap">
                {m.documents.map((document) => {
                    const selected =
                        m.selectedEvaluationDocumentIds.includes(document.id);

                    return (
                        <Button
                            key={document.id}
                            type="button"
                            variant={selected ? "default" : "outline"}
                            size="sm"
                            aria-pressed={selected}
                            onClick={() => m.toggleEvaluationDocument(document.id)}
                        >
                            {document.title}
                        </Button>
                    );
                })}
            </div>
            <FormField
                label="Expected output text"
                value={datasetCaseForm.expected_output_text}
                onChange={(event: any) => setDatasetCaseForm((current) => ({
                    ...current,
                    expected_output_text: event.target.value
                }))}
                as="textarea"
                rows={2}/>
            <FormField
                label="Expected output JSON"
                value={datasetCaseForm.expected_output_json}
                onChange={(event: any) => setDatasetCaseForm((current) => ({
                    ...current,
                    expected_output_json: event.target.value
                }))}
                as="textarea"
                rows={2}/>
            <FormField
                label="Notes"
                value={datasetCaseForm.notes}
                onChange={(event: any) => setDatasetCaseForm((current) => ({...current, notes: event.target.value}))}/>
            <Button
                variant="outline"
                disabled={createDatasetCaseMutation.isPending || !selectedDatasetId}
                onClick={() => {
                    const result = datasetCaseDraftSchema.safeParse(datasetCaseForm);
                    if (!result.success) {
                        notify({message: firstSchemaError(result), severity: "error"});
                        return;
                    }
                    try {
                        createDatasetCaseMutation.mutate({
                            datasetId: selectedDatasetId,
                            payload: {
                                input_variables: parseJsonObject(result.data.input_variables_json),
                                retrieval_query: result.data.retrieval_query || null,
                                document_ids: m.selectedEvaluationDocumentIds,
                                expected_chunk_ids: result.data.expected_chunk_ids.split(",").map((id) => id.trim()).filter(Boolean),
                                expected_output_text: result.data.expected_output_text || null,
                                expected_output_json: result.data.expected_output_json.trim()
                                    ? parseJsonObject(result.data.expected_output_json)
                                    : null,
                                notes: result.data.notes || null,
                            },
                        });
                    } catch (error) {
                        notify({
                            message: getQueryErrorMessage(error, "Invalid dataset case JSON."),
                            severity: "error",
                        });
                    }
                }}
                type="button">
                {createDatasetCaseMutation.isPending ? "Saving..." : "Add dataset case"}
            </Button>
            <FormField
                as="select"
                label="Prompt version for evaluation"
                value={runForm.prompt_version_id}
                onChange={(event: any) => setRunForm((current) => ({
                    ...current,
                    prompt_version_id: event.target.value
                }))}>
                {selectedTemplateVersions.map((version) => (
                    <option key={version.id}>
                        v{version.version_number} • {version.model_name}
                    </option>
                ))}
            </FormField>
            <Button
                variant="default"
                disabled={runEvaluationMutation.isPending || !selectedDatasetId || !runForm.prompt_version_id}
                onClick={() => runEvaluationMutation.mutate({
                    datasetId: selectedDatasetId,
                    promptVersionId: runForm.prompt_version_id
                })}
                type="button">
                {runEvaluationMutation.isPending ? "Starting..." : "Run evaluation"}
            </Button>
        </div>
    );
}
