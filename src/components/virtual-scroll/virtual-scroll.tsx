import {
  component$,
  useSignal,
  type Signal,
  useTask$,
  type QRL,
  type JSXNode,
  type HTMLAttributes,
  $,
} from "@builder.io/qwik";
import { isBrowser } from "@builder.io/qwik/build";
import {
  Virtualizer,
  observeElementRect,
  observeElementOffset,
  elementScroll,
  type VirtualItem,
} from "@tanstack/virtual-core";
import { makeSerializable } from "./make-serializable";

const { getSerializable: getVirt, useSerializable: useVirtualScroll } =
  makeSerializable(
    $(
      (state: {
        scrollElement: Signal<HTMLElement | undefined>;
        scrollOffset: number;
        range?: { startIndex: number; endIndex: number };
        totalCount: number;
      }) => {
        const virt = new Virtualizer({
          initialRect: { height: 400, width: 700 },
          count: state.totalCount,
          estimateSize: () => 30,
          getScrollElement: () => state.scrollElement.value ?? null,
          scrollToFn: elementScroll,
          observeElementRect: observeElementRect,
          initialOffset: 0,
          observeElementOffset: observeElementOffset,
          onChange: (ev) => {
            ev._willUpdate();
            // On first render, if we don't have this check, it will update state twice in one cycle, causing an error.
            if (
              state.range?.startIndex !== ev.range.startIndex ||
              state.range?.endIndex !== ev.range.endIndex
            ) {
              state.range = ev.range;
            }
            state.scrollOffset = ev.scrollOffset;
          },
        });
        virt._didMount();
        virt._willUpdate();
        return virt;
      }
    )
  );

export const VirtualScrollContainer = component$(
  ({
    initialData,
    getNextPage,
    itemRenderer,
    debug = false,
  }: {
    initialData: Signal<{
      startIndex: number;
      array: string[];
      totalCount: number;
    }>;
    getNextPage: QRL<
      ({
        rangeStart,
      }: {
        rangeStart: number;
      }) => Promise<{ startIndex: number; array: string[]; totalCount: number }>
    >;
    itemRenderer: QRL<
      (
        item: VirtualItem,
        itemData: string,
        props: HTMLAttributes<HTMLElement>
      ) => JSXNode
    >;
    debug?: boolean;
  }) => {
    const loadedData = useSignal<string[]>([]);
    const scrollElement = useSignal<HTMLDivElement>();
    const loadingData = useSignal(false);
    const virtState = useVirtualScroll({
      scrollElement,
      scrollOffset: 0,
      range: { startIndex: 0, endIndex: 13 },
      totalCount: initialData.value.totalCount,
    });
    useTask$(({ track }) => {
      track(() => initialData.value);
      if (initialData.value.array.length > loadedData.value.length) {
        loadedData.value = initialData.value.array;
      }
    });
    useTask$(async ({ track }) => {
      track(() => virtState.state.range);
      const indexToFetch = (virtState.state.range?.endIndex ?? 0) + 3;
      if (
        isBrowser &&
        indexToFetch < initialData.value.totalCount &&
        indexToFetch > loadedData.value.length &&
        !loadingData.value
      ) {
        const startThing = Math.floor(indexToFetch / 50) * 50;
        loadingData.value = true;
        // Do this in a hanging promise rather than await so that we don't block the state from updating further
        getNextPage({ rangeStart: startThing }).then((issuesList) => {
          // NOTE: this is not smart about putting the new values in the right place of the array.
          // This will cause problems when scrolling aroung quickly.
          loadedData.value.splice(
            issuesList.startIndex ?? 0,
            0,
            ...(issuesList.array ?? [])
          );
          loadingData.value = false;
        });
      }
    });

    return (
      <div>
        {debug ? (
          <>
            <div>Total count: {initialData.value.totalCount}</div>
            <div>Loading?: {loadingData.value ? "yes" : "no"}</div>
            <div>
              visible range: {virtState.state.range?.startIndex}-
              {virtState.state.range?.endIndex}
            </div>
          </>
        ) : null}
        <div
          onScroll$={() => {
            if (!virtState.value) {
              getVirt(virtState);
            }
          }}
          style={{ height: "200px", overflow: "auto" }}
          ref={scrollElement}
        >
          <div
            style={{
              height: `${virtState.value?.getTotalSize() ?? 0}px`,
              width: "100%",
              position: "relative",
            }}
          >
            {virtState.value?.getVirtualItems().map((item) => {
              return itemRenderer(item, loadedData.value[item.index], {
                key: item.key,
                style: {
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: `${item.size}px`,
                  transform: `translateY(${item.start}px)`,
                },
              });
            })}
          </div>
        </div>
      </div>
    );
  }
);
