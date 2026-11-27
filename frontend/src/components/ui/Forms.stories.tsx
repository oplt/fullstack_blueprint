import type { Meta, StoryObj } from "@storybook/react-vite";
import { Input } from "./input";
import { Textarea } from "./textarea";
import { FileUploader } from "./FileUploader";
import { useState } from "react";

function UploadStory() {
    const [files, setFiles] = useState<File[]>([]);
    return <div className="w-full max-w-lg"><FileUploader files={files} onFilesChange={setFiles} accept=".txt,.md" multiple maxFiles={3} /></div>;
}

const meta = { title: "Blueprint/UI/Forms", component: Input, tags: ["autodocs"] } satisfies Meta<typeof Input>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Fields: Story = { render: () => <div className="grid w-full max-w-lg gap-ui-md"><label className="grid gap-ui-xxs"><span>Email</span><Input type="email" placeholder="name@example.com" aria-describedby="email-help" /><span id="email-help" className="text-body-sm text-muted-foreground">We never share your email.</span></label><label className="grid gap-ui-xxs"><span>Message</span><Textarea placeholder="Write a message" /></label><Input disabled value="Disabled field" readOnly /></div> };
export const Upload: Story = { render: () => <UploadStory /> };
