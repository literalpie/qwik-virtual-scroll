import {
  component$,
  useSignal,
  noSerialize,
  type NoSerialize,
  useStore,
  type Signal,
  useTask$,
  type QRL,
  type JSXNode,
  type HTMLAttributes,
} from "@builder.io/qwik";
import { isBrowser } from "@builder.io/qwik/build";
import {
  Virtualizer,
  observeElementRect,
  observeElementOffset,
  elementScroll,
  type VirtualItem,
} from "@tanstack/virtual-core";

export const useVirtualScroll = (virtState: {
  scrollElement: Signal<HTMLElement | undefined>;
  _virt?: NoSerialize<Virtualizer<HTMLElement, Element>>;
  state: {
    scrollOffset: number;
    range?: { startIndex: number; endIndex: number };
  };
  totalCount: number;
}) => {
  useTask$(({ track }) => {
    track(() => virtState.scrollElement);
    if (!virtState._virt && virtState.scrollElement.value) {
      getVirt(virtState);
    }
  });
  // referencing range seems to be required for it to be "seen"
  virtState.state.range;
};
export const getVirt = (virtState: {
  scrollElement: Signal<HTMLElement | undefined>;
  _virt?: NoSerialize<Virtualizer<HTMLElement, Element>>;
  state: {
    scrollOffset: number;
    range?: { startIndex: number; endIndex: number };
  };
  totalCount: number;
}) => {
  if (virtState._virt) {
    return virtState._virt;
  }

  const virt = new Virtualizer({
    initialRect: { height: 400, width: 700 },
    count: virtState.totalCount,
    estimateSize: () => 30,
    getScrollElement: () => virtState.scrollElement.value ?? null,
    scrollToFn: elementScroll,
    observeElementRect: observeElementRect,
    initialOffset: 0,
    observeElementOffset: observeElementOffset,
    onChange: (ev) => {
      ev._willUpdate();
      virtState.state = {
        scrollOffset: ev.scrollOffset,
        range: ev.range,
      };
    },
  });
  virt._didMount();
  virt._willUpdate();
  virtState._virt = noSerialize(virt);
  return virtState._virt;
};

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
    const virtState = useStore<{
      scrollElement: Signal<HTMLElement | undefined>;
      state: {
        scrollOffset: number;
        range?: { startIndex: number; endIndex: number };
      };
      totalCount: number;
      _virt?: NoSerialize<Virtualizer<HTMLElement, Element>>;
    }>({
      scrollElement,
      state: { scrollOffset: 0 },
      totalCount: initialData.value.totalCount,
    });
    useVirtualScroll(virtState);
    const virt = useSignal<NoSerialize<Virtualizer<HTMLElement, Element>>>();
    useTask$(({ track }) => {
      track(() => virtState.scrollElement);
      virt.value = getVirt(virtState);
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
              visible range: {virt.value?.range?.startIndex}-
              {virt.value?.range?.endIndex}
            </div>
          </>
        ) : null}
        <div
          onScroll$={() => {
            if (!virt.value) {
              virt.value = getVirt(virtState);
            }
          }}
          style={{ height: "200px", overflow: "auto" }}
          ref={scrollElement}
        >
          <div
            style={{
              height: `${virt?.value?.getTotalSize() ?? 0}px`,
              width: "100%",
              position: "relative",
            }}
          >
            {virt.value?.getVirtualItems().map((item) => {
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
