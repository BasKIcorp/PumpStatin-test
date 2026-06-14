import type { BlockProps } from "@pumpstation/contracts";

export function RichTextBlock({ block }: BlockProps) {
  const props = block.props as {
    content?: string;
  };

  return (
    <div className="rich-text-block prose prose-neutral mx-auto max-w-3xl px-6 py-12 dark:prose-invert">
      <div dangerouslySetInnerHTML={{ __html: props.content ?? "" }} />
    </div>
  );
}
