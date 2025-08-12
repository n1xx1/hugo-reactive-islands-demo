import { createElement, type ReactNode } from "react";
import { renderToReadableStream } from "react-dom/server";

export async function renderToStaticMarkup(
  Component: any,
  props: Record<string, any>,
  context: { uid: string },
) {
  const vnode = createElement(Component, props);
  const html = await renderToString(vnode, context.uid);
  const attrs = { prefix: context.uid };
  return { html, attrs };
}

export async function renderToString(
  children: ReactNode,
  identifierPrefix?: string,
) {
  const stream = await renderToReadableStream(children, { identifierPrefix });
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
