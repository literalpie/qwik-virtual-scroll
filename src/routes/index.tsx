import { component$, $, type HTMLAttributes } from "@builder.io/qwik";
import { routeLoader$, server$ } from "@builder.io/qwik-city";
import type { VirtualItem } from "@tanstack/virtual-core";
import { Octokit } from "octokit";
import { VirtualScrollContainer } from "~/components/virtual-scroll/virtual-scroll";

export const thingy = { value: 0 };

/** gets 50 github issues, starting at the given rangeStart index */
export const getGithubIssues = $(
  async ({ rangeStart }: { rangeStart: number }) => {
    const octokit = new Octokit({});
    const count = (
      await octokit.rest.repos.get({ owner: "BuilderIO", repo: "qwik" })
    ).data.open_issues;
    const pag = await octokit.request("GET /repos/{owner}/{repo}/issues", {
      owner: "BuilderIO",
      repo: "qwik",
      per_page: 50,
      page: rangeStart / 50 + 1,
    });

    return {
      startIndex: rangeStart,
      array: pag.data.map((da) => da.title),
      totalCount: count,
    };
  }
);

export const useInitialDataLoader = routeLoader$(() => {
  return getGithubIssues({ rangeStart: 0 });
});

export default component$(() => {
  const initialData = useInitialDataLoader();

  return (
    <VirtualScrollContainer
      debug
      initialData={initialData}
      getNextPage={server$(getGithubIssues)}
      itemRenderer={$(
        (
          item: VirtualItem,
          loadedData: string,
          props: HTMLAttributes<HTMLElement>
        ) => {
          return (
            <div {...props}>
              #{item.index} - {loadedData ?? "Loading..."}
            </div>
          );
        }
      )}
    />
  );
});
