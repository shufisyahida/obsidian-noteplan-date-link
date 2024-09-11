import { Plugin } from "obsidian";
import {
	PluginValue,
	ViewPlugin,
	ViewUpdate,
	EditorView,
	Decoration,
	DecorationSet,
	WidgetType,
	PluginSpec,
} from "@codemirror/view";
import { syntaxTree } from "@codemirror/language";
import { RangeSetBuilder } from "@codemirror/state";

export default class MyPlugin extends Plugin {
	async onload() {
		this.registerEditorExtension([noteplanLinkPlugin]);
	}

	onunload(): void {}
}

class NoteplanLinkPlugin implements PluginValue {
	decorations: DecorationSet;

	constructor(view: EditorView) {
		this.decorations = this.buildDecorations(view);
	}

	update(update: ViewUpdate) {
		if (update.docChanged || update.viewportChanged) {
			this.decorations = this.buildDecorations(update.view);
		}
	}

	destroy() {}

	buildDecorations(view: EditorView): DecorationSet {
		const builder = new RangeSetBuilder<Decoration>();
		const allDecorations: { start: number; end: number; decoration: Decoration }[] = [];

		for (const { from, to } of view.visibleRanges) {
			syntaxTree(view.state).iterate({
				from,
				to,
				enter(node) {
					const text = view.state.doc.sliceString(node.from, node.to);
					const regex = /(\d{4}(?:-(?:W(?:0[1-9]|[1-4]\d|5[0-3])|(?:0[1-9]|1[0-2])(?:-(?:0[1-9]|[12]\d|3[01]))?|Q[1-4]))|\d{4})/g;
					const matches = Array.from(text.matchAll(regex));

					for (const match of matches) {
						if (match.index !== undefined) {
							const start = node.from + match.index;
							const end = start + match[0].length;
							allDecorations.push({
								start,
								end,
								decoration: Decoration.replace({
									widget: new NoteplanLinkWidget(match[0]),
								}),
							});
						}
					}
				},
			});
		}

		// Sort all decorations
		allDecorations.sort((a, b) => a.start - b.start);

		// Add sorted decorations to the builder
		for (const { start, end, decoration } of allDecorations) {
			builder.add(start, end, decoration);
		}
		return builder.finish();
	}
}

class NoteplanLinkWidget extends WidgetType {
	constructor(private date: string) {
		super();
	}

	toDOM(view: EditorView): HTMLElement {
		const link = document.createElement("a");
		link.href = `noteplan://x-callback-url/openNote?noteDate=${this.date}`;
		link.textContent = this.date;
		link.className = "cm-noteplan-link";
		return link;
	}
}

const pluginSpec: PluginSpec<NoteplanLinkPlugin> = {
	decorations: (value: NoteplanLinkPlugin) => value.decorations,
};
const noteplanLinkPlugin = ViewPlugin.fromClass(NoteplanLinkPlugin, pluginSpec);
