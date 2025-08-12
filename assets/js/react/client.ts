import type { HugoIsland } from "@/island-runtime";
import { createElement, startTransition } from "react";
import { hydrateRoot, type Root } from "react-dom/client";

function isAlreadyHydrated(element: HTMLElement) {
  for (const key in element) {
    if (key.startsWith("__reactContainer")) {
      return key as keyof HTMLElement;
    }
  }
}

// Keep a map of roots so we can reuse them on re-renders
let rootMap = new WeakMap<HTMLElement, Root>();
const getOrCreateRoot = (element: HTMLElement, creator: () => Root) => {
  let root = rootMap.get(element);
  if (!root) {
    root = creator();
    rootMap.set(element, root);
  }
  return root;
};

export default function hydrator(element: HugoIsland) {
  return (Component: any, props: any) => {
    const componentEl = createElement(Component, props);

    const rootKey = isAlreadyHydrated(element);
    // HACK: delete internal react marker for nested components to suppress aggressive warnings
    if (rootKey) {
      delete element[rootKey];
    }

    const renderOptions = {
      identifierPrefix: element.getAttribute("prefix") ?? undefined,
    };

    startTransition(() => {
      const root = getOrCreateRoot(element, () => {
        const r = hydrateRoot(element, componentEl, renderOptions);
        element.addEventListener("hugo:unmount", () => r.unmount(), {
          once: true,
        });
        return r;
      });
      root.render(componentEl);
    });
  };
}
