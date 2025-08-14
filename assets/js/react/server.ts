import type { RenderToStaticMarkupOptions } from "@/island-runtime";
import { createElement, type ReactNode } from "react";
import { renderToReadableStream } from "react-dom/server";
import StaticHtml from "./static-html";

interface Context {
  uid: string;
}

export async function renderToStaticMarkup(
  config: RenderToStaticMarkupOptions<Context>,
) {
  const newProps = { ...config.props };

  if (config.children) {
    newProps.children = createElement(StaticHtml, { value: config.children });
  }

  const vnode = createElement(config.Component, newProps);
  const html = await renderToString(vnode, config.context);
  const attrs = { prefix: config.context.uid };
  return { html, attrs };
}

export async function renderToString(children: ReactNode, context: Context) {
  const stream = await renderToReadableStream(children, {
    identifierPrefix: context.uid,
  });
  await stream.allReady;
  return readableStreamToString(stream);
}

async function readableStreamToString(readableStream: ReadableStream) {
  const reader = readableStream.getReader();
  const decoder = new TextDecoder();
  try {
    let result = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        return result;
      }
      result += decoder.decode(value, { stream: true });
    }
  } finally {
    reader.releaseLock();
  }
}
